/* ==================================================
   맑은물에 PDA · 화면별 동작
   <body data-page="..."> 값에 따라 해당 화면만 실행합니다.
================================================== */
(function () {
  'use strict';
  var U, D, Q, S, $, $$, esc, fmt, icon;
  var P = {};

  function badgeOf(status) {
    var cls = { '입고대기': '', '출고대기': '', '부분입고': 'badge--ing', '피킹중': 'badge--ing', '출고완료': 'badge--done', '입고완료': 'badge--done' }[status] || '';
    return '<span class="badge ' + cls + '">' + esc(status) + '</span>';
  }
  function remain(r) { return r.ordered - r.received; }
  function meta(arr) { return arr.filter(Boolean).map(function (t) { return '<span>' + esc(t) + '</span>'; }).join(''); }
  function now() { var d = new Date(); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  function boxes(o) { return o.items.reduce(function (a, b) { return a + b.box; }, 0); }
  function vehicleOf(plate) { for (var i = 0; i < D.vehicles.length; i++) if (D.vehicles[i].plate === plate) return D.vehicles[i]; return { plate: plate, driver: '', car: '' }; }
  function barsSvg(code) {
    var x = 0, out = '', seed = 0;
    for (var i = 0; i < code.length; i++) seed = (seed * 31 + code.charCodeAt(i)) % 9973;
    for (var j = 0; j < 46; j++) { seed = (seed * 73 + 41) % 9973; var w = 1 + seed % 3; if (j % 2 === 0) out += '<rect x="' + x + '" y="0" width="' + w + '" height="56"/>'; x += w; }
    return '<svg class="label__bars" viewBox="0 0 ' + x + ' 56" preserveAspectRatio="none" aria-hidden="true" fill="#111">' + out + '</svg>';
  }

  /* ========== 로그인 ========== */
  P['login'] = function () {
    var form = $('#loginForm'), err = $('#loginErr'), corpSel = $('#corp'), uidSel = $('#uid');
    var last = {}; try { last = JSON.parse(localStorage.getItem('pda_last_login') || '{}'); } catch (e) {}
    // 업체 목록
    corpSel.insertAdjacentHTML('beforeend', D.corps.map(function (c) { return '<option value="' + esc(c.code) + '">' + esc(c.name) + '</option>'; }).join(''));
    function findCorp(code) { return D.corps.filter(function (c) { return c.code === code; })[0]; }
    // 업체를 고르면 그 업체의 아이디만 보여줌
    function fillUsers(keep) {
      var c = findCorp(corpSel.value);
      uidSel.innerHTML = c ? '<option value="">아이디를 선택하세요</option>' + c.users.map(function (u) { return '<option value="' + esc(u.id) + '">' + esc(u.name) + ' (' + esc(u.id) + ')</option>'; }).join('')
                           : '<option value="">업체를 먼저 선택하세요</option>';
      uidSel.disabled = !c;
      if (c && c.users.length === 1) uidSel.value = c.users[0].id;
      else if (keep && c && c.users.some(function (u) { return u.id === keep; })) uidSel.value = keep;
    }
    corpSel.addEventListener('change', function () { corpSel.classList.remove('is-bad'); fillUsers(); });
    uidSel.addEventListener('change', function () { uidSel.classList.remove('is-bad'); });
    // 지난번에 고른 업체 · 아이디 기억 (처음이면 맑은물에 · 홍길동)
    corpSel.value = findCorp(last.corp) ? last.corp : 'MGM001';
    fillUsers(last.uid || 'hong01');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var empty = $$('.input', form).filter(function (i) { var bad = !i.value.trim(); i.classList.toggle('is-bad', bad); return bad; });
      if (empty.length) { var f = empty[0], nm = f.closest('.field').querySelector('label').textContent, lc = nm.charCodeAt(nm.length - 1) - 0xAC00;
      err.textContent = nm + (lc >= 0 && lc % 28 ? '을' : '를') + (f.tagName === 'SELECT' ? ' 선택하세요.' : ' 입력하세요.'); err.hidden = false; f.focus(); return; }
      err.hidden = true;
      var c = findCorp(corpSel.value), u = c.users.filter(function (x) { return x.id === uidSel.value; })[0];
      var user = { name: u.name, id: u.id, corp: c.name, corpCode: c.code };
      try { sessionStorage.setItem('pda_user', JSON.stringify(user)); localStorage.setItem('pda_last_login', JSON.stringify({ corp: c.code, uid: u.id })); } catch (x) {}
      D.user = user;
      U.busy('로그인 중', c.name + ' · ' + u.name, 650).then(function () { U.go('home.html', u.name + '님, 오늘도 안전하게 작업하세요'); });
    });
    window.PdaPage = { onScan: function (code, ctx) {
      if (ctx !== 'emp') return false;
      if (code.toUpperCase().indexOf('EMP-') === 0) {
        window.PdaScan.beep(true);
        U.busy('로그인 중', '사원증 ' + code, 650).then(function () { U.go('home.html', D.user.name + '님, 오늘도 안전하게 작업하세요'); });
      } else { window.PdaScan.beep(false); U.toast('사원증 바코드가 아닙니다: ' + code, 'err'); }
      return true;
    } };
  };

  /* 발주일 표기 : 2026-10-24 → 10.24 */
  function mmdd(d) { return d ? d.slice(5).replace('-', '.') : ''; }

  /* 선입선출 : LOT(생산일 YYMMDD) 오래된 순으로 정렬 */
  function byLot(a, b) { return String(a.lot).localeCompare(String(b.lot)); }
  // 품목을 내주는 업체 (LOT 보관처 기준)
  function corpOf(it) {
    var names = [];
    (it.lots || []).forEach(function (l) { var n = /홀딩스/.test(l.wh) ? '샘플홀딩스' : l.wh.replace(/\s.*$/, ''); if (names.indexOf(n) < 0) names.push(n); });
    return names.join(' · ') || '-';
  }
  function fifoHtml(lots, unit) {
    if (!lots || !lots.length) return '';
    return '<span class="fifo">' + lots.slice().sort(byLot).map(function (l, i) {
      return '<span class="fifo__row' + (i === 0 ? ' is-first' : '') + '"><span class="fifo__no">' + (i + 1) + '</span><span class="fifo__txt num">' + esc(l.wh) + ' · LOT ' + esc(l.lot) + '</span><span class="fifo__qty num">' + fmt(l.box) + unit + '</span></span>';
    }).join('') + '</span>';
  }

  /* ========== 홈 ========== */
  P['home'] = function () {
    // 숫자가 바뀔 때 굴러가듯 (0.4초)
    function roll(el, to) {
      var from = +(el.getAttribute('data-v') || 0), t0 = null; el.setAttribute('data-v', to);
      if (from === to) { el.textContent = fmt(to); return; }
      el.parentNode.classList.remove('is-pop'); void el.offsetWidth; el.parentNode.classList.add('is-pop');
      (function step(ts) { if (!t0) t0 = ts; var k = Math.min(1, (ts - t0) / 400); el.textContent = fmt(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(step); })(performance.now());
      requestAnimationFrame(function step2(ts) { if (!t0) t0 = ts; });
    }
    var KIND = { '출고': 'outbox', '입고': 'inbox', '실사': 'count' };
    function renderDash(g) {
      var d = Q.dash(g);
      roll($('[data-kpi="inWait"]'), d.inWait); roll($('[data-kpi="outWait"]'), d.outWait); roll($('[data-kpi="stock"]'), d.stockItems);
      $('[data-kpi-sub="in"]').textContent = d.inPart ? '부분입고 ' + d.inPart : '입고 대기';
      $('[data-kpi-sub="out"]').textContent = '완료 ' + d.outDone;
      $('[data-kpi-sub="stock"]').textContent = '총 ' + fmt(d.stockQty);
      var t = Q.tasks(g);
      $('#taskCount').innerHTML = '<b>' + t.length + '</b>건 남음';
      $('#taskEmpty').hidden = t.length > 0; $('#taskList').hidden = !t.length;
      $('#taskList').innerHTML = t.map(function (x) {
        return '<a class="item task" href="' + x.url + '"><span class="task__ic task__ic--' + (KIND[x.kind] || 'inbox') + '">' + icon(KIND[x.kind] || 'inbox', 'ic--s') + '</span>' +
          '<span class="item__body"><span class="task__title">' + esc(x.title) + '</span><span class="item__sub meta num"><span class="task__kind">' + esc(x.time) + ' ' + esc(x.kind) + '</span><span>' + esc(x.sub) + '</span></span></span>' +
          icon('chev', 'item__chev') + '</a>';
      }).join('');
      try { sessionStorage.setItem('pda_dash_group', g); } catch (e) {}
    }
    $('#dashDate').textContent = D.today;
    var tabs = $('#dashTabs'), g0 = 'pda_dash_group'; try { g0 = sessionStorage.getItem('pda_dash_group') || '전체'; } catch (e) { g0 = '전체'; }
    tabs.addEventListener('tabchange', function (e) { renderDash(e.detail.value); });
    U.selectTab(tabs, g0);

    if (U.params.get('scan') === '1') setTimeout(function () { window.PdaScan.open('route'); }, 300);
    $('#userName').textContent = D.user.name;
    $('#userBtn').onclick = function () {
      U.sheet({ title: D.user.name + ' (' + D.user.id + ')', html: '<p class="item__sub" style="padding:0 20px 8px">' + esc(D.user.corp) + ' (' + esc(D.user.corpCode) + ')' + '<br>' + esc(U.verText(U.version)) + '</p>',
        items: [{ label: '화면 목록', icon: 'list', value: 'nav' }, { label: '시연 데이터 초기화', icon: 'sync', value: 'reset' },
          { label: U.standalone ? '앱으로 실행 중' : '홈 화면에 앱 설치', icon: 'home', value: 'install' }, { label: '로그아웃', icon: 'logout', value: 'logout' }] }).then(function (v) {
        if (v === 'logout') U.busy('로그아웃 중', null, 400).then(function () { location.href = 'login.html'; });
        else if (v === 'nav') $('#mNav').hidden = false;
        else if (v === 'reset') { S.reset(); U.go('home.html', '시연 데이터를 처음 상태로 돌렸습니다'); }
        else if (v === 'install') U.install();
      });
    };
  };

  /* ========== 입고 대기 ========== */
  P['inbound_list'] = function () {
    var list = Q.inbound(), tabs = $('#inTabs');
    $$('[role="tab"]', tabs).forEach(function (t) {
      var v = t.getAttribute('data-value'), n = v === '전체' ? list.length : list.filter(function (r) { return r.menu === v; }).length;
      t.insertAdjacentHTML('beforeend', '<span class="chip__n">' + n + '</span>');
      if (v !== '전체' && n === 0) t.remove();   // 처리할 건이 없는 구분은 탭에서 뺌
    });
    function render(menu) {
      var rows = list.filter(function (r) { return menu === '전체' || r.menu === menu; });
      $('#inCount').innerHTML = '<b>' + rows.length + '</b>건';
      $('#inEmpty').hidden = rows.length > 0;
      $('#inList').hidden = rows.length === 0;
      $('#inList').innerHTML = rows.map(function (r) {
        var st = r.received > 0 ? '부분입고' : '입고대기';
        return '<a class="item" href="inbound_reg.html?id=' + encodeURIComponent(r.id) + '"><span class="item__body">' +
          '<span class="item__title"><span class="tag">' + esc(r.cat) + '</span><span>' + esc(r.partner) + '</span></span>' +
          '<span class="item__sub meta">' + meta([r.name + (r.spec ? ' ' + r.spec : ''), r.vehicle && '차량 ' + r.vehicle]) + '</span>' +
          '<span class="item__sub num">발주일 ' + mmdd(r.orderDate) + '</span>' +
          '<span class="item__foot"><span class="num">발주 ' + fmt(r.ordered) + r.unit + ' / 입고 ' + fmt(r.received) + r.unit + '</span>' + badgeOf(st) + '</span>' +
          '</span>' + icon('chev', 'item__chev') + '</a>';
      }).join('');
    }
    tabs.addEventListener('tabchange', function (e) { render(e.detail.value); });
    render('전체');
    window.PdaPage = { onScan: function (code) {
      var hit = Q.findInByCode(code); if (!hit) return false;
      window.PdaScan.beep(true);
      U.busy('입고 건 불러오는 중', hit.partner + ' · ' + hit.name, 300).then(function () { location.href = 'inbound_reg.html?id=' + encodeURIComponent(hit.id) + '&by=scan'; });
      return true;
    } };
    if (U.params.get('tab') && $('[data-value="' + U.params.get('tab') + '"]', tabs)) U.selectTab(tabs, U.params.get('tab'));
  };

  /* ========== 입고 등록 ========== */
  P['inbound_reg'] = function () {
    var r = Q.findIn(U.params.get('id')) || Q.inbound()[0];
    if (!r) { $('#regMain').hidden = true; $('#regEmpty').hidden = false; return; }
    var max = remain(r);
    var st = { qty: max, lot: '', status: '입고완료', locs: [{ name: D.warehouses[0], qty: max }] };
    var draft = S.get('draft'); if (draft && draft.id === r.id) { st.qty = draft.qty; st.lot = draft.lot; st.locs = draft.locs; st.status = draft.status; st.qc = draft.qc; st.qcMemo = draft.qcMemo; }

    $('#hdTitle').textContent = r.menu + ' 등록';
    $('#sumHead').innerHTML = '<span class="tag">' + esc(r.cat) + '</span><span>' + esc(r.name) + (r.spec ? ' · ' + esc(r.spec) : '') + '</span>';
    $('#sumTitle').textContent = r.partner;   // 거래처를 크게
    $('#sumSub').className = 'summary__sub num meta'; $('#sumSub').innerHTML = meta(['발주일 ' + mmdd(r.orderDate), r.vehicle && '차량 ' + r.vehicle, r.id]);
    $('#figOrdered').innerHTML = fmt(r.ordered) + '<small>' + r.unit + '</small>';
    $('#figReceived').innerHTML = fmt(r.received) + '<small>' + r.unit + '</small>';
    $$('[data-unit]').forEach(function (e) { e.textContent = r.unit; });
    var qtyStep = $('#qtyStep'), qtyIn = $('input', qtyStep);
    qtyIn.max = max; qtyIn.value = st.qty; qtyStep.setValue(st.qty);
    $('#nextBtn').textContent = '입고 확정';

    function sum() { return st.locs.reduce(function (a, b) { return a + b.qty; }, 0); }
    function renderLocs() {
      $('#locList').innerHTML = st.locs.map(function (l, i) {
        return '<div class="item" data-loc="' + i + '"><span class="item__lead">' + icon('pin') + '</span><span class="item__body"><span class="item__title"><span>' + esc(l.name) + '</span></span>' +
          (st.locs.length > 1 ? '<button type="button" class="link-del" data-del="' + i + '">삭제</button>' : '') + '</span>' +
          '<div class="stepper stepper--s" data-stepper><button type="button" class="stepper__btn" data-step="-1" aria-label="줄이기">' + icon('minus', 'ic--s') + '</button>' +
          '<input class="stepper__input" type="number" inputmode="numeric" min="0" max="' + max + '" value="' + l.qty + '" aria-label="' + esc(l.name) + ' 수량">' +
          '<button type="button" class="stepper__btn" data-step="1" aria-label="늘리기">' + icon('plus', 'ic--s') + '</button></div></div>';
      }).join('');
      U.initSteppers($('#locList'));
      $('#addLoc').hidden = st.locs.length >= D.warehouses.length;
      check();
    }
    function check() {
      var s = sum(), ok = s === st.qty;
      $('#figRemain').innerHTML = fmt(max - st.qty) + '<small>' + r.unit + '</small>';
      $('#figRemain').classList.toggle('is-warn', max - st.qty > 0);
      var h = $('#locHelp');
      h.textContent = ok ? '배분 합계 ' + fmt(s) + r.unit + ', 입고수량과 같습니다' : '배분 합계 ' + fmt(s) + r.unit + ' / 입고수량 ' + fmt(st.qty) + r.unit + ', 수량을 맞춰주세요';
      h.className = 'field__help ' + (ok ? 'is-ok' : 'is-bad');
      $('#nextBtn').disabled = !(st.qty > 0 && ok);
      if (st.status === '반품') $('#nextBtn').textContent = '반품 등록';
      else $('#nextBtn').textContent = '입고 확정';
    }
    qtyStep.addEventListener('stepchange', function (e) {
      st.qty = e.detail.value;
      if (st.status !== '반품') U.selectTab($('#statusTabs'), st.qty < max ? '부분입고' : '입고완료');
      if (st.locs.length === 1) { st.locs[0].qty = st.qty; renderLocs(); } else check();
    });
    $('#locList').addEventListener('stepchange', function (e) {
      var row = e.target.closest('[data-loc]'); if (!row) return;
      st.locs[+row.getAttribute('data-loc')].qty = e.detail.value; check();
    });
    $('#locList').addEventListener('click', function (e) {
      var d = e.target.closest('[data-del]'); if (!d) return;
      st.locs.splice(+d.getAttribute('data-del'), 1); renderLocs();
    });
    $('#addLoc').onclick = function () {
      var used = st.locs.map(function (l) { return l.name; });
      U.sheet({ title: '적재 위치 추가', items: D.warehouses.filter(function (w) { return used.indexOf(w) < 0; }).map(function (w) { return { label: w, icon: 'pin', value: w }; }) })
        .then(function (w) { if (!w) return; st.locs.push({ name: w, qty: Math.max(0, st.qty - sum()) }); renderLocs(); U.toast(w + ' 위치를 추가했습니다'); });
    };
    $('#statusTabs').addEventListener('tabchange', function (e) { st.status = e.detail.value; check(); });

    // 간이 품목검사 : 기본은 모두 양호, 이상이 있을 때만 불량
    var QC = ['포장 상태', '표기 · 라벨', '이물 · 오염'];
    st.qc = st.qc || QC.map(function () { return 'ok'; }); st.qcMemo = st.qcMemo || '';
    $('#qcList').innerHTML = QC.map(function (n, i) {
      return '<div class="item"><span class="item__body"><span class="item__title"><span>' + n + '</span></span></span>' +
        '<div class="judge" role="radiogroup" aria-label="' + n + '" data-qc="' + i + '">' +
        '<button type="button" class="judge__btn" role="radio" data-v="ok">양호</button><button type="button" class="judge__btn" role="radio" data-v="ng">불량</button></div></div>';
    }).join('');
    function renderQc() {
      $$('[data-qc]').forEach(function (g) { var i = +g.getAttribute('data-qc'); $$('.judge__btn', g).forEach(function (b) { b.setAttribute('aria-checked', b.getAttribute('data-v') === st.qc[i] ? 'true' : 'false'); }); });
      $('#qcMemoBox').hidden = st.qc.indexOf('ng') < 0;
    }
    $('#qcList').addEventListener('click', function (e) { var b = e.target.closest('.judge__btn'); if (!b) return; st.qc[+b.parentNode.getAttribute('data-qc')] = b.getAttribute('data-v'); renderQc(); });
    $('#qcMemo').value = st.qcMemo; $('#qcMemo').addEventListener('input', function () { st.qcMemo = this.value; });
    renderQc();
    U.selectTab($('#statusTabs'), st.status); renderLocs();

    $('#nextBtn').onclick = function () {
      S.set('draft', { id: r.id, qty: st.qty, lot: st.lot, locs: st.locs, status: st.status, qc: st.qc, qcMemo: st.qcMemo });
      if (st.status === '반품') { U.busy('반품 등록 중', null, 700).then(function () { S.set('draft', null); U.go('inbound_list.html', r.name + ' ' + st.qty + r.unit + ' 반품을 등록했습니다'); }); return; }
      U.busy('저장 중', null, 350).then(function () { location.href = 'inbound_done.html'; });
    };
    if (U.params.get('by') === 'scan') U.toast('수량을 확인하고 입고 확정을 누르세요', 'ok');
    window.PdaPage = { onScan: function (code, ctx) {
      var hit = Q.findInByCode(code);
      if (hit) {
        window.PdaScan.beep(true);
        if (hit.id === r.id) { U.toast('지금 화면의 품목입니다. 입고 확정을 누르세요', 'ok'); return true; }
        location.href = 'inbound_reg.html?id=' + encodeURIComponent(hit.id) + '&by=scan'; return true;
      }
      return false;
    } };
  };

  /* 입고 등록에서 넘겨받은 값 */
  function draftItem() {
    var d = S.get('draft'), r = d && Q.findIn(d.id);
    if (!r) { r = Q.inbound()[0]; d = { id: r.id, qty: remain(r), lot: 'LOT1234567', locs: [{ name: D.warehouses[0], qty: remain(r) }], status: '입고완료' }; }
    return { d: d, r: r };
  }

  /* ========== 입고 확정 · 라벨 ========== */
  P['inbound_done'] = function () {
    var x = draftItem(), r = x.r, d = x.d;
    var inNo = 'IN-20261026-' + String(10 + (r.id.length * 7) % 80).padStart(4, '0');
    $('#hdTitle').textContent = r.menu + ' 확정';
    $('#sumHead').innerHTML = '<span class="tag">' + esc(r.cat) + '</span><span>' + esc(r.name) + (r.spec ? ' · ' + esc(r.spec) : '') + '</span>';
    $('#sumTitle').textContent = r.partner;   // 거래처를 크게
    var QCN = ['포장 상태', '표기 · 라벨', '이물 · 오염'], bad = (d.qc || []).map(function (v, i) { return v === 'ng' ? QCN[i] : null; }).filter(Boolean);
    var qcText = bad.length ? '불량 · ' + bad.join(', ') + (d.qcMemo ? ' (' + d.qcMemo + ')' : '') : '양호';
    $('#doneKv').innerHTML = [['입고번호', inNo], ['발주일', r.orderDate || '-'], ['입고수량', fmt(d.qty) + r.unit], ['간이 검사', qcText]]
      .map(function (k) { return '<div class="kv__row"><dt>' + k[0] + '</dt><dd class="num">' + esc(k[1]) + '</dd></div>'; }).join('');
    $('#doneLocs').innerHTML = d.locs.map(function (l) { return '<div class="item"><span class="item__lead">' + icon('pin') + '</span><span class="item__body"><span class="item__title"><span>' + esc(l.name) + '</span></span></span><span class="item__end num">' + fmt(l.qty) + r.unit + '</span></div>'; }).join('');
    // 입고 라벨 : 출력하지 않고, 필요할 때 [입고 라벨 보기]로 확인 (적재 위치마다 1장)
    var labels = d.locs.map(function (l, i) {
      var no = inNo + '-' + String(i + 1).padStart(2, '0');
      return '<div class="label" style="margin:0 20px 10px">' + barsSvg(no) + '<span class="label__code">' + no + '</span><span class="label__desc">' + esc(r.name) + '<br>' + esc(l.name) + ' ' + fmt(l.qty) + r.unit + '</span></div>';
    }).join('');
    $('#labelBtn').onclick = function () { U.sheet({ title: '입고 라벨 ' + d.locs.length + '장', html: labels, items: [], foot: '닫기' }); };
    $('#confirmBtn').onclick = function () {
      U.busy('입고 확정 중', 'ERP 재고에 반영합니다', 700).then(function () {
        var done = S.get('inDone', {}); done[r.id] = (done[r.id] || 0) + d.qty; S.set('inDone', done); S.set('draft', null);
        $('#doneMain').hidden = true; $('#doneFoot').hidden = true; $('#doneResult').hidden = false;
        $('#resDesc').textContent = r.partner + ' · ' + r.name + ' ' + fmt(d.qty) + r.unit + '를 입고했습니다.';
        window.PdaScan.beep(true);
      });
    };
  };

  /* ========== 출고 · 피킹리스트 ========== */
  P['outbound_picking'] = function () {
    // 출고완료된 건은 목록에서 뺌 (바코드로 찍으면 완료 내역은 볼 수 있음)
    var list = Q.outbound().filter(function (o) { return o.status !== '출고완료'; }), tabs = $('#outTabs');
    // 처리할 건이 있는 구분만 탭으로
    var types = D.outTypes.filter(function (t) { return list.some(function (o) { return o.type === t; }); });
    tabs.hidden = !types.length;
    tabs.innerHTML = types.map(function (t, i) {
      var n = list.filter(function (o) { return o.type === t; }).length;
      return '<button type="button" class="chip" role="tab" data-value="' + t + '" aria-selected="' + (i === 0) + '">' + t + '<span class="chip__n">' + n + '</span></button>';
    }).join('');
    U.initTabs($('.ph'));
    function render(type) {
      var rows = list.filter(function (o) { return o.type === type; });
      var total = rows.reduce(function (a, o) { return a + boxes(o); }, 0);
      $('#outCount').innerHTML = '<span class="meta"><span><b>' + rows.length + '</b>곳</span><span>' + fmt(total) + '박스</span></span>';
      $('#outEmpty').hidden = rows.length > 0; $('#outEmptyText').textContent = '남은 ' + type + ' 건이 없습니다';
      $('#outList').hidden = rows.length === 0;
      $('#outList').innerHTML = rows.map(function (o) {
        var pct = o.status === '출고완료' ? 100 : o.status === '피킹중' ? 45 : 0;
        return '<a class="item" href="outbound_check.html?code=' + o.ts + '"><span class="item__body">' +
          '<span class="item__title"><span>' + esc(o.customer) + '</span></span>' +
          '<span class="item__sub meta">' + meta([o.center, o.round]) + '</span>' +
          '<span class="item__foot"><span style="display:flex;align-items:center;gap:6px">' + icon('truck', 'ic--s') + esc(o.vehicle) + '</span><span class="num">' + boxes(o) + '박스</span></span>' +
          '<span class="bar" style="margin-top:6px"><span class="bar__fill' + (o.status === '피킹중' ? ' is-ing' : '') + '" style="width:' + pct + '%"></span></span>' +
          '</span>' + badgeOf(o.status) + '</a>';
      }).join('');
    }
    tabs.addEventListener('tabchange', function (e) { render(e.detail.value); });
    if (types.length) render(types[0]);
    else { $('#outCount').innerHTML = ''; $('#outList').hidden = true; $('#outEmpty').hidden = false; $('#outEmptyText').textContent = '오늘 남은 출고가 없습니다'; }
  };

  /* ========== 출고 확인 · 상차 ========== */
  P['outbound_check'] = function () {
    var code = U.params.get('code') || D.outbound[0].ts, o = Q.findOut(code);
    if (!o) { $('#ocMain').hidden = true; $('#ocFoot').hidden = true; $('#ocEmpty').hidden = false; $('#ocEmptyCode').textContent = code; return; }
    var isPk = code.toUpperCase().indexOf('PK-') === 0, checked = {}, veh = vehicleOf(o.vehicle), fromPk = U.params.get('pk');
    if (fromPk) { $('.hd__back').href = 'outbound_group.html?code=' + encodeURIComponent(fromPk); $$('#ocResultFoot a.btn:not(.btn--line)').forEach(function (a) { a.href = 'outbound_group.html?code=' + encodeURIComponent(fromPk); a.lastChild.textContent = '피킹리스트로'; }); }
    function showResult(already) {
      $('#ocMain').hidden = true; $('#ocFoot').hidden = true; $('#ocResult').hidden = false; $('#ocResultFoot').hidden = false;
      $('#resTitle').textContent = already ? '이미 출고 완료된 건입니다' : '출고 완료';
      var real = (typeof qty !== 'undefined' && qty) || S.get('outQty', {})[o.ts] || o.items.map(function (it) { return it.box; });
      var tot = real.reduce(function (a, b) { return a + b; }, 0);
      $('#resDesc').textContent = already ? o.customer + ' 건은 출고완료 상태입니다.' : o.customer + ' ' + fmt(tot) + '박스를 ' + veh.plate + '에 상차했습니다.';
      var diffRows = o.items.map(function (it, i) { return real[i] !== it.box ? [it.name, it.box + ' → ' + real[i] + '박스'] : null; }).filter(Boolean);
      $('#resKv').innerHTML = [[isPk ? '피킹리스트' : '거래명세표', code], ['배송차량', veh.plate]].concat(diffRows).concat([['ERP 진행상태', diffRows.length ? '출고완료 (수량 변경 ' + diffRows.length + '건)' : '출고완료']]).map(function (k) { return '<div class="kv__row"><dt>' + k[0] + '</dt><dd>' + esc(k[1]) + '</dd></div>'; }).join('');
      $('#printLink').href = 'print.html?doc=ts&code=' + encodeURIComponent(o.ts);
    }
    if (o.status === '출고완료') { showResult(true); return; }
    $('#sumHead').innerHTML = '<span class="badge badge--done">' + (isPk ? '피킹리스트' : '거래명세표') + '</span><span class="num">' + esc(code) + '</span>';
    $('#sumTitle').textContent = o.customer;
    $('#sumSub').innerHTML = meta([o.type, o.center, o.round]);
    function renderVeh() { $('#vehPlate').textContent = veh.plate; $('#vehSub').innerHTML = meta([veh.driver, veh.car]); }
    renderVeh();
    $('#vehBtn').onclick = function () {
      U.sheet({ title: '배송차량 변경', items: D.vehicles.map(function (v) { return { label: v.plate, sub: v.driver + ', ' + v.car, icon: 'truck', value: v, current: v.plate === veh.plate }; }) })
        .then(function (v) { if (v && v.plate) { veh = v; renderVeh(); U.toast('배송차량을 ' + v.plate + '로 바꿨습니다', 'ok'); } });
    };
    // 실제 출고수량 (기본은 예정 수량 · 바코드를 찍거나 품목을 누르면 고칠 수 있음)
    var qty = o.items.map(function (it) { return it.box; }), open = -1;
    $('#itemList').innerHTML = o.items.map(function (it, i) {
      return '<div class="oitem" data-i="' + i + '">' +
        '<button type="button" class="item oitem__head" data-toggle="' + i + '" aria-pressed="false"><span class="check">' + icon('check') + '</span>' +
        '<span class="item__body"><span class="item__corp">' + esc(corpOf(it)) + '</span><span class="item__title"><span>' + esc(it.name) + '</span></span>' +
        '<span class="item__sub">소비기한 ' + esc(it.exp) + '</span>' + fifoHtml(it.lots, '박스') + '</span>' +
        '<span class="item__end num"><span data-q="' + i + '">' + it.box + '</span><small>박스</small><em class="oitem__plan" data-plan="' + i + '" hidden></em></span></button>' +
        '<div class="oitem__qty" data-edit="' + i + '" hidden><span class="oitem__label">출고수량</span>' +
        '<div class="stepper stepper--s" data-stepper data-qi="' + i + '"><button type="button" class="stepper__btn" data-step="-1" aria-label="줄이기">' + icon('minus', 'ic--s') + '</button>' +
        '<input class="stepper__input" type="number" inputmode="numeric" min="0" max="' + (it.box * 3) + '" value="' + it.box + '" aria-label="' + esc(it.name) + ' 출고수량">' +
        '<button type="button" class="stepper__btn" data-step="1" aria-label="늘리기">' + icon('plus', 'ic--s') + '</button></div></div></div>';
    }).join('');
    U.initSteppers($('#itemList'));
    function showQty(i) {
      var it = o.items[i], d = qty[i] - it.box, p = $('[data-plan="' + i + '"]');
      $('[data-q="' + i + '"]').textContent = qty[i];
      p.hidden = !d; p.innerHTML = d ? '예정 ' + it.box + '<br>' + (d < 0 ? '부족 ' + (-d) : '초과 ' + d) : '';
      p.className = 'oitem__plan' + (d < 0 ? ' is-minus' : ' is-plus');
    }
    function openEdit(i) {
      open = i;
      $$('[data-edit]').forEach(function (e) { e.hidden = +e.getAttribute('data-edit') !== i; });
    }
    $('#itemList').addEventListener('stepchange', function (e) { var st = e.target.closest('[data-qi]'); if (!st) return; var i = +st.getAttribute('data-qi'); qty[i] = e.detail.value; showQty(i); });
    function upd() {
      var n = Object.keys(checked).filter(function (k) { return checked[k]; }).length, t = o.items.length;
      $('#itemCount').innerHTML = '<b>' + n + '</b> / ' + t;
      $('#doneBtn').disabled = n < t;
      $('#doneBtn').textContent = n < t ? '품목을 모두 확인하세요' : '출고 완료';
    }
    function setItem(i, v) {
      checked[i] = v; var b = $('#itemList [data-toggle="' + i + '"]');
      b.classList.toggle('is-checked', v); b.setAttribute('aria-pressed', v ? 'true' : 'false'); upd();
    }
    // 품목을 누르면 : 확인 + 출고수량 칸 열기 (열린 품목을 다시 누르면 확인 해제)
    $('#itemList').addEventListener('click', function (e) {
      var b = e.target.closest('[data-toggle]'); if (!b) return;
      var i = +b.getAttribute('data-toggle');
      if (checked[i] && open === i) { setItem(i, false); openEdit(-1); } else { setItem(i, true); openEdit(i); }
    });
    $('#allBtn').onclick = function () { o.items.forEach(function (_, i) { setItem(i, true); }); };
    $('#doneBtn').onclick = function () {
      U.busy('출고 처리 중', 'ERP 진행상태를 출고완료로 바꿉니다', 900).then(function () {
        var done = S.get('outDone', []); if (done.indexOf(o.ts) < 0) done.push(o.ts); S.set('outDone', done);
        var oq = S.get('outQty', {}); oq[o.ts] = qty.slice(); S.set('outQty', oq);
        window.PdaScan.beep(true); showResult(false);
      });
    };
    upd();
    window.PdaPage = { onScan: function (c, ctx) {
      if ($('#ocMain').hidden) return false;
      for (var i = 0; i < o.items.length; i++) if (o.items[i].ean === c) {
        window.PdaScan.beep(true); setItem(i, true); openEdit(i);
        var b = $('#itemList [data-i="' + i + '"]'); b.classList.add('is-flash'); b.scrollIntoView({ block: 'nearest' });
        setTimeout(function () { b.classList.remove('is-flash'); }, 700);
        U.toast(o.items[i].name + ' · 출고수량을 확인하세요', 'ok'); return true;
      }
      if (ctx === 'item') { window.PdaScan.beep(false); U.toast('이 건에 없는 품목입니다: ' + c, 'err'); return true; }
      return false;
    } };
  };

  /* ========== 피킹리스트 출고 (전체 / 거래처별) ========== */
  P['outbound_group'] = function () {
    var code = (U.params.get('code') || 'PK-20241127-02').toUpperCase(), rows = Q.findPk(code);
    if (!rows.length) { $('#pgMain').hidden = true; $('#pgEmpty').hidden = false; $('#pgEmptyCode').textContent = code; return; }
    function left() { return rows.filter(function (o) { return o.status !== '출고완료'; }); }
    var allBox = rows.reduce(function (a, o) { return a + boxes(o); }, 0);
    $('#sumHead').innerHTML = '<span class="tag">피킹리스트</span><span class="num">' + esc(code) + '</span>';
    $('#sumTitle').textContent = rows.length + '곳 · ' + fmt(allBox) + '박스';
    $('#sumSub').innerHTML = meta([rows[0].type, rows[0].round]);
    $('#pgPrint').href = 'print.html?doc=pk&code=' + encodeURIComponent(rows[0].ts);
    function render() {
      $('#pgList').innerHTML = rows.map(function (o) {
        var done = o.status === '출고완료';
        return '<a class="item' + (done ? ' is-done' : '') + '" href="outbound_check.html?code=' + o.ts + '&pk=' + encodeURIComponent(code) + '"><span class="item__body">' +
          '<span class="item__title"><span>' + esc(o.customer) + '</span></span>' +
          '<span class="item__sub meta">' + meta([o.center, o.ts]) + '</span>' +
          '<span class="item__foot"><span style="display:flex;align-items:center;gap:6px">' + icon('truck', 'ic--s') + esc(o.vehicle) + '</span><span class="num">' + boxes(o) + '박스</span></span>' +
          '</span>' + badgeOf(o.status) + '</a>';
      }).join('');
      var l = left(), lb = l.reduce(function (a, o) { return a + boxes(o); }, 0), btn = $('#allOutBtn');
      btn.disabled = !l.length;
      btn.textContent = l.length ? '전체 출고 (' + l.length + '곳 · ' + fmt(lb) + '박스)' : '모두 출고 완료';
    }
    render();
    $('#allOutBtn').onclick = function () {
      var l = left(); if (!l.length) return;
      U.sheet({ title: '전체 출고', html: '<p class="item__sub" style="padding:0 20px 8px">남은 ' + l.length + '곳을 모두 출고 처리하고 배정된 차량에 상차합니다.</p>',
        items: [{ label: '전체 출고', sub: l.map(function (o) { return o.customer; }).join(', '), icon: 'outbox', value: 'go' }], foot: '취소' }).then(function (v) {
        if (v !== 'go') return;
        U.busy('전체 출고 중', l.length + '곳 · ERP 출고완료로 바꿉니다', 900).then(function () {
          var done = S.get('outDone', []); l.forEach(function (o) { if (done.indexOf(o.ts) < 0) done.push(o.ts); o.status = '출고완료'; }); S.set('outDone', done);
          window.PdaScan.beep(true);
          $('#pgMain').hidden = true; $('#pgResult').hidden = false; $('#pgResultFoot').hidden = false;
          $('#pgResDesc').textContent = l.length + '곳 ' + fmt(l.reduce(function (a, o) { return a + boxes(o); }, 0)) + '박스를 출고했습니다.';
          $('#pgResKv').innerHTML = [['피킹리스트', code]].concat(l.map(function (o) { return [o.customer, o.vehicle]; })).concat([['ERP 진행상태', '출고완료']])
            .map(function (k) { return '<div class="kv__row"><dt>' + esc(k[0]) + '</dt><dd>' + esc(k[1]) + '</dd></div>'; }).join('');
        });
      });
    };
  };

  /* ========== 출력 ========== */
  P['print'] = function () {
    var printer = D.printers[0], doc = U.params.get('doc') || 'ts', code = U.params.get('code');
    var o = (code && Q.findOut(code)) || D.outbound[0];
    function renderPrinter() { $('#prName').textContent = printer.name; $('#prSub').textContent = printer.model + (printer.on ? ', 연결됨' : ', 연결 안 됨'); }
    renderPrinter();
    $('#prBtn').onclick = function () {
      U.sheet({ title: '프린터 선택', items: D.printers.map(function (p) { return { label: p.name, sub: p.model + (p.on ? ', 연결됨' : ', 꺼져 있음'), icon: 'printer', value: p, current: p === printer }; }) })
        .then(function (p) { if (!p || !p.name) return; if (!p.on) { U.toast(p.name + '에 연결할 수 없습니다. 전원을 확인하세요', 'err'); return; } printer = p; renderPrinter(); });
    };
    var items = o.items.slice(0, 2).map(function (it) { return '<div class="kv__row"><dt>' + esc(it.name) + '</dt><dd class="num">' + it.box + '박스</dd></div>'; }).join('') +
      (o.items.length > 2 ? '<div class="kv__row"><dt>외 ' + (o.items.length - 2) + '품목</dt><dd class="num">' + o.items.slice(2).reduce(function (a, b) { return a + b.box; }, 0) + '박스</dd></div>' : '');
    var veh = vehicleOf(o.vehicle);
    $('#pvTs').innerHTML = '<h3 class="paper__title">거래명세서</h3><p class="paper__no num">No. ' + o.ts + '</p><dl class="kv">' +
      [['공급자', '맑은물에'], ['공급받는자', o.customer], ['출고일', '2024-11-27'], ['배송차량', veh.plate]].map(function (k) { return '<div class="kv__row"><dt>' + k[0] + '</dt><dd>' + esc(k[1]) + '</dd></div>'; }).join('') +
      '</dl><span class="paper__line"></span><dl class="kv">' + items + '</dl><span class="paper__line"></span><dl class="kv"><div class="kv__row"><dt>합계</dt><dd class="num">' + boxes(o) + '박스</dd></div></dl>';
    $('#pvPk').innerHTML = '<h3 class="paper__title">피킹리스트</h3><p class="paper__no num">No. ' + o.pk + '</p><dl class="kv">' +
      [['거래처', o.customer], ['센터', o.center], ['배차', o.round], ['배송차량', veh.plate]].map(function (k) { return '<div class="kv__row"><dt>' + k[0] + '</dt><dd>' + esc(k[1]) + '</dd></div>'; }).join('') +
      '</dl><span class="paper__line"></span><dl class="kv">' + o.items.map(function (it) { return '<div class="kv__row"><dt>' + esc(it.name) + '</dt><dd class="num">' + it.box + '</dd></div>'; }).join('') + '</dl>';
    $('#pvLabel').innerHTML = '<div class="label">' + barsSvg('IN-20261026-0012') + '<span class="label__code">IN-20261026-0012-01</span><span class="label__desc">국산 대두(가공용)<br>맑은물에 냉장창고 60포</span></div>';
    var names = { ts: '거래명세표', pk: '피킹리스트', label: '입고 라벨' };
    var cur = doc;
    $('#docTabs').addEventListener('tabchange', function (e) {
      cur = e.detail.value;
      $('#pvTs').hidden = cur !== 'ts'; $('#pvPk').hidden = cur !== 'pk'; $('#pvLabelWrap').hidden = cur !== 'label';
    });
    U.selectTab($('#docTabs'), doc);
    $('#printBtn').onclick = function () {
      var n = +$('#copyStep input').value;
      U.busy('출력 중', printer.name + ', ' + n + '장', 900).then(function () {
        var h = S.get('printLog', []); h.unshift({ doc: names[cur], no: cur === 'ts' ? o.ts : cur === 'pk' ? o.pk : 'IN-20261026-0012', time: now(), n: n }); S.set('printLog', h);
        window.PdaScan.beep(true); U.toast(names[cur] + ' ' + n + '장을 출력했습니다', 'ok');
      });
    };
    $('#histBtn').onclick = function () {
      var h = S.get('printLog', []).concat(D.printHistory);
      U.sheet({ title: '출력 이력', items: h.map(function (x) { return { label: x.doc + ' ' + x.n + '장', sub: x.no, end: x.time, icon: 'printer' }; }) });
    };
  };

  /* ========== 재고 조회 ========== */
  P['stock'] = function () {
    var ean = U.params.get('ean'), tab = U.params.get('tab') || '원자재';
    if (ean) { var k = Q.findStockByEan(ean); if (!k) { $('#stMain').hidden = true; $('#stFoot').hidden = true; $('#stEmpty').hidden = false; $('#stEmptyCode').textContent = ean; return; } tab = k; }
    function render(kind) {
      var s = Q.stock(kind);
      $('#countBtn').href = 'stock_count.html?kind=' + encodeURIComponent(kind);
      var n = $('#countNote'); n.hidden = !s.count;
      if (s.count) n.innerHTML = icon('count', 'ic--s') + '<span>실사 반영 ' + esc(s.count.at) + ' · ' + esc(s.count.by) + (s.count.diff ? ' · 차이 ' + (s.count.diff > 0 ? '+' : '') + fmt(s.count.diff) + ' (' + esc(s.count.reason) + ')' : ' · 차이 없음') + '</span>';
      var wh = s.locs.reduce(function (a, b) { return a + b.qty; }, 0), ex = s.ext.reduce(function (a, b) { return a + b.qty; }, 0);
      $('#sumHead').innerHTML = '<span class="tag">' + esc(s.cat) + '</span><span>' + esc(s.corp) + '</span><span>규격 ' + esc(s.spec) + '</span>';
      $('#sumTitle').textContent = s.name;
      $('#sumSub').textContent = '바코드 ' + s.ean;
      $('#totalValue').textContent = fmt(wh + ex);
      $('#figWh').textContent = fmt(wh); $('#figEx').textContent = fmt(ex);
      $('#whMeta').innerHTML = '<b>' + fmt(wh) + '</b>';
      $('#exMeta').innerHTML = '<b>' + fmt(ex) + '</b>';
      function lotRow(title, l, i) {
        return '<div class="item"><span class="fifo-rank' + (i === 0 ? ' is-first' : '') + '">' + (i + 1) + '</span><span class="item__body"><span class="item__title"><span>' + esc(title) + '</span>' + (i === 0 ? '<span class="badge badge--fifo">먼저 출고</span>' : '') + '</span><span class="item__sub num">LOT ' + esc(l.lot) + '</span></span><span class="item__end num">' + fmt(l.qty) + '</span></div>';
      }
      $('#whList').innerHTML = s.locs.slice().sort(byLot).map(function (l, i) { return lotRow(l.name, l, i); }).join('');
      $('#exList').innerHTML = s.ext.length ? s.ext.slice().sort(byLot).map(function (l, i) { return lotRow(l.corp + ' ' + l.wh, l, i); }).join('')
        : '<div class="item"><span class="item__body"><span class="item__sub">홀딩스에 보관 중인 재고가 없습니다</span></span></div>';
      $('#stMain').scrollTop = 0;
    }
    $('#stTabs').addEventListener('tabchange', function (e) { render(e.detail.value); });
    U.selectTab($('#stTabs'), tab);
    if (ean) U.toast('상품 바코드 ' + ean, 'ok');
  };

  /* ========== 실사 재고 ========== */
  P['stock_count'] = function () {
    var kind = U.params.get('kind') || '원자재', s = Q.stock(kind);
    if (!s) { U.go('stock.html'); return; }
    var erp = D.stock[kind].locs.map(function (l) { return l.qty; });    // ERP 기준 수량
    var real = s.locs.map(function (l) { return l.qty; });               // 실사 수량 (지난 실사값이 있으면 이어서)
    var active = 0, reason = s.count && s.count.reason || '';
    $('.hd__back').href = 'stock.html?tab=' + encodeURIComponent(kind);
    $('#sumHead').innerHTML = '<span class="tag">' + esc(s.cat) + '</span><span>' + esc(s.corp) + '</span><span>규격 ' + esc(s.spec) + '</span>';
    $('#sumTitle').textContent = s.name;
    $('#sumSub').textContent = '바코드 ' + s.ean;
    $('#countList').innerHTML = s.locs.map(function (l, i) {
      return '<div class="countrow" data-i="' + i + '">' +
        '<button type="button" class="countrow__head" data-pick="' + i + '"><span class="countrow__radio" aria-hidden="true"></span>' +
        '<span class="item__body"><span class="item__title"><span>' + esc(l.name) + '</span></span><span class="item__sub num meta"><span>LOT ' + esc(l.lot) + '</span><span>ERP ' + fmt(erp[i]) + '</span></span></span>' +
        '<span class="countrow__diff num" data-diff="' + i + '"></span></button>' +
        '<div class="stepper" data-stepper data-loc="' + i + '">' +
        '<button type="button" class="stepper__btn" data-step="-1" aria-label="줄이기">' + icon('minus') + '</button>' +
        '<input class="stepper__input" type="number" inputmode="numeric" min="0" max="999999" value="' + real[i] + '" aria-label="' + esc(l.name) + ' 실사 수량">' +
        '<button type="button" class="stepper__btn" data-step="1" aria-label="늘리기">' + icon('plus') + '</button></div></div>';
    }).join('');
    U.initSteppers($('#countList'));
    function sum(a) { return a.reduce(function (x, y) { return x + y; }, 0); }
    function sign(n) { return (n > 0 ? '+' : '') + fmt(n); }
    function refresh() {
      var d = sum(real) - sum(erp);
      $('#figErp').textContent = fmt(sum(erp)); $('#figReal').textContent = fmt(sum(real));
      $('#figDiff').textContent = d ? sign(d) : '0';
      $('#figDiff').className = 'figures__value' + (d < 0 ? ' is-minus' : d > 0 ? ' is-plus' : '');
      real.forEach(function (v, i) { var x = v - erp[i], e = $('[data-diff="' + i + '"]'); e.textContent = x ? sign(x) : '일치'; e.className = 'countrow__diff num' + (x < 0 ? ' is-minus' : x > 0 ? ' is-plus' : ''); });
      $$('.countrow').forEach(function (r, i) { r.classList.toggle('is-active', i === active); });
      $('#reasonSec').hidden = !d && real.every(function (v, i) { return v === erp[i]; });
      $('#saveBtn').textContent = $('#reasonSec').hidden ? '차이 없음으로 저장' : '실사 재고 저장';
    }
    $('#countList').addEventListener('stepchange', function (e) { var st = e.target.closest('[data-loc]'); var i = +st.getAttribute('data-loc'); real[i] = e.detail.value; active = i; refresh(); });
    $('#countList').addEventListener('click', function (e) { var b = e.target.closest('[data-pick]'); if (b) { active = +b.getAttribute('data-pick'); refresh(); } });
    var rt = $('#reasonTabs'); U.initTabs(rt.parentNode);
    $$('[role="tab"]', rt).forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-value') === reason ? 'true' : 'false'); });
    rt.addEventListener('tabchange', function (e) { reason = e.detail.value; $('#reasonErr').hidden = true; });
    refresh();

    // PDA SCAN : 같은 품목 바코드면 고른 위치에 +1
    window.PdaPage = { onScan: function (code) {
      if (code !== s.ean) return false;
      var st = $('[data-loc="' + active + '"]'); st.setValue(real[active] + 1);
      window.PdaScan.beep(true);
      var row = $('.countrow[data-i="' + active + '"]'); row.classList.remove('is-bump'); void row.offsetWidth; row.classList.add('is-bump');
      return true;
    } };

    $('#saveBtn').onclick = function () {
      var d = sum(real) - sum(erp), changed = !$('#reasonSec').hidden;
      if (changed && !reason) { $('#reasonErr').hidden = false; $('#reasonSec').scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
      var now = new Date(), at = (now.getMonth() + 1 + '').padStart(2, '0') + '.' + (now.getDate() + '').padStart(2, '0') + ' ' + (now.getHours() + '').padStart(2, '0') + ':' + (now.getMinutes() + '').padStart(2, '0');
      var all = S.get('stockCount', {}); all[kind] = { qty: real.slice(), diff: d, reason: changed ? reason : '', at: at, by: D.user.name };
      S.set('stockCount', all);
      U.busy('실사 재고 저장 중', 'ERP 재고 조정으로 보냅니다', 700).then(function () {
        U.go('stock.html?tab=' + encodeURIComponent(kind), changed ? '실사 재고를 저장했습니다 (차이 ' + sign(d) + ')' : '실사 결과 ERP 재고와 같습니다');
      });
    };
  };

  document.addEventListener('DOMContentLoaded', function () {
    U = window.PdaUI; D = window.PDA_DATA; Q = window.PdaQuery; S = window.PdaStore;
    $ = U.$; $$ = U.$$; esc = U.esc; fmt = U.fmt; icon = U.icon;
    var page = document.body.getAttribute('data-page');
    if (P[page]) P[page]();
  });
})();
