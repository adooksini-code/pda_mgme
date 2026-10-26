/* ==================================================
   맑은물에 PDA · 화면 공통 동작
   - 프로토타입 보조(설명서 · 화면 목록)
   - 알림(toast) · 화면 간 전달값 표시
   - 화면별 동작: 품질검사 판정, 출고 확인 체크
================================================== */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // 화면 목록 (한 곳에서 관리)
  var PAGES = [
    {file:'login.html', title:'로그인', group:'공통'},
    {file:'home.html', title:'통합 스캔 홈', group:'공통'},
    {file:'inbound_list.html', title:'입고 대기', group:'입고'},
    {file:'inbound_reg.html', title:'원자재입고 등록', group:'입고'},
    {file:'inbound_quality.html', title:'원자재 품질검사', group:'입고'},
    {file:'inbound_done.html', title:'원자재입고 확정 · 라벨 출력', group:'입고'},
    {file:'outbound_picking.html', title:'출고 · 피킹리스트', group:'출고'},
    {file:'outbound_check.html', title:'출고 확인 · 상차', group:'출고'},
    {file:'print.html', title:'출력', group:'출력'},
    {file:'stock.html', title:'재고 조회', group:'재고'}
  ];

  // ---------- 알림 ----------
  var tt;
  function toast(msg, kind) {
    var t = $('#toast'); if (!t) return;
    t.textContent = msg; t.className = 'toast' + (kind ? ' ' + kind : ''); t.hidden = false;
    clearTimeout(tt); tt = setTimeout(function () { t.hidden = true; }, 2200);
  }
  function bind(key, val) { $$('[data-bind="' + key + '"]').forEach(function (e) { e.textContent = val; }); }
  window.PdaUI = { toast: toast, bind: bind };

  // ---------- 이전 화면에서 넘어온 값 (?code=...&type=...) ----------
  var q = new URLSearchParams(location.search);
  if (q.get('code')) {
    var type = q.get('type');
    if (type === 'ts') { bind('ts', q.get('code')); bind('doctype', '거래명세표'); }
    else if (type === 'pk') { bind('ts', q.get('code')); bind('doctype', '피킹리스트'); }
    else if (type === 'po') bind('po', q.get('code'));
    else bind('code', q.get('code'));
  }
  try {
    var msg = sessionStorage.getItem('pda_toast');
    if (msg) { sessionStorage.removeItem('pda_toast'); var m = JSON.parse(msg); toast(m.text, m.kind); }
  } catch (e) {}

  // ---------- 프로토타입 보조 ----------
  var here = location.pathname.split('/').pop() || 'index.html';
  var nav = $('#navlist');
  if (nav) {
    nav.innerHTML = '<div class="t18" style="padding:4px 12px 8px">화면 목록</div>' + PAGES.map(function (p) {
      return '<a class="nl' + (p.file === here ? ' cur' : '') + '" href="' + p.file + '">' + p.title + '<em>' + p.group + '</em></a>';
    }).join('');
  }
  if ($('#bMan')) $('#bMan').onclick = function () { $('#mMan').hidden = false; };
  if ($('#bNav')) $('#bNav').onclick = function () { $('#mNav').hidden = false; };
  $$('[data-close]').forEach(function (b) { b.onclick = function () { b.closest('.modal').hidden = true; }; });
  $$('.modal').forEach(function (m) { m.addEventListener('click', function (e) { if (e.target === m) m.hidden = true; }); });

  // ---------- 원자재 품질검사 : 적합/부적합 ----------
  $$('#qlist .pill').forEach(function (b) {
    b.onclick = function () {
      var i = b.getAttribute('data-q');
      $$('#qlist .pill[data-q="' + i + '"]').forEach(function (x) { x.classList.remove('ok', 'ng'); });
      b.classList.add(b.getAttribute('data-v'));
      var n = $$('#qlist .pill.ng').length, s = $('#qsum');
      s.textContent = n ? '부적합 ' + n + '건' : '전 항목 적합';
      s.className = n ? 'bdg r' : 'bdg';
      $('#qreason').hidden = n === 0;
    };
  });

  // ---------- 출고 확인 : 품목 체크 → 완료(상차) ----------
  var done = $('#oDone');
  if (done) {
    var rows = $$('#olist .li');
    var upd = function () {
      var n = $$('#olist .cb.on').length, t = rows.length;
      $('#oN').textContent = n;
      if (n === t) { done.disabled = false; done.className = 'btn'; done.textContent = '출고 완료 · 차량 상차'; }
      else { done.disabled = true; done.className = 'btn dis'; done.textContent = '품목 확인 후 완료 (' + n + '/' + t + ')'; }
    };
    rows.forEach(function (r) { r.onclick = function () { r.querySelector('.cb').classList.toggle('on'); upd(); }; });
    $('#oAll').onclick = function () { $$('#olist .cb').forEach(function (c) { c.classList.add('on'); }); upd(); };
    done.onclick = function () {
      if (done.disabled) return;
      $('#oMain').style.display = 'none'; $('#oOk').style.display = 'flex';
      if (window.PdaScan) window.PdaScan.beep(true);
    };
    // 품목 바코드 스캔 시 해당 품목 체크 (pda_scan.js에서 호출)
    window.PdaOutbound = {
      check: function (code) {
        var r = $('#olist .li[data-ean="' + code + '"]'); if (!r) return false;
        r.querySelector('.cb').classList.add('on'); r.classList.add('flash');
        setTimeout(function () { r.classList.remove('flash'); }, 600);
        toast('확인: ' + r.querySelector('.t16b').textContent, 'ok'); upd(); return true;
      }
    };
    upd();
  }
})();
