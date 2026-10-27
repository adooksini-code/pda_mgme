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
    var form = $('#loginForm'), err = $('#loginErr');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var empty = $$('.input', form).filter(function (i) { var bad = !i.value.trim(); i.classList.toggle('is-bad', bad); return bad; });
      if (empty.length) { var nm = empty[0].closest('.field').querySelector('label').textContent, last = nm.charCodeAt(nm.length - 1) - 0xAC00;
      err.textContent = nm + (last >= 0 && last % 28 ? '을' : '를') + ' 입력하세요.'; err.hidden = false; empty[0].focus(); return; }
      err.hidden = true;
      U.busy('로그인 중', null, 650).then(function () { U.go('home.html', D.user.name + '님, 오늘도 안전하게 작업하세요'); });
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

  /* ========== 홈 ========== */
  P['home'] = function () {
    var c = Q.counts();
    $('[data-kpi="inWait"]').textContent = c.inWait;
    $('[data-kpi="outWait"]').textContent = c.outWait;
    $('[data-kpi="outDone"]').textContent = c.outDone;
    if (U.params.get('scan') === '1') setTimeout(function () { window.PdaScan.open('route'); }, 300);
    $$('[data-demo-scan]').forEach(function (b) { b.onclick = function () { window.PdaScan.handle(b.getAttribute('data-demo-scan'), 'route'); }; });
    $('#userBtn').onclick = function () {
      U.sheet({ title: D.user.name + ' (' + D.user.id + ')', html: '<p class="item__sub" style="padding:0 20px 8px">' + esc(D.user.corp) + ' 업체코드 ' + esc(D.user.corpCode) + '<br>' + esc(U.verText(U.version)) + '</p>',
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
    });
    function render(menu) {
      var rows = list.filter(function (r) { return menu === '전체' || r.menu === menu; });
      $('#inCount').innerHTML = '<b>' + rows.length + '</b>건';
      $('#inEmpty').hidden = rows.length > 0;
      $('#inList').hidden = rows.length === 0;
      $('#inList').innerHTML = rows.map(function (r) {
        var st = r.received > 0 ? '부분입고' : '입고대기';
        return '<a class="item" href="inbound_reg.html?id=' + encodeURIComponent(r.id) + '"><span class="item__body">' +
          '<span class="item__title"><span class="tag">' + esc(r.cat) + '</span><span>' + esc(r.name) + '</span></span>' +
          '<span class="item__sub meta">' + meta([r.partner, r.vehicle && '차량 ' + r.vehicle]) + '</span>' +
          '<span class="item__foot"><span class="num">발주 ' + fmt(r.ordered) + r.unit + ' / 입고 ' + fmt(r.received) + r.unit + '</span>' + badgeOf(st) + '</span>' +
          '</span>' + icon('chev', 'item__chev') + '</a>';
      }).join('');
    }
    tabs.addEventListener('tabchange', function (e) { render(e.detail.value); });
    render('전체');
    if (U.params.get('tab')) U.selectTab(tabs, U.params.get('tab'));
  };

  /* ========== 입고 등록 ========== */
  P['inbound_reg'] = function () {
    var r = Q.findIn(U.params.get('id')) || Q.inbound()[0];
    if (!r) { $('#regMain').hidden = true; $('#regEmpty').hidden = false; return; }
    var max = remain(r), lotNeed = r.quality;
    var st = { qty: max, lot: '', status: '입고완료', locs: [{ name: D.warehouses[0], qty: max }] };
    var draft = S.get('draft'); if (draft && draft.id === r.id) { st.qty = draft.qty; st.lot = draft.lot; st.locs = draft.locs; st.status = draft.status; }

    $('#hdTitle').textContent = r.menu + ' 등록';
    $('#sumHead').innerHTML = '<span class="tag">' + esc(r.cat) + '</span><span>' + esc(r.partner) + '</span>';
    $('#sumTitle').textContent = r.name;
    $('#sumSub').className = 'summary__sub num meta'; $('#sumSub').innerHTML = meta([r.vehicle && '차량 ' + r.vehicle, r.id]);
    $('#figOrdered').innerHTML = fmt(r.ordered) + '<small>' + r.unit + '</small>';
    $('#figReceived').innerHTML = fmt(r.received) + '<small>' + r.unit + '</small>';
    $$('[data-unit]').forEach(function (e) { e.textContent = r.unit; });
    $('#lotLabel').textContent = lotNeed ? '업체 LOT 번호' : '업체 LOT 번호 (선택)';
    var qtyStep = $('#qtyStep'), qtyIn = $('input', qtyStep);
    qtyIn.max = max; qtyIn.value = st.qty; qtyStep.setValue(st.qty);
    $('#nextBtn').textContent = r.quality ? '품질검사' : '입고 확정';

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
      var lotOk = !lotNeed || !!st.lot || st.status === '반품';
      $('#lotHelp').hidden = lotOk;
      $('#nextBtn').disabled = !(st.qty > 0 && ok && lotOk);
      if (st.status === '반품') $('#nextBtn').textContent = '반품 등록';
      else $('#nextBtn').textContent = r.quality ? '품질검사' : '입고 확정';
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
    function setLot(v) { st.lot = v; var el = $('#lotValue'); el.textContent = v || '탭하여 업체 LOT 바코드 스캔'; el.classList.toggle('is-empty', !v); check(); }
    setLot(st.lot); U.selectTab($('#statusTabs'), st.status); renderLocs();

    $('#nextBtn').onclick = function () {
      S.set('draft', { id: r.id, qty: st.qty, lot: st.lot, locs: st.locs, status: st.status });
      if (st.status === '반품') { U.busy('반품 등록 중', null, 700).then(function () { S.set('draft', null); U.go('inbound_list.html', r.name + ' ' + st.qty + r.unit + ' 반품을 등록했습니다'); }); return; }
      U.busy('저장 중', null, 350).then(function () { location.href = r.quality ? 'inbound_quality.html' : 'inbound_done.html'; });
    };
    window.PdaPage = { onScan: function (code, ctx) {
      var known = /^(TS-|PK-|PO|VH-|IN-|EMP-)/i.test(code) || /^\d{8,14}$/.test(code);
      if (ctx !== 'lot' && known) return false;
      window.PdaScan.beep(true); setLot(code); U.toast('업체 LOT ' + code + ' 입력', 'ok'); return true;
    } };
  };

  /* ========== 품질검사 ========== */
  var SUB_QC = [ { name: '외관', std: '찢김 · 오염 없을 것' }, { name: '인쇄 상태', std: '번짐 · 오탈자 없을 것' }, { name: '규격', std: '발주 규격과 같을 것' },
    { name: '포장상태', std: '파손 · 오염 없을 것' }, { name: '이물', std: '혼입이 없을 것' }, { name: '운반차량 청결', std: '청결할 것' } ];
  function draftItem() {
    var d = S.get('draft'), r = d && Q.findIn(d.id);
    if (!r) { r = Q.inbound()[0]; d = { id: r.id, qty: remain(r), lot: 'LOT1234567', locs: [{ name: D.warehouses[0], qty: remain(r) }], status: '입고완료' }; }
    return { d: d, r: r };
  }
  P['inbound_quality'] = function () {
    var x = draftItem(), r = x.r, d = x.d, photos = 0;
    var items = r.cat === '부자재' ? SUB_QC : D.qualityItems;
    $('#hdTitle').textContent = r.cat + ' 품질검사';
    $('#sumHead').innerHTML = '<span class="tag">' + esc(r.cat) + '</span><span>' + esc(r.partner) + '</span>';
    $('#sumTitle').textContent = r.name;
    $('#sumSub').className = 'summary__sub num meta'; $('#sumSub').innerHTML = meta(['입고 ' + fmt(d.qty) + r.unit, d.lot && '업체 LOT ' + d.lot.replace(/^LOT/i, '')]);
    $('#qcList').innerHTML = items.map(function (q, i) {
      return '<div class="item"><span class="item__body"><span class="item__title"><span>' + esc(q.name) + '</span></span><span class="item__sub">' + esc(q.std) + '</span></span>' +
        '<div class="judge" role="radiogroup" aria-label="' + esc(q.name) + ' 판정" data-q="' + i + '">' +
        '<button type="button" class="judge__btn" role="radio" aria-checked="true" data-v="ok">적합</button>' +
        '<button type="button" class="judge__btn" role="radio" aria-checked="false" data-v="ng">부적합</button></div></div>';
    }).join('');
    function count() { return $$('.judge__btn[data-v="ng"][aria-checked="true"]').length; }
    function update() {
      var n = count();
      $('#qcSum').innerHTML = n ? '<span class="badge badge--bad">부적합 ' + n + '건</span>' : '<span class="badge badge--done">전 항목 적합</span>';
      $('#qcReason').hidden = n === 0;
    }
    $('#qcList').addEventListener('click', function (e) {
      var b = e.target.closest('.judge__btn'); if (!b) return;
      $$('.judge__btn', b.parentNode).forEach(function (x) { x.setAttribute('aria-checked', x === b ? 'true' : 'false'); });
      update();
    });
    $('#photoBtn').onclick = function () { photos++; $('#photoBtn').lastChild.textContent = ' 사진 ' + photos + '장 첨부됨'; U.toast('사진을 첨부했습니다'); };
    $('#doneBtn').onclick = function () {
      var n = count(), reason = $('#reasonIn');
      if (n && !reason.value.trim()) { reason.classList.add('is-bad'); reason.focus(); U.toast('부적합 사유를 입력하세요', 'err'); return; }
      reason.classList.remove('is-bad');
      d.qc = { ng: n, reason: reason.value.trim() }; S.set('draft', d);
      U.busy('판정 저장 중', 'ERP 품질관리에 반영합니다', 700).then(function () { location.href = 'inbound_done.html'; });
    };
    update();
  };

  /* ========== 입고 확정 · 라벨 ========== */
  P['inbound_done'] = function () {
    var x = draftItem(), r = x.r, d = x.d;
    var inNo = 'IN-20261026-' + String(10 + (r.id.length * 7) % 80).padStart(4, '0');
    $('#hdTitle').textContent = r.menu + ' 확정';
    $('#sumHead').innerHTML = '<span class="tag">' + esc(r.cat) + '</span><span>' + esc(r.partner) + '</span>';
    $('#sumTitle').textContent = r.name;
    var qc = !r.quality ? '해당 없음' : (d.qc && d.qc.ng ? '부적합 ' + d.qc.ng + '건' : '전 항목 적합');
    $('#doneKv').innerHTML = [['입고번호', inNo], ['입고수량', fmt(d.qty) + r.unit], ['업체 LOT', d.lot || '없음'], ['품질검사', qc]]
      .map(function (k) { return '<div class="kv__row"><dt>' + k[0] + '</dt><dd class="num">' + esc(k[1]) + '</dd></div>'; }).join('');
    $('#doneLocs').innerHTML = d.locs.map(function (l) { return '<div class="item"><span class="item__lead">' + icon('pin') + '</span><span class="item__body"><span class="item__title"><span>' + esc(l.name) + '</span></span></span><span class="item__end num">' + fmt(l.qty) + r.unit + '</span></div>'; }).join('');
    $('#labelBox').innerHTML = barsSvg(inNo) + '<span class="label__code">' + inNo + '-01</span><span class="label__desc">' + esc(r.name) + '<br>' + esc(d.locs[0].name) + ' ' + fmt(d.locs[0].qty) + r.unit + '</span>';
    var cp = $('#copyStep'); $('input', cp).value = d.locs.length; cp.setValue(d.locs.length);
    $('#confirmBtn').onclick = function () {
      var n = +$('input', cp).value;
      U.busy('입고 확정 중', 'ERP 재고에 반영합니다', 700).then(function () { return U.busy('라벨 출력 중', 'BT 모바일 프린터, ' + n + '장', 900); }).then(function () {
        var done = S.get('inDone', {}); done[r.id] = (done[r.id] || 0) + d.qty; S.set('inDone', done); S.set('draft', null);
        $('#doneMain').hidden = true; $('#doneFoot').hidden = true; $('#doneResult').hidden = false;
        $('#resDesc').textContent = r.name + ' ' + fmt(d.qty) + r.unit + '를 입고했고 라벨 ' + n + '장을 출력했습니다.';
        window.PdaScan.beep(true);
      });
    };
  };

  /* ========== 출고 · 피킹리스트 ========== */
  P['outbound_picking'] = function () {
    var list = Q.outbound(), tabs = $('#outTabs');
    tabs.innerHTML = D.outTypes.map(function (t, i) {
      var n = list.filter(function (o) { return o.type === t; }).length;
      return '<button type="button" class="chip" role="tab" data-value="' + t + '" aria-selected="' + (i === 0) + '">' + t + '<span class="chip__n">' + n + '</span></button>';
    }).join('');
    U.initTabs($('.ph'));
    function render(type) {
      var rows = list.filter(function (o) { return o.type === type; });
      var total = rows.reduce(function (a, o) { return a + boxes(o); }, 0);
      $('#outCount').innerHTML = '<span class="meta"><span><b>' + rows.length + '</b>곳</span><span>' + fmt(total) + '박스</span></span>';
      $('#outEmpty').hidden = rows.length > 0; $('#outEmptyText').textContent = '오늘 ' + type + ' 건이 없습니다';
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
    render(D.outTypes[0]);
  };

  /* ========== 출고 확인 · 상차 ========== */
  P['outbound_check'] = function () {
    var code = U.params.get('code') || D.outbound[0].ts, o = Q.findOut(code);
    if (!o) { $('#ocMain').hidden = true; $('#ocFoot').hidden = true; $('#ocEmpty').hidden = false; $('#ocEmptyCode').textContent = code; return; }
    var isPk = code.toUpperCase().indexOf('PK-') === 0, checked = {}, veh = vehicleOf(o.vehicle);
    function showResult(already) {
      $('#ocMain').hidden = true; $('#ocFoot').hidden = true; $('#ocResult').hidden = false; $('#ocResultFoot').hidden = false;
      $('#resTitle').textContent = already ? '이미 출고 완료된 건입니다' : '출고 완료';
      $('#resDesc').textContent = already ? o.customer + ' 건은 출고완료 상태입니다.' : o.customer + ' ' + boxes(o) + '박스를 ' + veh.plate + '에 상차했습니다.';
      $('#resKv').innerHTML = [[isPk ? '피킹리스트' : '거래명세표', code], ['배송차량', veh.plate], ['ERP 진행상태', '출고완료']].map(function (k) { return '<div class="kv__row"><dt>' + k[0] + '</dt><dd>' + esc(k[1]) + '</dd></div>'; }).join('');
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
    $('#itemList').innerHTML = o.items.map(function (it, i) {
      return '<button type="button" class="item" data-i="' + i + '" aria-pressed="false"><span class="check">' + icon('check') + '</span>' +
        '<span class="item__body"><span class="item__title"><span>' + esc(it.name) + '</span></span>' +
        '<span class="item__sub">소비기한 ' + esc(it.exp) + '</span><span class="item__sub">위치 ' + esc(it.loc) + '</span></span>' +
        '<span class="item__end num">' + it.box + '<small>박스</small></span></button>';
    }).join('');
    function upd() {
      var n = Object.keys(checked).filter(function (k) { return checked[k]; }).length, t = o.items.length;
      $('#itemCount').innerHTML = '<b>' + n + '</b> / ' + t;
      $('#doneBtn').disabled = n < t;
      $('#doneBtn').textContent = n < t ? '품목을 모두 확인하세요' : '출고 완료';
    }
    function setItem(i, v) {
      checked[i] = v; var b = $('#itemList [data-i="' + i + '"]');
      b.classList.toggle('is-checked', v); b.setAttribute('aria-pressed', v ? 'true' : 'false'); upd();
    }
    $('#itemList').addEventListener('click', function (e) { var b = e.target.closest('[data-i]'); if (b) setItem(+b.getAttribute('data-i'), !checked[+b.getAttribute('data-i')]); });
    $('#allBtn').onclick = function () { o.items.forEach(function (_, i) { setItem(i, true); }); };
    $('#doneBtn').onclick = function () {
      U.busy('출고 처리 중', 'ERP 진행상태를 출고완료로 바꿉니다', 900).then(function () {
        var done = S.get('outDone', []); if (done.indexOf(o.ts) < 0) done.push(o.ts); S.set('outDone', done);
        window.PdaScan.beep(true); showResult(false);
      });
    };
    upd();
    window.PdaPage = { onScan: function (c, ctx) {
      if ($('#ocMain').hidden) return false;
      for (var i = 0; i < o.items.length; i++) if (o.items[i].ean === c) {
        window.PdaScan.beep(true); setItem(i, true);
        var b = $('#itemList [data-i="' + i + '"]'); b.classList.add('is-flash'); b.scrollIntoView({ block: 'nearest' });
        setTimeout(function () { b.classList.remove('is-flash'); }, 700);
        U.toast(o.items[i].name + ' 확인', 'ok'); return true;
      }
      if (ctx === 'item') { window.PdaScan.beep(false); U.toast('이 건에 없는 품목입니다: ' + c, 'err'); return true; }
      return false;
    } };
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
    if (ean) { var k = Q.findStockByEan(ean); if (!k) { $('#stMain').hidden = true; $('#stEmpty').hidden = false; $('#stEmptyCode').textContent = ean; return; } tab = k; }
    function render(kind) {
      var s = D.stock[kind];
      var wh = s.locs.reduce(function (a, b) { return a + b.qty; }, 0), ex = s.ext.reduce(function (a, b) { return a + b.qty; }, 0);
      $('#sumHead').innerHTML = '<span class="tag">' + esc(s.cat) + '</span><span>' + esc(s.corp) + '</span><span>규격 ' + esc(s.spec) + '</span>';
      $('#sumTitle').textContent = s.name;
      $('#sumSub').textContent = '바코드 ' + s.ean;
      $('#totalValue').textContent = fmt(wh + ex);
      $('#figWh').textContent = fmt(wh); $('#figEx').textContent = fmt(ex);
      $('#whMeta').innerHTML = '<b>' + fmt(wh) + '</b>';
      $('#exMeta').innerHTML = '<b>' + fmt(ex) + '</b>';
      $('#whList').innerHTML = s.locs.map(function (l) { return '<div class="item"><span class="item__lead">' + icon('pin') + '</span><span class="item__body"><span class="item__title"><span>' + esc(l.name) + '</span></span><span class="item__sub num">LOT ' + esc(l.lot) + '</span></span><span class="item__end num">' + fmt(l.qty) + '</span></div>'; }).join('');
      $('#exList').innerHTML = s.ext.length ? s.ext.map(function (l) { return '<div class="item"><span class="item__body"><span class="item__title"><span>' + esc(l.corp) + '</span></span><span class="item__sub num meta">' + meta([l.wh + ' 창고', 'LOT ' + l.lot]) + '</span></span><span class="item__end num">' + fmt(l.qty) + '</span></div>'; }).join('')
        : '<div class="item"><span class="item__body"><span class="item__sub">홀딩스에 보관 중인 재고가 없습니다</span></span></div>';
      $('#stMain').scrollTop = 0;
    }
    $('#stTabs').addEventListener('tabchange', function (e) { render(e.detail.value); });
    U.selectTab($('#stTabs'), tab);
    if (ean) U.toast('상품 바코드 ' + ean, 'ok');
  };

  document.addEventListener('DOMContentLoaded', function () {
    U = window.PdaUI; D = window.PDA_DATA; Q = window.PdaQuery; S = window.PdaStore;
    $ = U.$; $$ = U.$$; esc = U.esc; fmt = U.fmt; icon = U.icon;
    var page = document.body.getAttribute('data-page');
    if (P[page]) P[page]();
  });
})();
