/* ==================================================
   맑은물에 PDA · 서비스 워커
   - 앱 파일을 미리 저장해 두고 오프라인에서도 열리게 합니다.
   - 화면(HTML)은 네트워크 우선, 그 밖의 파일은 저장본 우선입니다.
   - 파일을 바꾸면 VERSION 값을 올려 주세요.
================================================== */
var VERSION = 'pda-v1.0.1';
var FILES = [
  './', './index.html', './login.html', './home.html', './inbound_list.html', './inbound_reg.html', './inbound_quality.html', './inbound_done.html',
  './outbound_picking.html', './outbound_check.html', './print.html', './stock.html', './test_barcodes.html', './manifest.webmanifest',
  './static/css/pda_common.css', './static/css/pda_component.css', './static/css/pda_content.css',
  './static/js/pda_data.js', './static/js/pda_ui.js', './static/js/pda_scan.js', './static/js/pda_pages.js',
  './static/img/common/logo.svg', './static/img/pwa/icon-192.png', './static/img/pwa/icon-512.png',
  './static/font/Pretendard-Regular.woff2', './static/font/Pretendard-Bold.woff2'
];
var CDN = 'https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js';

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) {
    return c.addAll(FILES).then(function () { return c.add(new Request(CDN, { mode: 'cors' })).catch(function () {}); });
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin && req.url !== CDN) return;
  if (req.mode === 'navigate') {
    // 화면: 네트워크 우선 → 실패하면 저장본 (주소 뒤 ?code= 같은 값은 무시하고 찾기)
    e.respondWith(fetch(req).then(function (res) {
      var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(url.pathname, copy); }); return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (r) { return r || caches.match('./login.html'); });
    }));
    return;
  }
  // 그 밖의 파일: 저장본 우선
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(function (r) {
    return r || fetch(req).then(function (res) {
      if (res.ok) { var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(req, copy); }); }
      return res;
    });
  }));
});
