/* ==================================================
   맑은물에 PDA · 샘플 데이터
   실제 개발 시 이 파일 대신 ERP API 응답을 사용합니다.
================================================== */
window.PDA_DATA = {
  user: { name: '홍길동', id: 'hong01', corp: '맑은물에', corpCode: 'MGM001' },
  today: '10.26',

  /* 입고 대기 (입출고정보 관리 › 원자재입고 · 부자재입고 · 완제품(OEM)입고 · 계열사 완제품 입고) */
  inbound: [
    { id: 'PO12093719874', cat: '원자재', menu: '원자재입고', name: '국산 대두(가공용)', spec: '20kg', unit: '포', partner: '㈜대한농산', ordered: 100, received: 0, quality: true },
    { id: 'PO12093719880', cat: '원자재', menu: '원자재입고', name: '황산칼슘', spec: '25kg', unit: '포', partner: '㈜해양소재', ordered: 40, received: 20, quality: true },
    { id: 'PO12093719902', cat: '부자재', menu: '부자재입고', name: '두부 포장필름 300g용', spec: '1롤', unit: '롤', partner: '㈜그린팩', ordered: 50, received: 0, quality: true },
    { id: 'PO12093719915', cat: '부자재', menu: '부자재입고', name: '두부 트레이 300g', spec: '1,000개', unit: '박스', partner: '㈜그린팩', ordered: 30, received: 0, quality: true },
    { id: 'PO12093719930', cat: '완제품(OEM)', menu: '완제품(OEM)입고', name: '국산콩 순두부 350g', spec: '12입', unit: '박스', partner: '㈜바른식품', ordered: 80, received: 0, quality: false },
    { id: 'VH-20261026-2058', cat: '계열사 완제품', menu: '계열사 완제품 입고', name: '국산콩 두부 300g 외 3건', spec: '차량 1대', unit: '박스', partner: '가나식품', vehicle: '12가3456', ordered: 96, received: 0, quality: false }
  ],

  warehouses: ['맑은물에 냉장창고', '맑은물에 상온창고', '샘플홀딩스 물류센터 냉장창고'],

  /* 원자재 품질검사(육안) 항목 · 품질 정보관리 › 원자재 품질관리 */
  qualityItems: [
    { name: '성상', std: '황색 원형, 곰팡이 · 이물 없을 것' },
    { name: '이물', std: '혼입이 없을 것' },
    { name: '구분관리증명서', std: '증명서 · 원산지 증명서 확인' },
    { name: '병충해립', std: '없을 것' },
    { name: '포장상태', std: '파손 · 오염 없을 것' },
    { name: '운반차량 청결', std: '청결할 것' }
  ],

  vehicles: [
    { plate: '12가3456', driver: '김기사', car: '1톤 냉장' },
    { plate: '34나5678', driver: '이기사', car: '2.5톤 냉장' },
    { plate: '56다7890', driver: '박기사', car: '1톤 냉장' },
    { plate: '거래처 자차', driver: '거래처', car: '직접 수령' }
  ],

  /* 출고 (주문정보 관리 › 주문 출고 · 홀딩스 출고, 입출고정보 관리 › 원자재출고 등) */
  outbound: [
    { ts: 'TS-20241127-0031', pk: 'PK-20241127-01', type: '주문 출고', customer: 'A유통 인천센터', center: '수도권남부', round: '1배차 05시', vehicle: '12가3456', status: '출고대기',
      items: [
        { name: '국산콩 두부 300g', ean: '8801234560016', box: 11, exp: '24.11.30', loc: '맑은물에 6 · 홀딩스 5' },
        { name: '단단한 큰두부 1kg', ean: '8801234560023', box: 8, exp: '24.11.29', loc: '맑은물에 8' },
        { name: '부침용 두부 300g', ean: '8801234560030', box: 6, exp: '24.11.29', loc: '맑은물에 4 · 홀딩스 2' },
        { name: '국산콩 촌두부 1kg', ean: '8801234560047', box: 5, exp: '24.11.28', loc: '맑은물에 5' }
      ] },
    { ts: 'TS-20241127-0032', pk: 'PK-20241127-02', type: '주문 출고', customer: 'B식품(주)', center: '센터B', round: '1배차 05시', vehicle: '34나5678', status: '피킹중',
      items: [
        { name: '국산콩 두부 300g', ean: '8801234560016', box: 40, exp: '24.11.30', loc: '맑은물에 40' },
        { name: '단단한 큰두부 1kg', ean: '8801234560023', box: 24, exp: '24.11.29', loc: '맑은물에 24' },
        { name: '국산콩 촌두부 1kg', ean: '8801234560047', box: 20, exp: '24.11.28', loc: '홀딩스 20' }
      ] },
    { ts: 'TS-20241127-0033', pk: 'PK-20241127-03', type: '주문 출고', customer: 'C홈쇼핑(주)', center: '센터A', round: '2배차 07시', vehicle: '거래처 자차', status: '출고완료',
      items: [
        { name: '부침용 두부 300g', ean: '8801234560030', box: 55, exp: '24.11.29', loc: '맑은물에 55' }
      ] },
    { ts: 'TS-20241127-0040', pk: 'PK-20241127-04', type: '홀딩스 출고', customer: '샘플홀딩스', center: '샘플홀딩스 물류센터', round: '2배차 07시', vehicle: '56다7890', status: '출고대기',
      items: [
        { name: '국산콩 두부 300g', ean: '8801234560016', box: 30, exp: '24.11.30', loc: '맑은물에 30' },
        { name: '국산콩 촌두부 1kg', ean: '8801234560047', box: 12, exp: '24.11.28', loc: '맑은물에 12' }
      ] },
    { ts: 'TS-20241127-0051', pk: 'PK-20241127-05', type: '원자재출고', customer: '가나식품 생산동', center: '원료 투입', round: '수시', vehicle: '거래처 자차', status: '출고대기',
      items: [
        { name: '국산 대두(가공용)', ean: '8809876543206', box: 20, exp: '25.10.20', loc: '맑은물에 상온 20' },
        { name: '황산칼슘', ean: '8809876543213', box: 4, exp: '27.07.27', loc: '맑은물에 상온 4' }
      ] }
  ],
  outTypes: ['주문 출고', '홀딩스 출고', '원자재출고', '부자재출고', '계열사 완제품출고', '기타출고(환·반품)'],

  /* 재고 (재고정보 관리 › 제품 · 원자재 · 부자재 재고현황) */
  stock: {
    '제품': { ean: '8801234560016', cat: '두부', corp: '맑은물에', spec: '300g', name: '국산콩 두부 300g',
      locs: [ { name: '맑은물에 냉장창고', lot: '261026', qty: 820 }, { name: '맑은물에 냉장창고 2', lot: '261025', qty: 300 } ],
      ext:  [ { corp: '샘플홀딩스', wh: '샘플홀딩스 물류센터', lot: '261025', qty: 420 } ] },
    '원자재': { ean: '8809876543213', cat: '응고제', corp: '가나식품', spec: '1.00', name: '황산칼슘',
      locs: [ { name: '가나식품 냉장창고', lot: '261021', qty: 2000 }, { name: '가나식품 상온창고', lot: '261013', qty: 1000 } ],
      ext:  [ { corp: '맑은물에', wh: '맑은물에', lot: '261021', qty: 1500 }, { corp: '다라식품', wh: '다라식품', lot: '270727', qty: 2000 },
              { corp: '다라식품', wh: '다라식품', lot: '260727', qty: 500 }, { corp: '마바식품', wh: '마바식품', lot: '261013', qty: 2000 } ] },
    '부자재': { ean: '8807777000011', cat: '포장재', corp: '맑은물에', spec: '1롤', name: '두부 포장필름 300g용',
      locs: [ { name: '맑은물에 상온창고', lot: '261001', qty: 64 } ],
      ext:  [] }
  },

  printers: [ { name: 'BT 모바일 프린터', model: 'ZQ320', on: true }, { name: '사무실 라벨 프린터', model: 'ZT230', on: false } ],
  printHistory: [ { doc: '거래명세표', no: 'TS-20241127-0033', time: '07:12', n: 2 }, { doc: '피킹리스트', no: 'PK-20241127-01', time: '05:40', n: 1 }, { doc: '입고 라벨', no: 'IN-20261025-0004', time: '어제 16:20', n: 4 } ]
};

