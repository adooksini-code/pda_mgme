/* ==================================================
   맑은물에 PDA · 공통 UI
   알림 · 처리 중 · 바텀 시트 · 탭 · 수량 조절 · 화면 이동
================================================== */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(n) { return Number(n || 0).toLocaleString('ko-KR'); }
  function device() { return $('.device') || document.body; }
  function icon(name, cls) { return '<svg class="ic' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#i-' + name + '"/></svg>'; }

  /* ---------- 알림 ---------- */
  var toastTimer;
  function toast(msg, kind) {
    var t = $('#toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); device().appendChild(t); }
    t.className = 'toast' + (kind ? ' toast--' + kind : '');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, 2400);
  }

  /* ---------- 처리 중 ---------- */
  function loading(text, sub, ms) {
    var el = document.createElement('div');
    el.className = 'loading'; el.setAttribute('role', 'status');
    el.innerHTML = '<span class="loading__spin"></span><span>' + esc(text || '처리 중') + '</span>' + (sub ? '<span class="loading__sub">' + esc(sub) + '</span>' : '');
    device().appendChild(el);
    return new Promise(function (res) { setTimeout(function () { res(function () { el.remove(); }); }, ms || 600); });
  }
  function busy(text, sub, ms) { return loading(text, sub, ms).then(function (done) { done(); }); }

  /* ---------- 화면 이동 (다음 화면에 알림 전달) ---------- */
  function go(url, msg, kind) {
    if (msg) { try { sessionStorage.setItem('pda_toast', JSON.stringify({ text: msg, kind: kind || 'ok' })); } catch (e) {} }
    location.href = url;
  }

  /* ---------- 바텀 시트 ----------
     PdaUI.sheet({ title, items:[{label, sub, end, icon, value, current}], foot:'닫기' }).then(value) */
  function sheet(opt) {
    return new Promise(function (resolve) {
      var el = document.createElement('div');
      el.className = 'sheet';
      var list = (opt.items || []).map(function (it, i) {
        return '<button type="button" class="item" data-i="' + i + '">' +
          (it.icon ? '<span class="item__lead">' + icon(it.icon) + '</span>' : '') +
          '<span class="item__body"><span class="item__title"><span>' + esc(it.label) + '</span></span>' + (it.sub ? '<span class="item__sub">' + esc(it.sub) + '</span>' : '') + '</span>' +
          (it.current ? '<span class="badge badge--done">선택됨</span>' : (it.end ? '<span class="item__end">' + esc(it.end) + '</span>' : '')) +
          '</button>';
      }).join('');
      el.innerHTML = '<div class="sheet__panel" role="dialog" aria-modal="true" aria-label="' + esc(opt.title) + '"><span class="sheet__grip"></span>' +
        '<h2 class="sheet__title">' + esc(opt.title) + '</h2>' + (opt.html || '') +
        '<div class="sheet__list">' + list + '</div>' +
        '<div class="sheet__foot"><button type="button" class="btn btn--quiet btn--sm" data-close>' + esc(opt.foot || '닫기') + '</button></div></div>';
      device().appendChild(el);
      function close(v) { el.remove(); resolve(v); }
      el.addEventListener('click', function (e) {
        if (e.target === el || e.target.closest('[data-close]')) return close(null);
        var b = e.target.closest('[data-i]'); if (b) { var it = opt.items[+b.getAttribute('data-i')]; close(it.value !== undefined ? it.value : it); }
        var a = e.target.closest('[data-act]'); if (a) close({ act: a.getAttribute('data-act') });
      });
    });
  }

  /* ---------- 탭 · 칩 (role="tablist") ---------- */
  function initTabs(root) {
    $$('[role="tablist"]', root).forEach(function (list) {
      if (list.__init) return; list.__init = true;
      list.addEventListener('click', function (e) {
        var b = e.target.closest('[role="tab"]'); if (!b || !list.contains(b)) return;
        select(list, b);
      });
    });
  }
  function select(list, b) {
    $$('[role="tab"]', list).forEach(function (x) { x.setAttribute('aria-selected', x === b ? 'true' : 'false'); x.tabIndex = x === b ? 0 : -1; });
    b.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    list.dispatchEvent(new CustomEvent('tabchange', { detail: { value: b.getAttribute('data-value'), el: b } }));
  }
  function selectValue(list, value) { var b = $('[role="tab"][data-value="' + value + '"]', list); if (b) select(list, b); }

  /* ---------- 수량 조절 ---------- */
  function initSteppers(root) {
    $$('[data-stepper]', root).forEach(function (st) {
      if (st.__init) return; st.__init = true;
      var input = $('input', st);
      var min = +(input.getAttribute('min') || 0), max = +(input.getAttribute('max') || 99999);
      function set(v) {
        v = Math.max(min, Math.min(max, Math.round(+v || 0)));
        input.value = v;
        $$('[data-step]', st).forEach(function (b) { var s = +b.getAttribute('data-step'); b.disabled = s < 0 ? v <= min : v >= max; });
        st.dispatchEvent(new CustomEvent('stepchange', { bubbles: true, detail: { value: v } }));
      }
      st.addEventListener('click', function (e) { var b = e.target.closest('[data-step]'); if (b) set(+input.value + +b.getAttribute('data-step')); });
      input.addEventListener('change', function () { set(input.value); });
      input.addEventListener('focus', function () { input.select(); });
      st.setValue = set; set(input.value);
    });
  }

  /* ---------- 비밀번호 보기 ---------- */
  function initPw(root) {
    $$('[data-pw-toggle]', root).forEach(function (b) {
      b.onclick = function () {
        var i = b.parentNode.querySelector('input'); var show = i.type === 'password';
        i.type = show ? 'text' : 'password';
        b.setAttribute('aria-label', show ? '비밀번호 숨기기' : '비밀번호 보기');
        b.innerHTML = icon(show ? 'eyeoff' : 'eye');
      };
    });
  }

  /* ---------- 확인용 보조 UI (설명서 · 화면 목록) ---------- */
  var PAGES = [
    { file: 'login.html', title: '로그인', group: '공통' },
    { file: 'home.html', title: '통합 스캔 홈', group: '공통' },
    { file: 'inbound_list.html', title: '입고 대기', group: '입고' },
    { file: 'inbound_reg.html', title: '입고 등록', group: '입고' },
    { file: 'inbound_quality.html', title: '품질검사', group: '입고' },
    { file: 'inbound_done.html', title: '입고 확정 · 라벨 출력', group: '입고' },
    { file: 'outbound_picking.html', title: '출고 · 피킹리스트', group: '출고' },
    { file: 'outbound_check.html', title: '출고 확인 · 상차', group: '출고' },
    { file: 'print.html', title: '출력', group: '출력' },
    { file: 'stock.html', title: '재고 조회', group: '재고' }
  ];
  function initChrome() {
    var here = location.pathname.split('/').pop() || 'index.html';
    var nav = $('#navlist');
    if (nav) nav.innerHTML = '<h2 class="navlist__title">화면 목록</h2>' + PAGES.map(function (p) {
      return '<a href="' + p.file + '"' + (p.file === here ? ' class="is-current" aria-current="page"' : '') + '>' + p.title + '<em>' + p.group + '</em></a>';
    }).join('') + '<a href="#" data-reset>시연 데이터 초기화<em>처음 상태로</em></a>';
    $$('[data-modal-open]').forEach(function (b) { b.onclick = function () { $('#' + b.getAttribute('data-modal-open')).hidden = false; }; });
    $$('.modal').forEach(function (m) { m.addEventListener('click', function (e) { if (e.target === m || e.target.closest('[data-close]')) m.hidden = true; }); });
    document.addEventListener('click', function (e) { if (e.target.closest('[data-reset]')) { e.preventDefault(); window.PdaStore.reset(); go('home.html', '시연 데이터를 처음 상태로 돌렸습니다'); } });
  }

  /* ---------- 홈 화면 앱 (PWA) ---------- */
  var installEvt = null;
  var standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (standalone) document.documentElement.classList.add('is-app');
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () { navigator.serviceWorker.register('./sw.js').catch(function () {}); });
  }
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); installEvt = e;
    $$('[data-install]').forEach(function (b) { b.hidden = false; });
  });
  window.addEventListener('appinstalled', function () { installEvt = null; $$('[data-install]').forEach(function (b) { b.hidden = true; }); toast('홈 화면에 앱을 설치했습니다', 'ok'); });
  function install() {
    if (installEvt) { installEvt.prompt(); installEvt.userChoice.then(function () { installEvt = null; }); return; }
    if (standalone) { toast('이미 앱으로 실행 중입니다'); return; }
    sheet({ title: '홈 화면에 추가하기', html: '<ol class="install-guide"><li><b>안드로이드 크롬</b> 오른쪽 위 메뉴(⋮)에서 "홈 화면에 추가" 또는 "앱 설치"</li><li><b>아이폰 사파리</b> 아래 공유 버튼에서 "홈 화면에 추가"</li></ol>' });
  }
  document.addEventListener('click', function (e) { if (e.target.closest('[data-install]')) install(); });

  /* ---------- 버전 표시 · 새 버전 확인 ---------- */
  var V = window.PDA_VERSION || { version: '-', build: '' };
  function verText(v) { return '버전 ' + v.version + (v.build ? '  (' + v.build.slice(5).replace('-', '.') + ' 업데이트)' : ''); }
  function checkUpdate() {
    if (location.protocol === 'file:') return;
    fetch('version.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (srv) {
      var id = srv.version + '|' + srv.build;
      if (!srv.version || (srv.version === V.version && srv.build === V.build)) { try { localStorage.removeItem('pda_ver_ack'); } catch (e) {} return; }
      // 이미 업데이트를 눌렀거나(이 기기), 이번 사용 중 '나중에'를 고른 버전이면 다시 묻지 않음
      try { if (localStorage.getItem('pda_ver_ack') === id || sessionStorage.getItem('pda_ver_later') === id) return; } catch (e) {}
      sheet({ title: '새 버전이 있습니다', html: '<p class="item__sub" style="padding:0 20px 8px">설치된 버전 ' + esc(V.version) + ' → 새 버전 ' + esc(srv.version) + '</p>',
        items: [{ label: '지금 업데이트', sub: '앱을 다시 불러옵니다', icon: 'sync', value: 'go' }], foot: '나중에' }).then(function (v) {
        if (v !== 'go') { try { sessionStorage.setItem('pda_ver_later', id); } catch (e) {} return; }
        try { localStorage.setItem('pda_ver_ack', id); } catch (e) {}
        loading('업데이트 중', '새 버전 ' + srv.version, 200).then(function () {
          var fired = false, done = function () { if (fired) return; fired = true; location.reload(); };
          if (!('serviceWorker' in navigator)) return done();
          navigator.serviceWorker.addEventListener('controllerchange', done);   // 새 버전이 적용되면 다시 불러오기
          setTimeout(done, 4000);
          caches.keys().then(function (k) { return Promise.all(k.map(function (x) { return caches.delete(x); })); })
            .then(function () { return navigator.serviceWorker.getRegistration(); })
            .then(function (reg) { return reg ? reg.update() : done(); }).catch(done);
        });
      });
    }).catch(function () {});
  }

  /* ---------- 시작 ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    initTabs(); initSteppers(); initPw(); initChrome();
    $$('[data-version]').forEach(function (e) { e.textContent = verText(V); });
    setTimeout(checkUpdate, 1200);
    try { var m = sessionStorage.getItem('pda_toast'); if (m) { sessionStorage.removeItem('pda_toast'); m = JSON.parse(m); setTimeout(function () { toast(m.text, m.kind); }, 120); } } catch (e) {}
  });

  window.PdaUI = { $: $, $$: $$, esc: esc, fmt: fmt, icon: icon, toast: toast, loading: loading, busy: busy, go: go, sheet: sheet, install: install, standalone: standalone, version: V, verText: verText,
    initTabs: initTabs, initSteppers: initSteppers, selectTab: selectValue, params: new URLSearchParams(location.search) };
})();
