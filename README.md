# 맑은물에 PDA 입출고 · 퍼블리싱 샘플

기준 해상도: Point Mobile PM67, 360 × 640 (CSS px) 고정, 화면 가운데 배치

## 구조
```
index.html                화면 목록
login.html                로그인 (아이디 · 비밀번호 / 사원증 스캔)
home.html                 통합 스캔 홈
inbound_list.html         입고 대기 (구분별 필터)
inbound_reg.html          입고 등록 (수량, 업체 LOT, 입고상태, 적재 위치 배분)
inbound_quality.html      품질검사 (원자재 · 부자재)
inbound_done.html         입고 확정 · 라벨 출력
outbound_picking.html     출고 · 피킹리스트 (구분별 필터)
outbound_check.html       출고 확인 · 상차
print.html                출력 (거래명세표 · 피킹리스트 · 입고 라벨)
stock.html                재고 조회 (제품 · 원자재 · 부자재)
test_barcodes.html        테스트 바코드
static/css/pda_common.css     폰트, 색상 변수, 리셋, 360×640 레이아웃
static/css/pda_component.css  헤더, 버튼, 스캔 바, 탭, 칩, 목록, 입력, 수량 조절, 배지
static/css/pda_content.css    요약 영역, 화면별 콘텐츠, 시트, 처리 중, 알림, 카메라, 설명서
static/js/pda_data.js         샘플 데이터 (실제 개발 시 ERP API로 교체)
static/js/pda_ui.js           알림, 처리 중, 바텀 시트, 탭, 수량 조절
static/js/pda_scan.js         카메라 / PDA 스캐너 / 직접 입력 → 바코드 종류별 화면 이동
static/js/pda_pages.js        화면별 동작 (body data-page 기준)
static/img/common/logo.svg    맑은물에 로고
static/font/                  Pretendard
```

## 버전 확인
- 로그인 화면 아래, 홈 › [사용자 이름] 메뉴에 `버전 1.0.3 (10.27 11:07 업데이트)` 형식으로 표시됩니다.
- 깃에 새 버전이 올라가면 앱을 열 때 "새 버전이 있습니다" 안내가 뜨고, [지금 업데이트]로 바로 바꿀 수 있습니다.
- 버전 값은 `static/js/pda_version.js`, `version.json`, `sw.js`에 빌드할 때 함께 기록됩니다.

## 확인 방법
- 카메라 스캔은 HTTPS 주소에서만 동작합니다.
- 출고 완료, 입고 확정 결과는 브라우저 세션 동안 유지됩니다. "화면 목록 › 시연 데이터 초기화"로 처음 상태로 돌립니다.
- `.chrome`, `.modal` 영역(설명서, 샘플 바코드, 화면 목록)은 확인용이며 실제 앱에서는 제외합니다.

> 공개 저장소용 샘플입니다. 법인명 · 거래처명 · 차량번호 · 제품명 · 재고 수치는 가상 값으로 바꿨습니다.
