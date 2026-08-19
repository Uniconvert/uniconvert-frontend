# Dialog Refactoring Report

## Before

이번 단계는 기존 Modal/Dialog 구현을 조사하고 이미 사용 중인 `ModalShell`을 확장해 공통 동작을 보장하는 범위로 진행했습니다. API 계약, React Query 구조, feature 폴더 구조, 페이지 분할은 변경하지 않았습니다.

| 화면/영역 | 기존 구현 | Portal | Overlay close | ESC | Focus trap/restore | 개선 필요 |
| --- | --- | --- | --- | --- | --- | --- |
| DashboardLayout 예산 수정 | `ModalShell` | 공통 | 공통 | 공통 | 없음 | 포커스 관리 |
| DashboardLayout 로그아웃 | `ModalShell` | 공통 | 공통 | 공통 | 없음 | 포커스 관리 |
| Calculator history | `ModalShell` | 공통 | 공통 | 공통 | 없음 | 포커스 관리 |
| ExpenseHistory 저장 내역 | `ModalShell` | 공통 | 공통 | 공통 | 없음 | 포커스 관리 |
| Pots 생성/수정/삭제 | `ModalShell` | 공통 | 공통 | 공통 | 없음 | 포커스 관리 |
| Memo 수정 | `ModalShell` | 공통 | 공통 | 공통 | 없음 | 포커스 관리 |
| File upload | `ModalShell` | 공통 | 공통 | 공통 | 없음 | 포커스 관리 |
| Report 이메일 전송 | 페이지 직접 `createPortal` | 직접 구현 | 직접 구현 | 직접 구현 | 없음 | 공통 Dialog 통합, ARIA, 포커스 |
| Toast | `createPortal` | 직접 구현 | 해당 없음 | 해당 없음 | 해당 없음 | Modal 범위에서 제외 |
| ExpenseInput/Report 날짜 선택 | `role="dialog"` popover | 없음 | 해당 없음 | 별도 dropdown 동작 | 해당 없음 | 비모달 popover로 유지 |
| Onboarding 페이지 | 모달 없음 | 없음 | 없음 | 없음 | 없음 | 이번 단계 대상 없음 |

기존 `ModalShell`은 Portal, overlay close, ESC close, body scroll lock, 기본 `role="dialog"`/`aria-modal`을 제공했지만 초기 포커스가 dialog 컨테이너에만 이동하고 focus trap 및 focus restore가 없었습니다. Report 이메일 모달은 같은 동작을 페이지 안에서 별도로 구현하고 있어 접근성 계약이 달랐습니다.

## Dialog Contract

기존 `ModalShell`을 유지하면서 다음 계약을 추가했습니다.

