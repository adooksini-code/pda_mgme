/* ==================================================
   맑은물에 PDA · 바코드 스캔
   1) 휴대폰 카메라 : BarcodeDetector(안드로이드 크롬) → html5-qrcode(iOS 등) 순
   2) PDA 하드웨어 스캐너 : '키보드 입력 + Enter' 모드
   3) 번호 직접 입력
   ※ 카메라는 HTTPS 주소에서만 동작합니다.
================================================== */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function ui() { return window.PdaUI || { toast: function () {}, bind: function () {} }; }

  // ---------- 바코드 종류 → 이동 화면 ----------
  //  TS-  거래명세표   → 출고 확인
  //  PK-  피킹리스트   → 출고 확인 (출고할 피킹 항목)
  //  PO   발주서       → 원자재입고 등록
  //  IN-  입고 라벨    → 재고 조회
  //  EMP- 사원증       → 홈
  //  숫자 8~14자리 상품 바코드 → 재고 조회
  var RULES = [
    { test: function (u) { return u.indexOf('TS-') === 0; },  page: 'outbound_check.html', type: 'ts',  label: '거래명세표' },
    { test: function (u) { return u.indexOf('PK-') === 0; },  page: 'outbound_check.html', type: 'pk',  label: '피킹리스트 · 출고할 피킹 항목' },
    { test: function (u) { return u.indexOf('PO') === 0; },   page: 'inbound_reg.html',    type: 'po',  label: '발주서' },
    { test: function (u) { return u.indexOf('IN-') === 0; },  page: 'stock.html',          type: 'in',  label: '입고 라벨' },
    { test: function (u) { return u.indexOf('EMP-') === 0; }, page: 'home.html',           type: 'emp', label: '사원 로그인' },
    { test: function (u) { return /^\d{8,14}$/.test(u); },     page: 'stock.html',          type: 'ean', label: '상품 바코드' }
  ];

  // ---------- 피드백 ----------
  var ac;
  function beep(ok) {
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      var o = ac.createOscillator(), g = ac.createGain();
      o.frequency.value = ok ? 1800 : 400; g.gain.value = 0.08;
      o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + (ok ? 0.09 : 0.25));
    } catch (e) {}
    if (navigator.vibrate) navigator.vibrate(ok ? 60 : [80, 60, 80]);
  }
  function goPage(page, code, type, text) {
    try { sessionStorage.setItem('pda_toast', JSON.stringify({ text: text, kind: 'ok' })); } catch (e) {}
    location.href = page + '?code=' + encodeURIComponent(code) + '&type=' + type;
  }

  // ---------- 처리 : 화면 맥락 우선 → 종류별 이동 ----------
  var ctx = 'route';
  function handle(raw) {
    var code = String(raw || '').trim(); if (!code) return;
    var u = code.toUpperCase();
    if (ctx === 'lot') { ui().bind('lot', code); beep(true); ui().toast('업체 LOT 입력: ' + code, 'ok'); return; }
    if (window.PdaOutbound && window.PdaOutbound.check(code)) { beep(true); return; }
    if (ctx === 'item') { beep(false); ui().toast('이 명세표에 없는 품목입니다: ' + code, 'err'); return; }
    for (var i = 0; i < RULES.length; i++) {
      if (RULES[i].test(u)) { beep(true); goPage(RULES[i].page, code, RULES[i].type, RULES[i].label + ' ' + code); return; }
    }
    beep(false); ui().toast('알 수 없는 바코드: ' + code, 'err');
  }

  // ---------- 카메라 ----------
  var stream = null, detector = null, timer = null, lib = null, last = '', lastAt = 0;
  var video, cam;
  function hint(t) { $('#camHint').textContent = t; }
  function open(c) {
    ctx = c || 'route';
    $('#camTitle').textContent = ctx === 'lot' ? '업체 LOT 스캔' : ctx === 'item' ? '품목 바코드 스캔' : '바코드 스캔';
    cam.hidden = false; $('#manIn').value = ''; start();
  }
  function close() { stop(); cam.hidden = true; }
  function got(code) {
    var now = Date.now(); if (code === last && now - lastAt < 1500) return;
    last = code; lastAt = now;
    var c = ctx; close(); ctx = c; handle(code); ctx = 'route';
  }
  async function start() {
    if (!window.isSecureContext) { hint('카메라는 HTTPS 주소에서만 켜집니다. 아래에 번호를 직접 입력하세요.'); return; }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { hint('이 브라우저는 카메라를 지원하지 않습니다.'); return; }
    hint('카메라 준비 중…');
    if ('BarcodeDetector' in window) {
      try {
        var want = ['code_128', 'ean_13', 'ean_8', 'code_39', 'itf', 'upc_a', 'qr_code'];
        var sup = await window.BarcodeDetector.getSupportedFormats();
        var fm = want.filter(function (f) { return sup.indexOf(f) >= 0; });
        if (fm.length) {
          detector = new window.BarcodeDetector({ formats: fm });
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
          video.hidden = false; video.srcObject = stream; await video.play();
          hint('바코드를 가이드 안에 맞춰주세요'); loop(); return;
        }
      } catch (e) { stop(); }
    }
    if (window.Html5Qrcode) {
      try {
        video.hidden = true;
        var F = window.Html5QrcodeSupportedFormats;
        lib = new window.Html5Qrcode('camLib', { verbose: false, formatsToSupport: F ? [F.CODE_128, F.EAN_13, F.EAN_8, F.CODE_39, F.ITF, F.UPC_A, F.QR_CODE] : undefined });
        await lib.start({ facingMode: 'environment' }, { fps: 12, qrbox: { width: 280, height: 110 }, aspectRatio: 1.0 }, function (t) { got(t); }, function () {});
        hint('바코드를 가이드 안에 맞춰주세요'); return;
      } catch (e) { hint('카메라를 열 수 없습니다. 권한을 확인하거나 번호를 직접 입력하세요.'); return; }
    }
    hint('스캔 라이브러리를 불러오지 못했습니다. 번호를 직접 입력하세요.');
  }
  function loop() {
    if (!detector || !stream) return;
    detector.detect(video).then(function (r) {
      if (r && r.length) got(r[0].rawValue); else timer = setTimeout(loop, 120);
    }).catch(function () { timer = setTimeout(loop, 250); });
  }
  function stop() {
    clearTimeout(timer); timer = null; detector = null;
    if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
    if (video) video.srcObject = null;
    if (lib) { var l = lib; lib = null; l.stop().then(function () { l.clear(); }).catch(function () {}); }
  }

  // ---------- PDA 하드웨어 스캐너 (키보드 입력 + Enter) ----------
  var buf = '', bufAt = 0;
  document.addEventListener('keydown', function (e) {
    var tg = e.target; if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA')) return;
    var now = Date.now(); if (now - bufAt > 80) buf = ''; bufAt = now;
    if (e.key === 'Enter') { if (buf.length >= 4) { var c = buf; buf = ''; ctx = 'route'; handle(c); e.preventDefault(); } return; }
    if (e.key.length === 1) buf += e.key;
  });

  // ---------- 연결 ----------
  document.addEventListener('DOMContentLoaded', function () {
    cam = $('#cam'); video = $('#camVideo'); if (!cam) return;
    $$('[data-scan]').forEach(function (b) {
      b.addEventListener('click', function (e) { e.preventDefault(); open(b.getAttribute('data-scan')); });
    });
    $('#camClose').onclick = close;
    var manual = function () { var v = $('#manIn').value; if (v.trim()) got(v); };
    $('#manGo').onclick = manual;
    $('#manIn').addEventListener('keydown', function (e) { if (e.key === 'Enter') manual(); });
    $$('.qk').forEach(function (b) { b.onclick = function () { got(b.getAttribute('data-code')); }; });
  });

  window.PdaScan = { open: open, close: close, handle: handle, beep: beep };
})();
