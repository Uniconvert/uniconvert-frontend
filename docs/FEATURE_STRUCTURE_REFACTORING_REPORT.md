# Feature Structure Refactoring Report

## Before

기존 구조는 `api/`, `hooks/`, `components/`, `pages/`, `types/`, `constants/`에 기능 파일이 분산되어 있었습니다. 실제 import graph를 기준으로 소유권을 분류했고, 공유되는 API/type/query key는 이동하지 않았습니다.

| 파일/영역 | 현재 위치 | 소속 기능 | 공유 여부 | 이동 후보 | 이유 |
|---|---|---|---|---|---|
| Expense history UI | `pages/ExpenseHistoryPage` 내부 분리 컴포넌트 | Expense | Expense 전용 | 이동 | 페이지는 route adapter로 남기고 UI 소유권을 feature로 이동 |
| Expense history/input hooks | `hooks/useExpenseHistoryData`, `useExpenseInputData` | Expense | Expense 전용 | 이동 | 실제 사용 페이지가 Expense 화면으로 한정됨 |
| Expense API/type | `api/expenses.ts`, `types/expense.ts` | Expense + Pots + Report + Memo + OCR | 공유 | 유지 | 여러 기능이 실제로 import함 |
| `expenseKeys` | `hooks/expenseKeys.ts` | Expense + Report + Expense Input | 공유 | 유지 | Report와 입력 화면에서 같은 history key를 사용함 |
| Report UI | `pages/ReportPage` 내부 분리 컴포넌트 | Report | Report 전용 | 이동 | Report page와 함께만 사용됨 |
| Report query hooks | `hooks/useMonthlyReportData`, `useReportTransactions` | Report | Report 전용 | 이동 | Report route에서만 사용됨 |
| `reportKeys` | `hooks/reportKeys.ts` | Report + Expense Input | 공유 | 유지 | Expense 생성 후 Report key를 실제 invalidate함 |
| Pots API/type/UI/constants/hook | `api/pots`, `types/pot`, `components/pots`, 관련 hook/constant | Pots | Pots 중심 | 이동 | 확인된 실제 사용처가 Pots 기능에 집중됨 |
| Settings 전용 UI/API/type/hook | `pages/SettingsPage`, `api/emailReports`, `types/emailReport` | Settings | Settings 전용 | 이동 | preview/setting 화면에서만 사용됨 |
| `reports.ts`, `users.ts`, `budgets.ts` | `api/` | Report/Settings/Dashboard/Onboarding | 공유 | 유지 | 다른 기능의 실제 API 호출이 존재함 |
| Calculator | `pages/CalculatorPage` 내부 | Calculator | page 결합 | 유지 | 분리 가능한 현재 feature 파일이 없고 직접 Query/UI가 한 페이지에 있음 |
| Auth/Onboarding | `pages/`, `api/`, `auth/session`, routes | Auth/Onboarding | route/session 결합 | 유지 | 이동 시 session/route architecture 변경 위험이 있음 |
| Memo | `pages/MemoPage`, `api/memos`, `types/memo`, 관련 hook | Memo 또는 Report tab | 소유권 불확실 | 유지 | Expense API와 Report navigation 양쪽 관계가 있어 추측 이동하지 않음 |

## Feature Ownership Rules

- 실제 한 기능에서만 사용하는 API, hook, component, type, constant만 feature로 이동했습니다.
- 두 기능 이상에서 실제 import하는 파일은 shared 위치를 유지했습니다.
- 페이지 route와 `AppRouter` 구조는 변경하지 않았습니다. Page는 feature 조합과 route adapter 역할로 남겼습니다.
- public barrel `index.ts`는 import 복잡도를 줄이는 실제 필요가 없어 추가하지 않았습니다.
- 이동 과정에서 endpoint, request/response shape, Query/Mutation 설정, invalidation 범위는 변경하지 않았습니다.
- 향후 기능을 가정한 abstraction이나 새 파일은 만들지 않았습니다.

## Proposed Structure

현재 실제 이동이 완료된 구조는 다음과 같습니다.

