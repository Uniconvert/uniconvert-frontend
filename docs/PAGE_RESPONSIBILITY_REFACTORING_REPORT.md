# Page Responsibility Refactoring Report

## Before

이번 단계 시작 시점에는 Critical Fix, Async UI, Dialog, Select/Listbox, Props/Type 정리가 완료되어 있었지만, 주요 화면과 Layout에 다음 책임이 한 파일 안에 함께 존재했다.

| 파일 | 현재 책임 | 분리 후보 | 그대로 둘 책임 | 위험도 |
| --- | --- | --- | --- | --- |
| `ReportPage.tsx` | Report Query, 날짜/월 선택, 차트 계산·렌더링, 거래 목록, 이메일 모달, 전송 Toast | 차트, 거래 목록, 이메일 모달 | Query 호출, 선택 상태, 전송 handler, 페이지 조합 | 높음 |
| `ExpenseHistoryPage.tsx` | History Query, 요약 계산, 목록/카드, 기간 선택, 저장 지출 모달, 수정/삭제, 오류/Toast | 요약 영역, 저장 지출 모달 | Query, 선택 상태, API handler, Critical ErrorState | 높음 |
| `SettingsPage.tsx` | 사용자 Query, 프로필 form, 이메일 리포트 설정, 시간 선택, 미리보기, 리포트 전송 | 프로필 영역, 이메일 설정, 미리보기 | Query/API 호출, 저장 handler, Toast, 페이지 조합 | 중간 |
| `DashboardLayout.tsx` | Shell, Navigation, 자산 요약, 예산 모달, 로그아웃 모달, Outlet | 예산 모달, 로그아웃 다이얼로그, Navigation 아이콘 | route 계산, navigation 조합, API orchestration, Outlet | 중간 |

기존 API endpoint와 Request/Response 타입, React Query 구조, `useMutation` 사용 여부는 변경하지 않았다.

## Responsibility Rules

- Page/Layout은 route-level state, 서버 Hook 호출, 핵심 event orchestration, 화면 조합을 담당한다.
- 독립적인 UI 의미와 interaction/state가 있는 영역만 컴포넌트로 분리했다.
- API mutation 자체는 Page에 남겼다. 분리 컴포넌트는 최소 Props와 callback만 받는다.
- 기존 CSS Module을 재사용하고 별도 스타일 복사나 디자인 변경을 하지 않았다.
- 기존 Critical/Async/Dialog/Select/Listbox/Props-Type 계약을 유지했다.

## ReportPage

다음 컴포넌트를 추가했다.

- `ReportBarChart`: 차트와 날짜/월 선택 UI
- `ReportTransactionList`: 거래 목록의 loading/empty/data 분기
- `EmailReportDialog`: 이메일 리포트 요약, 거래 목록, 주간 차트, 전송 action

`ReportPage`에는 Report Query, 선택 날짜/월, 이메일 modal open state, 전송 handler와 페이지 조합만 남겼다. 기존 `useMonthlyReportData`, API endpoint, `ModalShell` 계약은 그대로 사용한다.

## ExpenseHistoryPage

다음 컴포넌트를 추가했다.

- `ExpenseHistorySummary`: 자산 요약, 최근 지출, 월별 차트/카테고리, 저장 지출 요약 카드
- `SavedExpenseDialog`: 월 선택, loading/error/empty/list, 지출명 수정과 삭제 UI

페이지에는 `useExpenseHistoryData`, 월/기간 선택 state, 저장·삭제 handler, Toast, 초기/백그라운드 loading, 전체 실패 ErrorState가 남아 있다. 핵심 API 전체 실패가 Empty로 바뀌지 않는 기존 Critical 동작도 유지했다.

## SettingsPage

다음 컴포넌트를 추가했다.

- `ProfileSettingsSection`: 프로필 이미지, 닉네임/이메일, 저장/취소 UI
- `EmailReportSettingsSection`: 리포트 활성화, 수신 시간, 주기, 저장 UI
- `EmailReportPreview`: 미리보기의 loading/empty/error/data 상태와 전송 action

프로필·이메일 설정의 API 호출과 저장 상태 갱신은 Page에 남겼다. 시간 선택의 바깥 클릭/Escape 처리도 기존 Page-level effect를 유지했다.

## DashboardLayout

다음 컴포넌트를 추가했다.

- `BudgetEditModal`: 예산 입력·슬라이더·저장 UI와 자체 입력 state
- `LogoutDialog`: 로그아웃 확인 UI와 진행 중 action 표시
- `NavigationIcon`: 메뉴 아이콘 SVG 렌더링

Layout은 route 판정, navigation 조합, 자산 요약 조회, 예산 저장, 로그아웃 orchestration, Outlet 배치를 유지한다. 모바일/사이드바 자산 요약의 시각 구조는 변경하지 않았다.

## Components Added

총 11개 UI 컴포넌트를 추가했다.

- Report: `ReportBarChart`, `ReportTransactionList`, `EmailReportDialog`
- Expense History: `ExpenseHistorySummary`, `SavedExpenseDialog`
- Settings: `ProfileSettingsSection`, `EmailReportSettingsSection`, `EmailReportPreview`
- Dashboard Layout: `BudgetEditModal`, `LogoutDialog`, `NavigationIcon`

## Hooks Added

