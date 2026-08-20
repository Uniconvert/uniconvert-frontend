# QHD Layout Scaling Report

## Scope

QHD 이상(`min-width: 2200px`)에서만 UI가 과도하게 작아 보이는 문제를 완화했다. 1920px 이하의 기존 breakpoint와 layout 규칙은 변경하지 않았다.

## Auth

- 내부 `.scene` 전체 composition에 `transform: scale(1.08)`을 적용했다.
- 카드, 장식 이미지, 상대 위치를 하나의 composition으로 함께 확대한다.
- `transform-origin: center`로 가운데 정렬을 유지한다.
- 1920px 이하에서는 기존 크기와 배치를 그대로 사용한다.

## Dashboard

- 전체 Dashboard에 `transform`을 적용하지 않았다.
- QHD 전용 규칙에서 `.scene`의 최대폭 제한을 해제해 viewport 전체 폭을 사용하도록 했다.
- sidebar/navigation 크기는 유지하고, grid의 workspace 열만 추가 가로 공간을 사용한다.
- 넓어진 월별 지출 카드에서는 원 그래프를 왼쪽 열의 중앙에 배치해 과도한 좌측 치우침을 줄였다.
- Report, Memo, Calculator, Settings는 QHD 전용 내부 최대폭과 중앙 정렬을 적용해 왼쪽 상단에 몰리지 않도록 했다.
- 원 그래프는 QHD에서 최대 22rem까지 확대하고 중앙 요약 영역도 함께 조정했다.
- Calculator는 QHD에서 환율 입력 영역과 최근 계산 내역을 2열로 고정해 최근 내역이 오른쪽에 유지되도록 했다.
- Report 차트는 QHD에서 읽기 폭과 차트 높이를 함께 확장했다.
- 기존 `max-width: 1920px` 기준은 QHD breakpoint 밖에서 그대로 유지한다.

## 확대와 확장의 구분

| 영역 | 방식 | 영향 |
| --- | --- | --- |
| Auth | composition 확대 | 카드와 장식의 시각적 크기를 약 8% 확대 |
| Dashboard | scene 최대폭 확장 | workspace가 추가 폭을 사용하고 sidebar는 유지 |

## 검증

- TypeScript: PASS
- ESLint: PASS
- Vitest: 39개 파일 / 133개 테스트 PASS
- Production build: PASS
- Vite 개발 서버의 변경 CSS 모듈 응답 확인

## Viewport 정책

- 1366×768, 1440×900, 1920×1080: 기존 CSS 적용
- 2560×1440: 전체 배경 유지, Auth composition 1.08배, Dashboard scene이 양끝까지 확장

실제 브라우저에서 네 개 viewport의 최종 시각 확인 시에는 강력 새로고침으로 최신 CSS를 확인한다.