```text
src/
├─ features/
│  ├─ expense/
│  │  ├─ components/
│  │  │  ├─ ExpenseHistorySummary.tsx
│  │  │  ├─ SavedExpenseDialog.tsx
│  │  │  └─ expenseHistoryComponents.test.tsx
│  │  ├─ hooks/
│  │  │  ├─ useExpenseHistoryData.ts
│  │  │  └─ useExpenseInputData.ts
│  │  └─ expenseHistory.module.css
│  ├─ report/
│  │  ├─ components/
│  │  │  ├─ EmailReportDialog.tsx
│  │  │  ├─ ReportBarChart.tsx
│  │  │  ├─ ReportTransactionList.tsx
│  │  │  └─ reportComponents.test.tsx
│  │  ├─ hooks/
│  │  │  ├─ useMonthlyReportData.ts
│  │  │  └─ useReportTransactions.ts
│  │  └─ report.module.css
│  ├─ pots/
│  │  ├─ api/pots.ts
│  │  ├─ components/
│  │  │  ├─ AutoSavingsCard/
│  │  │  ├─ BudgetAllocationSummary/
│  │  │  ├─ CreatePotModal/
│  │  │  └─ PotCard/
│  │  ├─ hooks/usePotsData.ts
│  │  ├─ potCategoryOptions.ts
│  │  ├─ potKeys.ts
│  │  ├─ potRepresentativeImages.ts
│  │  └─ types.ts
│  └─ settings/
│     ├─ api/emailReports.ts
│     ├─ components/
│     │  ├─ EmailReportPreview.tsx
│     │  ├─ EmailReportSettingsSection.tsx
│     │  ├─ ProfileSettingsSection.tsx
│     │  └─ settingsComponents.test.tsx
│     ├─ hooks/useEmailReportSetting.ts
│     ├─ emailReportKeys.ts
│     ├─ settings.module.css
│     └─ types/emailReport.ts
├─ pages/                 # route adapters remain here
├─ api/                   # shared API client and cross-feature API wrappers
├─ hooks/                 # shared hooks and cross-feature query keys
├─ components/common/    # existing shared UI
├─ layouts/
├─ types/                 # shared domain/DTO types
├─ utils/
└─ constants/             # only still-shared constants
```

## Expense

Moved Expense-specific history UI, history/input hooks, and history stylesheet into `features/expense`. `ExpenseHistoryPage` and `ExpenseInputPage` remain in `pages/` and now compose the feature modules.

The following were intentionally kept shared because actual imports exist outside Expense:

- `src/api/expenses.ts`: Pots, Report, Memo, OCR and Expense screens use it.
- `src/types/expense.ts`: API, Pots, Report, Memo and pages use the models.
- `src/hooks/expenseKeys.ts`: Report and Expense Input use the same history/recent keys.
- `src/components/common/*`: common UI remains unchanged.

## Report

Moved `EmailReportDialog`, `ReportBarChart`, `ReportTransactionList`, their test, stylesheet, and Report query hooks to `features/report`.

`src/api/reports.ts` and `src/types/report.ts` remain in shared locations because the email send API is also called from Settings and the API layer owns the report response mapping. `reportKeys` remains shared because Expense Input invalidates the existing Report query scope.

## Pots

Moved the Pots-only API wrapper, domain type, query key, hook, constants, and all existing Pots components. `PotsPage` is still the route adapter.

The moved Pots API continues to call shared `api/budgets`, `api/expenses`, and `api/client`; those dependencies were not duplicated or moved into Pots. No budget/asset cross-feature invalidation was introduced.

## Calculator

No new `features/calculator` folder was created. The current Calculator page contains its local amount state, selectors, quote/history Query setup, and page-specific styling, while the only separate calculator hook (`useExchangeCalculatorData`) is currently unused. Creating a wrapper folder or moving that unused hook would add structure without a confirmed runtime boundary, so both remain in their current locations and are recorded for a later cleanup decision.

## Settings

Moved Settings-only preview API, `EmailReportData` type, email setting hook/key, presentation components, and stylesheet to `features/settings`.

`src/api/users.ts` and `src/api/reports.ts` remain shared because profile/user APIs and email send are used across Settings, Onboarding, Report, or session-related code. Settings route and existing profile/email UI contracts are unchanged.

## Auth / Onboarding

No Auth or Onboarding API/session/route files were moved. Existing `components/auth`, `components/onboarding`, `pages/onboarding`, `api/auth`, `api/onboarding`, and `auth/session` boundaries are coupled to route guards and session persistence. Moving them in this step would risk changing architecture rather than only ownership, so they remain documented review candidates.

