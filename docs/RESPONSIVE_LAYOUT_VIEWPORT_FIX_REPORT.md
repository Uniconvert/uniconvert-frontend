# Responsive Layout Viewport Fix Report

## 목적

2560×1440 화면에서 Auth 및 로그인 후 Dashboard 배경이 1920px에서 멈추고 좌우에 빈 공간이 생기는 원인을 확인하고, 기존 1920px 기준 콘텐츠 배치를 유지하면서 외부 배경만 viewport 전체를 사용하도록 수정했다.

## 원인

- `#root`에는 `max-width` 제한이 없었다.
- Auth의 `.layout`과 Dashboard의 `.layout`에 `max-width: 1920px`, `width: 100%`, `margin: 0 auto`가 함께 적용되어 있었다.
- 배경도 동일한 `.layout` 요소에 적용되어 있었기 때문에, 2560px viewport에서 배경 영역 자체가 1920px로 제한됐다.
- 결과적으로 `(2560 - 1920) / 2 = 320px`씩 좌우 여백이 발생했다.

## 적용 내용

### Auth

- 외부 `.layout`을 viewport 레벨 컨테이너로 변경했다.
  - `width: 100%`
  - `min-height: 100svh`
  - 기존 gradient background 유지
- 기존 1920px 콘텐츠 기준은 내부 `.scene`으로 이동했다.
  - `max-width: 1920px`
  - `margin: 0 auto`
- 모바일 padding에 맞춰 `.scene`의 최소 높이를 유지했다.

### Dashboard

- 외부 `.layout`이 viewport 전체 배경과 최소 높이를 담당하도록 분리했다.
- 기존 grid, sidebar, topbar, workspace 배치는 내부 `.scene`에 유지했다.
- 기존 반응형 breakpoint가 `.layout`이 아니라 `.scene`에 적용되도록 선택자를 조정했다.
- Dashboard 콘텐츠의 `max-width: 1920px`는 의도적으로 유지했다.

## 변경 파일

이번 viewport 수정과 직접 관련된 파일은 다음과 같다.

| 상태 | 파일 | 변경 내용 |
| --- | --- | --- |
| 수정 | `src/layouts/AuthLayout/AuthLayout.tsx` | Outlet을 내부 `scene` 컨테이너로 감쌈 |
| 수정 | `src/layouts/AuthLayout/AuthLayout.module.css` | viewport 레벨 layout과 1920px scene 분리 |
| 추가 | `src/layouts/AuthLayout/AuthLayout.test.tsx` | layout/scene 래퍼 구조 회귀 테스트 |
| 수정 | `src/layouts/DashboardLayout/DashboardLayout.tsx` | Dashboard 전체 콘텐츠를 내부 `scene`으로 감쌈 |
| 수정 | `src/layouts/DashboardLayout/DashboardLayout.module.css` | 외부 배경과 1920px 콘텐츠 scene 분리, breakpoint 대상 조정 |
| 추가 | `docs/RESPONSIVE_LAYOUT_VIEWPORT_FIX_REPORT.md` | 이번 수정 보고서 |

작업 트리에 있던 PWA/오프라인 계산기 관련 변경 파일은 이번 viewport 수정에 포함하지 않았고, 내용도 변경하지 않았다.

## 기대 동작

| Viewport | 배경 | 콘텐츠 |
| --- | --- | --- |
| 1366×768 | 전체 폭 | 기존 반응형 유지 |
| 1440×900 | 전체 폭 | 기존 반응형 유지 |
| 1920×1080 | 전체 폭 | 기존 1920 기준 유지 |
| 2560×1440 | 2560px 전체 폭 | 중앙 1920px scene 유지 |

따라서 이번 수정은 **배경 좌우 빈 공간 문제**를 해결하며, 콘텐츠 자체는 요청된 1920px 기준을 유지한다. 콘텐츠까지 2560px 전체로 확장하려면 내부 `.scene`의 `max-width: 1920px` 정책을 별도로 변경해야 한다.

## 검증 결과

- TypeScript typecheck: PASS
- ESLint: PASS (error/warning 없음)
- Vitest: PASS (39개 파일, 133개 테스트)
- Production build: PASS
- `git diff --check`: PASS
- 로컬 Vite 응답: `http://localhost:5173/` 200 OK

실제 1366/1440/1920/2560 viewport의 최종 시각 확인은 브라우저에서 새로고침 후 수동 확인이 필요하다. 기존 Service Worker가 이전 CSS를 제공하는 경우에는 강력 새로고침 또는 Service Worker 해제 후 확인해야 한다.