/* 화면 사이에 유지되는 상태 (시연용 · 세션 동안만 유지) */
window.PdaStore = (function () {
  var KEY = 'pda_state_v2';
  function read() { try { return JSON.parse(sessionStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function write(s) { try { sessionStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  return {
    get: function (k, d) { var s = read(); return k in s ? s[k] : d; },
    set: function (k, v) { var s = read(); s[k] = v; write(s); },
    reset: function () { write({}); }
  };
})();

/* 상태가 반영된 조회 함수 */
window.PdaQuery = (function () {
  var D = window.PDA_DATA, S = window.PdaStore;
  function outStatus(o) { var done = S.get('outDone', []); return done.indexOf(o.ts) >= 0 ? '출고완료' : o.status; }
  function inboundList() {
    var done = S.get('inDone', {});
    return D.inbound.filter(function (r) { return !done[r.id] || done[r.id] < r.ordered - r.received; })
      .map(function (r) { var c = Object.assign({}, r); if (done[r.id]) { c.received = r.received + done[r.id]; } return c; });
  }
  return {
    outStatus: outStatus,
    outbound: function () { return D.outbound.map(function (o) { return Object.assign({}, o, { status: outStatus(o) }); }); },
    findOut: function (code) { code = String(code || '').toUpperCase(); for (var i = 0; i < D.outbound.length; i++) { var o = D.outbound[i]; if (o.ts === code || o.pk === code) return Object.assign({}, o, { status: outStatus(o) }); } return null; },
    inbound: inboundList,
    findIn: function (id) { var l = inboundList(); for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return null; },
    findStockByEan: function (ean) { for (var k in D.stock) if (D.stock[k].ean === ean) return k; return null; },
    counts: function () {
      var o = this.outbound();
      return { inWait: inboundList().length, outWait: o.filter(function (x) { return x.status !== '출고완료'; }).length, outDone: o.filter(function (x) { return x.status === '출고완료'; }).length };
    }
  };
})();