## Shared Components

The following remain under their existing shared locations:

- `components/common/Button`
- `ModalShell`
- `LoadingState`, `EmptyState`, `ErrorState`, `Skeleton`
- `CurrencyDropdown`, `CurrencyAmountInput`, `TextField`
- `FileUploadModal`, `Toast`, `FloatingMascot`, and existing common primitives
- API client, currency type/utility, API error utility, i18n, layouts, and route infrastructure

No `components/common` → `components/ui` rename was performed.

## API Ownership

### Feature API

- `features/pots/api/pots.ts`: Pots-only CRUD/allocation/archive wrapper.
- `features/settings/api/emailReports.ts`: Settings-only preview aggregation wrapper.

### Shared API

- `api/client.ts`, `api/cachedRequests.ts`: transport/cache infrastructure.
- `api/expenses.ts`: used by Expense, Pots, Report, Memo, and OCR.
- `api/reports.ts`: Report queries and Settings email send.
- `api/users.ts`: user/profile/email setting/session-related calls.
- `api/budgets.ts`, `api/exchangeRates.ts`, `api/categories.ts`, `api/currencies.ts`: multiple screens or shared setup.
- `api/memos.ts`, `api/onboarding.ts`, `api/auth.ts`: kept in current locations pending clearer feature boundaries.

No endpoint or request/response mapping was changed as part of the moves.

## Type Ownership

- Moved to feature: `features/pots/types.ts`, `features/settings/types/emailReport.ts`.
- Kept shared: `types/expense.ts`, `types/report.ts`, `types/memo.ts`, `types/auth.ts`, `types/currency.ts`, and API DTO types that are imported by multiple domains or shared API modules.
- No DTO/domain boundary was redesigned.

## Query Key Ownership

- Moved to feature: `features/pots/potKeys.ts`, `features/settings/emailReportKeys.ts`.
- Kept shared: `hooks/expenseKeys.ts` and `hooks/reportKeys.ts` because actual cross-feature invalidation/use exists; `budgetKeys`, `userKeys`, and `exchangeRateKeys` remain available to shared hooks/layouts.
- `memoKeys` remains in `hooks/` because Memo’s ownership relative to Expense/Report is not confirmed.
- Query key values and invalidation behavior were not changed.

## Files Moved

### Expense

- `pages/ExpenseHistoryPage/ExpenseHistoryPage.module.css` → `features/expense/expenseHistory.module.css`
- `pages/ExpenseHistoryPage/ExpenseHistorySummary.tsx` → `features/expense/components/ExpenseHistorySummary.tsx`
- `pages/ExpenseHistoryPage/SavedExpenseDialog.tsx` → `features/expense/components/SavedExpenseDialog.tsx`
- `pages/ExpenseHistoryPage/expenseHistoryComponents.test.tsx` → `features/expense/components/expenseHistoryComponents.test.tsx`
- `hooks/useExpenseHistoryData.ts` → `features/expense/hooks/useExpenseHistoryData.ts`
- `hooks/useExpenseInputData.ts` → `features/expense/hooks/useExpenseInputData.ts`

### Report

- `pages/ReportPage/ReportPage.module.css` → `features/report/report.module.css`
- `pages/ReportPage/EmailReportDialog.tsx` → `features/report/components/EmailReportDialog.tsx`
- `pages/ReportPage/ReportBarChart.tsx` → `features/report/components/ReportBarChart.tsx`
- `pages/ReportPage/ReportTransactionList.tsx` → `features/report/components/ReportTransactionList.tsx`
- `pages/ReportPage/reportComponents.test.tsx` → `features/report/components/reportComponents.test.tsx`
- `hooks/useMonthlyReportData.ts` → `features/report/hooks/useMonthlyReportData.ts`
- `hooks/useReportTransactions.ts` → `features/report/hooks/useReportTransactions.ts`

### Pots

- `api/pots.ts` → `features/pots/api/pots.ts`
- `types/pot.ts` → `features/pots/types.ts`
- `components/pots/*` → `features/pots/components/*`
- `constants/potCategoryOptions.ts` → `features/pots/potCategoryOptions.ts`
- `constants/potRepresentativeImages.ts` → `features/pots/potRepresentativeImages.ts`
- `hooks/usePotsData.ts` → `features/pots/hooks/usePotsData.ts`
- `hooks/potKeys.ts` → `features/pots/potKeys.ts`

