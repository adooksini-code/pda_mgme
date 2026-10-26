# 맑은물에 PDA 입출고 · 퍼블리싱 샘플

기준 해상도: Point Mobile PM67, 360 × 640 (CSS px) 고정, 화면 가운데 배치

## 구조
```
index.html                 화면 목록
login.html                 01 로그인
home.html                  02 통합 스캔 홈
inbound_list.html          03 입고 대기
inbound_reg.html           04 원자재입고 등록
inbound_quality.html       05 원자재 품질검사
inbound_done.html          06 원자재입고 확정 · 라벨 출력
outbound_picking.html      07 출고 · 피킹리스트
outbound_check.html        08 출고 확인 · 상차
print.html                 09 출력
stock.html                 10 재고 조회
test_barcodes.html         테스트 바코드 (PC 화면에 띄워 스캔)
static/
  css/pda_common.css       폰트 · 리셋 · 레이아웃 · 타이포그래피 · 색상 변수
  css/pda_component.css    헤더 · 버튼 · 카드 · 목록 · 입력 · 배지 · 스캔 바
  css/pda_content.css      카메라 스캔 · 알림 · 설명서 · 프로토타입 보조 UI
  js/pda_scan.js           카메라 / PDA 스캐너 / 직접 입력 → 바코드 종류별 화면 이동
  js/pda_ui.js             화면 목록 · 설명서 · 알림 · 화면별 동작
  img/common/logo.svg      맑은물에 로고
  font/                    Pretendard
```

## 확인 방법
- 카메라 스캔은 HTTPS 주소에서만 동작합니다. 폴더째 서버에 올려 확인하세요.
- `.chrome` / `.modal` 영역(설명서 · 화면 목록)은 확인용이며 실제 앱에서는 제외합니다.
- 화면 간 값 전달: `outbound_check.html?code=TS-...&type=ts` 형식

> 공개 저장소용 샘플입니다. 법인명 · 거래처명 · 차량번호 · 제품명 · 재고 수치는 가상 값으로 바꿨습니다.