- 열릴 때 첫 번째 활성화 가능한 요소로 포커스를 이동하고, 대상이 없으면 dialog 컨테이너에 포커스를 둡니다.
- `Tab`/`Shift+Tab`은 dialog 내부의 마지막/첫 번째 활성화 요소에서 순환합니다.
- `Escape`는 현재 dialog의 `onClose`를 호출합니다.
- overlay는 backdrop 자체를 누른 경우에만 닫힙니다.
- 열릴 때 `document.body` 스크롤을 잠그고, 닫힐 때 이전 값을 복원합니다.
- 닫힐 때 열기 직전의 연결된 요소로 포커스를 복원합니다.
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby`를 항상 제공하고, `description`이 있으면 `aria-describedby`를 제공합니다.
- 기존 화면의 시각적 헤더를 보존할 수 있도록 `showHeader`, `backdropClassName`, `shellClassName`, `dialogClassName`, `bodyClassName`을 추가했습니다.

## Accessibility

`ModalShell`의 기본 dialog semantics를 모든 기존 사용처가 공유하게 되었고, Report 이메일 모달에도 숨김 제목을 제공해 시각적 디자인을 변경하지 않고 이름을 부여했습니다. 닫기 동작은 기존 공통 `Button`/`button` 요소와 키보드 동작을 유지합니다.

## Focus Management

`dialogBehavior.ts`에 활성화 요소 조회, 초기 포커스, 키보드 포커스 순환 로직을 분리했습니다. 이 로직은 `ModalShell`에서 직접 사용되며, 포커스 가능한 요소가 없는 경우에도 dialog가 키보드 포커스 대상이 되도록 처리합니다.

## Keyboard Interaction

기존 ModalShell 사용처의 ESC 동작을 공통 처리로 유지했고, Report 이메일 모달의 페이지별 ESC listener를 제거했습니다. Tab 순환은 dialog 경계를 벗어나지 않도록 합니다. 날짜 선택 popover의 별도 keyboard 동작은 모달이 아니므로 변경하지 않았습니다.

## Scroll Lock

공통 `ModalShell`이 열릴 때 기존 `body.style.overflow`를 저장하고 `hidden`으로 설정하며, unmount 시 원래 값을 복원합니다. Report 이메일 모달의 중복 scroll-lock effect는 제거했습니다.

## Components Updated

- `ModalShell`: 공통 Props 확장, ARIA 연결, 초기 포커스, focus trap, focus restore, scroll lock 계약 강화
- `dialogBehavior`: Dialog 키보드/포커스 순수 동작 분리
- `ModalShell.module.css`: 설명 텍스트와 시각적으로 숨긴 제목 스타일 추가

## Pages Updated

- `ReportPage`: 직접 `createPortal`로 렌더링하던 이메일 모달을 `ModalShell`로 통합
- 기존 DashboardLayout, Calculator, ExpenseHistory, Pots, Memo, FileUpload 모달은 API 변경 없이 확장된 `ModalShell` 동작을 자동으로 공유

Report 이메일 모달은 기존 전용 gradient, illustration, 내부 카드, 버튼 스타일을 유지하기 위해 `backdropClassName`, `shellClassName`, `dialogClassName`, `bodyClassName`만 사용했습니다. 이메일 전송 API와 일일 지출 조회 API는 변경하지 않았습니다.

## Tests Added

`src/components/common/ModalShell/ModalShell.test.tsx`에 다음 4개 행동 테스트를 추가했습니다.

- dialog semantics, title, description, close action 렌더링
- 첫 interactive element 초기 포커스
- forward/reverse Tab focus trap
- Escape close 및 기본 동작 방지

## Full Test Result

- Dialog tests: 4/4 PASS
- Critical regression tests: 7/7 PASS
- 전체 Vitest: 11개 파일, 39/39 PASS

## TypeScript / ESLint / Build

- TypeScript (`tsc --project tsconfig.app.json`): 오류 0
- ESLint: error 0, warning 0
- Production build: PASS
- Build 시 애플리케이션 warning/error 없음 (플러그인 timing 안내만 출력)

## Files Added

- `src/components/common/ModalShell/dialogBehavior.ts`
- `src/components/common/ModalShell/ModalShell.test.tsx`
- `docs/DIALOG_REFACTORING_REPORT.md`

## Files Modified

이번 Dialog 단계에서 직접 수정한 파일은 다음과 같습니다.

- `src/components/common/ModalShell/ModalShell.tsx`
- `src/components/common/ModalShell/ModalShell.module.css`
- `src/pages/ReportPage/ReportPage.tsx`
- `src/pages/ReportPage/ReportPage.module.css`

작업 디렉터리에는 앞선 Critical Fix 및 Async UI 단계의 변경 파일도 계속 존재하며, 이번 단계에서 되돌리거나 재구성하지 않았습니다.

## Remaining Issues

- 현재 테스트 환경에는 browser-level `jsdom`/사용자 이벤트 테스트 도구가 없어 실제 브라우저의 focus restore와 scroll lock을 통합 렌더링으로 검증하지 못했습니다. 순수 Dialog 동작과 SSR 접근성 마크업은 검증했습니다.
- 날짜 선택 popover와 Toast Portal은 모달이 아니므로 이번 공통 Dialog 계약에 포함하지 않았습니다.
- 여러 Dialog를 동시에 중첩하는 정책과 z-index 스택 관리는 별도 요구사항으로 남아 있습니다.

## Ready for Next Step?

READY WITH ISSUES

모든 기존 테스트, Critical 회귀 테스트, TypeScript, ESLint, Production build가 통과했고 ModalShell 기반 통합이 완료되어 다음 리팩터링 단계로 진행할 수 있습니다. 다만 실제 브라우저 포커스 회귀를 보강하려면 향후 browser-level 테스트 환경을 추가하는 것이 안전합니다.