### Settings

- `api/emailReports.ts` → `features/settings/api/emailReports.ts`
- `types/emailReport.ts` → `features/settings/types/emailReport.ts`
- `pages/SettingsPage/SettingsPage.module.css` → `features/settings/settings.module.css`
- `pages/SettingsPage/{EmailReportPreview,EmailReportSettingsSection,ProfileSettingsSection}.tsx` → `features/settings/components/`
- `pages/SettingsPage/settingsComponents.test.tsx` → `features/settings/components/settingsComponents.test.tsx`
- `hooks/useEmailReportSetting.ts` → `features/settings/hooks/useEmailReportSetting.ts`
- `hooks/emailReportKeys.ts` → `features/settings/emailReportKeys.ts`

## Imports Updated

- Route pages now import feature components/hooks through `@/features/...` paths.
- Moved feature files now import shared API/type/utils through `@/api`, `@/types`, `@/utils`, and `@/hooks` paths.
- Moved API/type files use absolute feature/shared paths; no relative imports point back to removed locations.
- Existing critical test mocks were updated only where a moved Expense hook path changed. Assertions and test scenarios were not altered.
- No barrel exports were introduced.

## Circular Dependency Check

- TypeScript typecheck: PASS.
- A source import-graph scan found no new feature → page → feature or feature A ↔ feature B cycle.
- The scan still reports the pre-existing type-only relationship between `components/onboarding/CurrencySelection/currencyOptions.ts` and `CurrencySelection.tsx`. Because the edge is `import type` and Auth/Onboarding was explicitly left in place, it was not changed in this structural step.
- Feature dependencies follow `Page → Feature → Shared/API` for the moved paths. Shared modules do not import the new feature modules.

## Uncertain Ownership

- Memo can be interpreted as an Expense domain feature or as a Report-tab feature. Its API is expense-based, while its route is nested under Report navigation; it was intentionally not moved.
- Calculator has no confirmed reusable feature boundary beyond the page itself; its unused legacy hook remains in `hooks/`.
- `api/reports.ts` is used by Report and Settings, so it remains shared even though most functions are Report-oriented.
- `api/users.ts`, `types/expense.ts`, and `expenseKeys` have multiple actual consumers and were not forced into one feature.
- Auth/Onboarding ownership is coupled to session and route guards and remains unchanged.
- `HomePage`, `AutoSavingsCard`, `useExchangeCalculatorData`, and legacy Google components were not deleted; they remain cleanup candidates only.

## Tests

- No new runtime tests were added; existing component tests moved with their feature owners.
- Expense step: 4 test files, 13/13 tests PASS.
- Report step: 3 test files, 11/11 tests PASS.
- Pots step: 2 test files, 9/9 tests PASS.
- Settings step: 3 test files, 11/11 tests PASS after the moved API import was corrected.
- Full Vitest: 22/22 test files, 75/75 tests PASS.
- Critical Regression, Async UI, Dialog, Select/Listbox, Props/Type, Page Responsibility, and React Query/API tests are included in the full passing suite.

## TypeScript / ESLint / Build

- TypeScript (`npx tsc -b`): PASS, error 0.
- ESLint (`npm run lint`): PASS, error 0 / warning 0.
- Production build (`npm run build`): PASS.
- No endpoint, request/response, Query/Mutation, invalidation, UI design, or dependency package changes were introduced by the moves.

## Remaining Issues

- Memo, Calculator, Auth, and Onboarding ownership remains intentionally unresolved and should be handled only with additional import/runtime evidence.
- Existing unused code was not removed, per scope.
- The existing Onboarding type-only import cycle remains.
- Shared API/type/query-key locations are still broader than a fully feature-local architecture because their cross-feature consumers are real.
- The working tree already contains changes from previous Critical/Async/Dialog/Select/Props/Page/React Query stages; this report distinguishes the feature moves from those pre-existing changes.

## Ready for Cleanup Step?

**READY WITH ISSUES**

The feature structure moves are complete and all verification passes. A Dead Code/Cleanup step can begin, but it should use the `Uncertain Ownership` list as an explicit review queue and must not delete or relocate the unresolved Memo, Calculator, Auth, Onboarding, or legacy files by assumption.
