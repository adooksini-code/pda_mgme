/* ==================================================
   맑은물에 PDA · 바코드 스캔
   1) 휴대폰 카메라 : BarcodeDetector(안드로이드 크롬) → html5-qrcode(iOS 등)
   2) PDA 하드웨어 스캐너 : '키보드 입력 + Enter' 모드
   3) 번호 직접 입력
   ※ 카메라는 HTTPS 주소에서만 동작합니다.
================================================== */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function UI() { return window.PdaUI; }

  /* 바코드 종류 → 이동 화면 */
  var RULES = [
    { test: function (u) { return u.indexOf('TS-') === 0; },  label: '거래명세표',  url: function (c) { return 'outbound_check.html?code=' + encodeURIComponent(c); } },
    { test: function (u) { return u.indexOf('PK-') === 0; },  label: '피킹리스트',  url: function (c) { return 'outbound_check.html?code=' + encodeURIComponent(c); } },
    { test: function (u) { return u.indexOf('PO') === 0 || u.indexOf('VH-') === 0; }, label: '입고 건', url: function (c) { return 'inbound_reg.html?id=' + encodeURIComponent(c); } },
    { test: function (u) { return u.indexOf('IN-') === 0; },  label: '입고 라벨',   url: function () { return 'stock.html?tab=원자재'; } },
    { test: function (u) { return u.indexOf('EMP-') === 0; }, label: '사원증',      url: function () { return 'home.html'; } },
    { test: function (u) { return /^\d{8,14}$/.test(u); },     label: '상품 바코드', url: function (c) { return 'stock.html?ean=' + encodeURIComponent(c); } }
  ];
  var KEEP = { emp: 1, lot: 1, item: 1 }; // 닫아도 현재 화면에 남는 스캔

  /* ---------- 피드백 ---------- */
  var ac;
  function beep(ok) {
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      var o = ac.createOscillator(), g = ac.createGain();
      o.frequency.value = ok ? 1800 : 380; g.gain.value = 0.08;
      o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + (ok ? 0.08 : 0.25));
    } catch (e) {}
    if (navigator.vibrate) navigator.vibrate(ok ? 50 : [80, 60, 80]);
  }

  /* ---------- 처리 : 화면 맥락 → 종류별 이동 ---------- */
  var ctx = 'route';
  function handle(raw, c) {
    var code = String(raw || '').trim(); if (!code) return;
    c = c || ctx;
    var page = window.PdaPage;
    if (page && page.onScan && page.onScan(code, c) === true) return;
    if (KEEP[c]) { beep(false); UI().toast('이 화면에서 쓸 수 없는 바코드입니다: ' + code, 'err'); return; }
    var u = code.toUpperCase();
    for (var i = 0; i < RULES.length; i++) {
      if (RULES[i].test(u)) {
        beep(true);
        var url = RULES[i].url(code), label = RULES[i].label;
        UI().loading('불러오는 중', label + ' ' + code, 450).then(function () { location.href = url; });
        return;
      }
    }
    beep(false); UI().toast('등록되지 않은 바코드입니다: ' + code, 'err');
  }

  /* ---------- 카메라 ---------- */
  var cam, video, stream = null, detector = null, timer = null, lib = null, last = '', lastAt = 0;
  var TITLE = { route: '바코드 스캔', emp: '사원증 스캔', lot: '업체 LOT 스캔', item: '품목 바코드 스캔' };
  function hint(t) {
    if (ctx === 'emp') t = t.replace(/(아래에 )?번호를 직접 입력하세요\./, '아이디와 비밀번호로 로그인하세요.');
    $('#camHint').textContent = t;
  }
  function open(c) {
    ctx = c || 'route';
    $('#camTitle').textContent = TITLE[ctx] || TITLE.route;
    $('.cam__bottom').hidden = ctx === 'emp';
    $('#manIn').value = '';
    cam.hidden = false; start();
  }
  function close() { stop(); cam.hidden = true; }
  function cancel() {
    var keep = KEEP[ctx], here = location.pathname.split('/').pop();
    close();
    if (!keep && here !== 'home.html') location.href = 'home.html';
  }
  function got(code) {
    var now = Date.now(); if (code === last && now - lastAt < 1500) return;
    last = code; lastAt = now;
    var c = ctx; close(); handle(code, c); ctx = 'route';
  }
  async function start() {
    if (!window.isSecureContext) { hint('카메라는 HTTPS 주소에서만 켜집니다. 아래에 번호를 직접 입력하세요.'); return; }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { hint('이 브라우저는 카메라를 지원하지 않습니다. 번호를 직접 입력하세요.'); return; }
    hint('카메라를 켜는 중');
    if ('BarcodeDetector' in window) {
      try {
        var want = ['code_128', 'ean_13', 'ean_8', 'code_39', 'itf', 'upc_a', 'qr_code'];
        var sup = await window.BarcodeDetector.getSupportedFormats();
        var fm = want.filter(function (f) { return sup.indexOf(f) >= 0; });
        if (fm.length) {
          detector = new window.BarcodeDetector({ formats: fm });
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
          video.hidden = false; video.srcObject = stream; await video.play();
          hint('바코드를 초록 상자 안에 맞춰주세요'); loop(); return;
        }
      } catch (e) { stop(); }
    }
    if (window.Html5Qrcode) {
      try {
        video.hidden = true;
        var F = window.Html5QrcodeSupportedFormats;
        lib = new window.Html5Qrcode('camLib', { verbose: false, formatsToSupport: F ? [F.CODE_128, F.EAN_13, F.EAN_8, F.CODE_39, F.ITF, F.UPC_A, F.QR_CODE] : undefined });
        await lib.start({ facingMode: 'environment' }, { fps: 12, qrbox: { width: 280, height: 110 }, aspectRatio: 1.0 }, function (t) { got(t); }, function () {});
        hint('바코드를 초록 상자 안에 맞춰주세요'); return;
      } catch (e) { hint('카메라를 열 수 없습니다. 권한을 허용하거나 번호를 직접 입력하세요.'); return; }
    }
    hint('스캔 기능을 불러오지 못했습니다. 번호를 직접 입력하세요.');
  }
  // 화면에 바코드가 여러 개 잡히면 초록 상자(가운데)에 가장 가까운 것만 읽고,
  // 같은 값이 연속 2번 읽혀야 확정합니다. (옆 바코드를 잘못 읽는 것 방지)
  var pending = '';
  function pickCenter(list) {
    var vw = video.videoWidth || 1, vh = video.videoHeight || 1, best = null, bestD = Infinity;
    list.forEach(function (c) {
      var b = c.boundingBox; if (!b) return;
      var dx = (b.x + b.width / 2) - vw / 2, dy = (b.y + b.height / 2) - vh / 2;
      if (Math.abs(dx) > vw * 0.38 || Math.abs(dy) > vh * 0.22) return; // 가운데 영역 밖은 무시
      var d = dx * dx + dy * dy; if (d < bestD) { bestD = d; best = c; }
    });
    return best;
  }
  function loop() {
    if (!detector || !stream) return;
    detector.detect(video).then(function (r) {
      var c = r && r.length ? pickCenter(r) : null;
      if (c) {
        if (c.rawValue === pending) { pending = ''; got(c.rawValue); return; }
        pending = c.rawValue; timer = setTimeout(loop, 60); return;
      }
      pending = ''; timer = setTimeout(loop, 120);
    }).catch(function () { timer = setTimeout(loop, 250); });
  }
  function stop() {
    clearTimeout(timer); timer = null; detector = null;
    if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
    if (video) video.srcObject = null;
    if (lib) { var l = lib; lib = null; l.stop().then(function () { l.clear(); }).catch(function () {}); }
  }

  /* ---------- PDA 하드웨어 스캐너 (키보드 입력 + Enter) ---------- */
  var buf = '', bufAt = 0;
  document.addEventListener('keydown', function (e) {
    var tg = e.target; if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA')) return;
    var now = Date.now(); if (now - bufAt > 80) buf = ''; bufAt = now;
    if (e.key === 'Enter') { if (buf.length >= 4) { var c = buf; buf = ''; if (cam && !cam.hidden) got(c); else handle(c, 'route'); e.preventDefault(); } return; }
    if (e.key.length === 1) buf += e.key;
  });

  /* ---------- 연결 ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    cam = $('#cam'); video = $('#camVideo'); if (!cam) return;
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-scan]'); if (!b) return;
      e.preventDefault(); open(b.getAttribute('data-scan'));
    });
    $('#camClose').onclick = cancel;
    var manual = function () { var v = $('#manIn').value; if (v.trim()) got(v); };
    $('#manGo').onclick = manual;
    $('#manIn').addEventListener('keydown', function (e) { if (e.key === 'Enter') manual(); });
    $$('[data-demo]', cam).forEach(function (b) { b.onclick = function () { got(b.getAttribute('data-demo')); }; });
  });

  window.PdaScan = { open: open, close: close, cancel: cancel, handle: handle, beep: beep };
})();