없음. 기존 서버 상태 Hook과 React Query 구조를 변경하지 않았다. 이번 단계의 local UI state도 과도하게 별도 Hook으로 이동하지 않았다.

## Utils Extracted

없음. 기존 currency/category/API utility를 그대로 재사용했고, 이번 단계에서 API·DTO·계산 utility를 새로 만들지 않았다.

## Props Contracts

- 분리 컴포넌트는 화면 전체 Query 객체가 아니라 실제 렌더링에 필요한 값과 callback만 받는다.
- 오류/재시도는 `errorMessage`, `onRetry`로 연결하고, Empty와 Error를 별도 조건으로 유지한다.
- 모달은 `onClose`, `onSave`, `onDelete`, `onConfirm` 등 동작 의미가 드러나는 callback을 사용한다.
- 통화·금액은 기존 domain 모델과 formatting utility를 사용하며 API 계약을 새로 만들지 않았다.
- `Button`, `ModalShell`, `LoadingState`, `EmptyState`, `ErrorState`, `Skeleton`의 기존 Props 계약을 변경하지 않았다.

## Tests Added

- `src/pages/ReportPage/reportComponents.test.tsx` — 거래 목록 상태와 이메일 모달 렌더링 2개
- `src/pages/ExpenseHistoryPage/expenseHistoryComponents.test.tsx` — 요약 Empty/Error/Data, 저장 지출 모달 Error/Empty/Data 4개
- `src/pages/SettingsPage/settingsComponents.test.tsx` — 프로필, 이메일 설정, 미리보기 상태 3개
- `src/layouts/DashboardLayout/dashboardComponents.test.tsx` — 예산 모달, 로그아웃 다이얼로그, NavigationIcon 3개

이번 단계 신규 테스트는 총 **12개**이며 모두 통과했다.

## Full Test Result

- 신규 책임 분리 테스트: **12/12 PASS**
- 전체 Vitest: **20개 파일, 67/67 PASS**
- 기존 55개 테스트와 이전 회귀 테스트는 모두 보존되었고, 신규 테스트가 추가되어 총 개수가 증가했다.

## TypeScript / ESLint / Build

- TypeScript `npx tsc --project tsconfig.app.json --pretty false`: **0 errors**
- ESLint `npm run lint`: **0 errors, 0 warnings**
- Production `npm run build`: **PASS**
- Build 단계에서 API endpoint, Request/Response 계약 변경은 확인되지 않았다.

## Files Added

- `src/pages/ReportPage/ReportBarChart.tsx`
- `src/pages/ReportPage/ReportTransactionList.tsx`
- `src/pages/ReportPage/EmailReportDialog.tsx`
- `src/pages/ReportPage/reportComponents.test.tsx`
- `src/pages/ExpenseHistoryPage/ExpenseHistorySummary.tsx`
- `src/pages/ExpenseHistoryPage/SavedExpenseDialog.tsx`
- `src/pages/ExpenseHistoryPage/expenseHistoryComponents.test.tsx`
- `src/pages/SettingsPage/ProfileSettingsSection.tsx`
- `src/pages/SettingsPage/EmailReportSettingsSection.tsx`
- `src/pages/SettingsPage/EmailReportPreview.tsx`
- `src/pages/SettingsPage/settingsComponents.test.tsx`
- `src/layouts/DashboardLayout/BudgetEditModal.tsx`
- `src/layouts/DashboardLayout/LogoutDialog.tsx`
- `src/layouts/DashboardLayout/NavigationIcon.tsx`
- `src/layouts/DashboardLayout/dashboardComponents.test.tsx`
- `docs/PAGE_RESPONSIBILITY_REFACTORING_REPORT.md`

## Files Modified

- `src/pages/ReportPage/ReportPage.tsx`
- `src/pages/ExpenseHistoryPage/ExpenseHistoryPage.tsx`
- `src/pages/SettingsPage/SettingsPage.tsx`
- `src/layouts/DashboardLayout/DashboardLayout.tsx`

작업 디렉터리에 보이는 Critical/Async/Dialog/Select/Props-Type 관련 기존 변경 파일은 이전 단계에서 이미 존재하던 변경이며, 이번 책임 분리 단계에서 API·Hook·공유 타입을 추가로 변경하지 않았다.

## Remaining Issues

- DashboardLayout의 헤더, 자산 요약, 전체 Navigation markup은 아직 Layout 내부에 남아 있다. 이번 단계에서는 예산/로그아웃처럼 독립적인 interaction 경계만 분리했다.
- Report/ExpenseHistory의 서버 상태 Hook은 기존 구조를 유지하고 있다. React Query 전체 표준화나 `useMutation` 전환은 다음 단계 범위다.
- 실제 브라우저에서의 시각 회귀와 라우트 간 전환은 현재 단위/정적 렌더링 테스트 범위 밖이므로 별도 수동 확인 또는 E2E 환경이 필요하다.

## Ready for Next Step?

**READY WITH ISSUES**

책임 분리 후 전체 테스트, TypeScript, ESLint, Production build가 모두 통과했고 API 계약과 Critical 동작도 유지되어 다음 리팩터링을 시작할 수 있다. 다만 Layout의 남은 조합 책임과 브라우저 시각 회귀 검증 부재는 다음 단계에서 계획적으로 다룰 이슈로 기록한다.
