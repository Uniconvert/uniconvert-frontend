# React Query / API Refactoring Report

## Before

이번 단계 시작 시점에는 화면별로 서버 상태 관리 방식이 달랐습니다. 아래 표는 실제 호출 코드와 현재 화면 사용처를 기준으로 작성했습니다.

| 기능 | GET 방식 | 변경 방식 | Loading/Error 관리 | 캐시 | Invalidation / refetch | 개선 필요 |
|---|---|---|---|---|---|---|
| Expense Input | 환율은 `useExchangeRateQuery`, 카테고리·예산은 `useEffect` 직접 호출 | 지출 생성·파일 import 이벤트에서 직접 API 호출 | 로컬 `isSaving`, 환율 상태 guard | 환율/일부 API Promise cache | 생성 성공 후 기존 history/recent/report 무효화 | 카테고리·예산 Query, 생성/import Mutation |
| Expense History | `useExpenseHistoryData`의 history/recent/month Query | 삭제·이름 수정은 페이지에서 직접 API 호출 | Query 상태 + Toast | React Query + API cache | `retry()`가 history/recent/month을 다시 조회 | 삭제·수정 Mutation |
| Pots | `usePotsData` Query | create/update/allocate/archive 직접 API 호출 | 로컬 `isSaving` + Toast | React Query | `reloadPots()` | 4개 변경 요청 Mutation |
| Report | 월간 report/expense history Query | 이메일 전송 직접 호출, 날짜별 거래는 `useEffect` 호출 | 페이지 로컬 상태 + ErrorState/Toast | React Query + report API cache | report/expense Query retry | 거래 Query, 전송 Mutation |
| Memo | `useEffect` + 페이지 로컬 `memos` | 수정·삭제 직접 API 호출 | 로컬 loading/error/reload key | 별도 Query cache 없음 | reload key로 재조회 | 목록 Query, 수정·삭제 Mutation |
| Calculator | 환율 Query + quote/history `useEffect` | quote/history 직접 호출 | 로컬 quote/history 상태 | 환율 API Promise cache | quote 성공 후 history 재조회 | quote/history Query |
| Settings | preview Query, email setting `useEffect`, user Query 일부 | profile/email setting/email send 직접 호출 | 로컬 saving/error + Toast | `me` Query 일부 | profile은 local/session 반영 | 세 Mutation과 setting Query |
| Dashboard | budget/user Query 및 자산 요약 조합 | 예산 저장·logout 직접 호출 | Skeleton/Toast + 로컬 상태 | React Query + 환율 API cache | 예산 저장 후 자산 요약/Outlet 갱신 | 예산 저장 Mutation |
| Auth / Onboarding | session/페이지 lifecycle 중심 직접 호출 | 로그인·가입·온보딩 저장 직접 호출 | 페이지별 로컬 상태 | sessionStorage/localStorage | route/session 전환 | 구조 결합도가 높아 안전한 범위만 검토 |

## Server vs Local State Policy

- API GET 결과, `isLoading`, `isFetching`, `error`, `refetch`, stale/cache 상태는 `useQuery`가 소유합니다.
- POST/PUT/PATCH/DELETE와 서버 전송 action은 `useMutation`이 소유하며 `isPending`을 저장 버튼 상태에 연결했습니다.
- dialog open, 선택된 날짜/월, dropdown, 검색어·정렬·페이지, 저장 전 form 값은 기존 `useState`를 유지했습니다.
- Toast, modal 닫기, route 이동, session 저장은 React Query cache에 넣지 않았습니다.
- `src/api/client.ts`와 모든 endpoint, request body, response mapping 계약은 유지했습니다.

## Query Policy

- 기존 화면에서 실제 사용하는 서버 데이터부터 Query로 옮겼습니다.
- `isLoading`은 초기 데이터가 없을 때, `isFetching`은 기존 데이터를 유지한 background refetch 때 사용합니다.
- Report 날짜별 거래 Query는 dialog가 열리고 날짜가 유효할 때만 `enabled` 됩니다.
- Expense History와 Calculator history처럼 진입 시 최신 데이터가 필요한 Query는 기존의 `staleTime: 0`, `refetchOnMount: 'always'` 정책을 보존했습니다.
- 단순한 단일 Query인 categories와 Calculator의 quote/history는 실제 의존 범위가 확인되지 않아 기능별 factory를 추가하지 않고 현재 key를 유지했습니다.

## Mutation Policy

다음 실제 API 호출을 Mutation 계약으로 전환했습니다.

- Expense: `createExpense`, `importExpenses`
- Expense History: `deleteSavedExpense`, `updateSavedExpenseName`
- Pots: `createPot`, `updatePot`, `allocatePotAmount`, `archivePot`
- Report/Settings: `sendEmailReport`
- Settings: `updateMyProfile`, `updateEmailReportSetting`
- Dashboard: `upsertBudget`
- Memo: `deleteExpenseMemos`, `updateExpenseMemo`

Mutation 성공 후에는 기존 코드에서 실제로 수행하던 재조회 또는 현재 화면 데이터 갱신만 유지했습니다. email send, import, 예산·Pot의 다른 화면 요약처럼 영향 관계가 코드만으로 확정되지 않는 경우에는 새 invalidation을 추가하지 않았습니다. POST/DELETE/email send에 대한 자동 retry도 추가하지 않았습니다.

## Query Keys

기능별 factory를 추가했으며, 기존 key의 리소스 범위와 화면 사용을 보존했습니다.

| Factory | 실제 key |
|---|---|
| `expenseKeys` | `['expense-history']`, `['expense-history', yearMonth, range]`, `['recent-expenses']`, `['expenses-for-month', yearMonth]` |
| `reportKeys` | `['monthly-report']`, `['monthly-report', yearMonth]`, `['report-transactions', targetDate]` |
| `memoKeys` | `['expense-memos', 'list', { keyword, sort, page }]` |
| `potKeys` | `['pots']` |
| `budgetKeys` | `['budget', yearMonth]` |
| `userKeys` | `['me']` |
| `emailReportKeys` | `['email-report-preview']`, `['email-report', 'setting']` |
| `exchangeRateKeys` | `['exchange-rate', FROM, TO]` |

Factory로 묶을 실제 cross-query 관계가 확인되지 않은 `['categories']`, `['exchange-quote', ...]`, `['exchange-quote-history', ...]`는 직접 key를 유지했습니다.

## Invalidation Matrix

| Mutation | 성공 후 현재 코드에서 확인된 동기화 |
|---|---|
| Expense create | `reportKeys.all`, `expenseKeys.history`, `expenseKeys.recent` 무효화. 기존 생성 성공 경로의 broad history/report 동기화를 보존했습니다. |
| Expense import | 기존 코드에서 확인된 후속 Query refetch가 없어 추가 invalidation 없음 |
| Expense History delete/name update | `expenseKeys.history`, `expenseKeys.recent`, 현재 선택 월 `expenseKeys.month(...)` 무효화. 기존 `retry()` 범위를 보존했습니다. |
| Memo delete/update | `memoKeys.all` 하위 목록 Query 무효화. 기존 reload key로 현재 목록을 다시 받던 동작과 동일한 범위입니다. |
| Pots create/update/allocate/archive | `potKeys.all`만 무효화. 기존 `reloadPots()`의 실제 대상만 대체했습니다. |
| Profile update | `userKeys.current`에 mutation 응답을 `setQueryData`합니다. 기존 사용자 Query 갱신 동작을 유지했습니다. |
| Email report setting update | `emailReportKeys.setting()`에 mutation 응답을 반영합니다. |
| Report/Settings email send | 현재 화면에서 send 결과로 변경되는 Query가 확인되지 않아 invalidation 없음 |
| Budget update | mutation 응답을 현재 자산 요약에 반영하고 기존 Outlet 갱신을 유지합니다. 다른 Query invalidation은 추가하지 않았습니다. |
| Calculator quote | quote 성공 시 기존 동작대로 현재 history Query만 refetch합니다. |

### Uncertain Dependencies

- Expense 변경이 Dashboard의 예산/자산 요약에 미치는 관계는 현재 `useDashboardAssetSummary`의 별도 계산 API와 직접 연결되어 있지 않아 `budgetKeys`를 임의로 invalidate하지 않았습니다.
- Pot 변경과 예산/자산 summary의 관계도 기존 `reloadPots()` 외의 동기화 코드가 없어 Pot Query만 갱신했습니다.
- Email send가 report preview/history를 변경한다는 현재 코드 근거가 없어 Query 연결을 만들지 않았습니다.
- `importExpenses` 성공 후 어떤 화면 데이터가 즉시 변경되어야 하는지는 기존 후속 refetch가 없어 기존 동작을 유지했습니다.
- 위 관계는 기능 추가가 아니라 다음 단계에서 실제 API 응답과 화면 사용을 확인해야 하는 조사 항목입니다.

## cachedApiRequest Fix

`src/api/cachedRequests.ts`의 실패 Promise 처리만 수정했습니다.

- 요청 Promise가 reject되면 해당 path가 여전히 같은 Promise를 가리킬 때만 cache에서 삭제합니다.
- 성공 요청의 60초 cache TTL과 호출 API는 변경하지 않았습니다.
- race 상황에서 이후 요청이 새 Promise를 넣은 경우 새 요청을 삭제하지 않도록 identity check를 사용했습니다.
- 사용처(`emailReports`, `expenses`의 report category 조회)는 유지했으며 수동 cache 계층을 삭제하지 않았습니다.

## Expense

- 확인된 endpoint는 환율 `GET /exchange-rates/current`, 카테고리 `GET /categories`, 예산/지출 집계 `GET /expenses?...`, 저장 `POST /expenses`, import `POST /expenses/import`입니다.
- `useExpenseInputData`의 category GET, budget GET, 기존 환율 Query를 Query 상태로 정리했습니다.
- `ExpenseInputPage`의 create/import는 Mutation으로 전환했고 Button `isLoading`과 `mutation.isPending`을 연결했습니다.
- 금액 > 0, `rateStatus === 'ready'`, 유효 환율, 저장 중 아님이라는 기존 Critical guard를 유지했습니다.
- create 성공 시 기존에 확인된 report/history/recent 범위만 무효화했습니다.
- `ExpenseHistoryPage`의 history/recent/month Query는 key factory를 사용하고 삭제·이름 수정은 Mutation으로 전환했습니다.
- 핵심 history API 전체 실패 시 ErrorState가 유지되며, 빈 성공 객체로 바꾸지 않았습니다.

## Pots

확인된 endpoint는 목록 `GET /pots?includeArchived=false`, 생성 `POST /pots`, 수정 `PATCH /pots/{id}`, 배정 `POST /pots/{id}/allocations`, archive `PATCH /pots/{id}/archive`입니다. `usePotsData`에 create/update/allocate/archive Mutation을 추가했습니다. 각 성공 시 `potKeys.all`만 무효화하고, 페이지의 Toast, modal 닫기, form 상태와 기존 error/retry UI는 유지했습니다. 예산/자산 summary까지의 연결은 근거가 없어 추가하지 않았습니다.

## Report

- 확인된 endpoint는 `GET /reports/summary`, `GET /reports/categories`, dialog 거래 `GET /expenses?...`, 이메일 전송 `POST /reports/email/send`입니다.
- `useMonthlyReportData`의 report/expense Query가 `reportKeys`/`expenseKeys`를 사용합니다.
- 날짜별 거래 조회는 `useReportTransactions` Query로 옮겼고 email dialog가 열릴 때만 실행합니다.
- Report의 email send는 Mutation으로 전환하고 기존 성공/실패 Toast와 dialog 닫기 동작을 유지했습니다.
- Settings preview도 `emailReportKeys.preview()` Query를 사용합니다.

## Memo

`useMemoData`가 `GET /expenses/memos?...` 목록 Query와 `DELETE /expenses/memos`, `PATCH /expenses/{id}` 수정/삭제 Mutation을 제공합니다. 검색어, 정렬, 페이지, 선택 ID, 편집 dialog는 local state로 남겼고, Mutation 성공 시 `memoKeys.all`만 무효화했습니다.

## Calculator

- 확인된 endpoint는 `GET /exchange-rates/quote`, `GET /exchange-rates/quote/history`이며 통화 pair current rate는 기존 `GET /exchange-rates/current` Query를 사용합니다.
- 입력 금액은 local state로 유지하고 500ms debounce 후 quote Query key를 변경합니다.
- amount가 0이면 quote Query는 `enabled: false`입니다.
- history는 `['exchange-quote-history', 0, 20]` Query로 전환하고 기존 quote 성공 후 history refetch를 유지했습니다.
- 기존 환율 계산 API의 request/response와 API-level exchange-rate cache는 변경하지 않았습니다.

## Settings

- 확인된 endpoint는 profile `GET/PATCH /users/me`, email setting `GET/PUT /users/me/email-report-setting`, preview의 `GET /reports/summary`·`GET /reports/categories`, email send `POST /reports/email/send`입니다.
- `useMyUserQuery`는 profile update Mutation을 제공하고 `userKeys.current`에 응답을 반영합니다.
- `useEmailReportSetting`은 email setting GET Query와 PUT Mutation을 분리합니다.
- preview GET과 email send POST도 각각 Query/Mutation으로 관리합니다.
- 저장 전 nickname, profile image, report cycle/time override는 local state로 유지하고 기존 Toast 및 버튼 동작을 보존했습니다.

## Auth / Onboarding

로그인·회원가입·온보딩 저장은 session 저장과 route guard에 강하게 결합되어 있어 이번 단계에서 Mutation hook으로 강제 이동하지 않았습니다. 현재 직접 호출과 기존 사용자 피드백을 유지하고, 대규모 인증 상태 변경은 별도 단계의 대상으로 남겼습니다.

## Hooks Added

- Query key factories: `budgetKeys`, `emailReportKeys`, `exchangeRateKeys`, `expenseKeys`, `memoKeys`, `potKeys`, `reportKeys`, `userKeys`
- `useMemoData`
- `useEmailReportSetting`
- `useReportTransactions`
- `reactQueryContracts.test.ts` (Query/Mutation 계약 테스트)

## Hooks Updated

- `useExpenseInputData`
- `useExpenseHistoryData`
- `useMonthlyReportData`
- `usePotsData`
- `useBudgetQuery`
- `useExchangeRateQuery`
- `useMyUserQuery`

페이지/레이아웃에서는 Expense Input, Expense History, Pots, Report, Memo, Calculator, Settings, Dashboard의 실제 Mutation 호출과 Query 상태 연결을 갱신했습니다.

## Hooks Removed

없음. 기존 `useExchangeCalculatorData`도 지시대로 삭제하지 않고 유지했습니다.

## Tests Added

- `src/api/cachedRequests.test.ts`: 성공 cache 재사용, 실패 cache 제거 후 retry (2 tests)
- `src/hooks/reactQueryContracts.test.ts`: key 안정성, Query success/error/refetch, disabled Query, Mutation success/error, `isPending`, invalidation, client isolation (6 tests)
- 기존 Expense Input Critical 테스트의 React Query mock에 `useMutation` 최소 계약만 추가했습니다. 기존 assertion과 회귀 시나리오는 변경하지 않았습니다.

## Full Test Result

- 전체 Vitest: 22/22 test files PASS
- 전체 테스트: 75/75 PASS
- Critical 회귀: 7/7 PASS
- `cachedApiRequest` 신규 테스트: 2/2 PASS
- React Query 계약 테스트: 6/6 PASS

## TypeScript / ESLint / Build

- TypeScript (`npx tsc -b`): PASS, error 0
- ESLint (`npm run lint`): PASS, error 0 / warning 0
- Production build (`npm run build`): PASS
- build warning/error: 없음
- 새 라이브러리, endpoint 변경, request/response shape 변경 없음

## Files Added

- `docs/REACT_QUERY_API_REFACTORING_REPORT.md`
- `src/api/cachedRequests.test.ts`
- `src/hooks/budgetKeys.ts`
- `src/hooks/emailReportKeys.ts`
- `src/hooks/exchangeRateKeys.ts`
- `src/hooks/expenseKeys.ts`
- `src/hooks/memoKeys.ts`
- `src/hooks/potKeys.ts`
- `src/hooks/reportKeys.ts`
- `src/hooks/userKeys.ts`
- `src/hooks/useEmailReportSetting.ts`
- `src/hooks/useMemoData.ts`
- `src/hooks/useReportTransactions.ts`
- `src/hooks/reactQueryContracts.test.ts`

## Files Modified

- `src/api/cachedRequests.ts`
- `src/api/expenses.ts` (거래 Query용 기존 mapper export 포함; endpoint는 유지)
- `src/hooks/useBudgetQuery.ts`
- `src/hooks/useExchangeRateQuery.ts`
- `src/hooks/useExpenseHistoryData.ts`
- `src/hooks/useExpenseInputData.ts`
- `src/hooks/useMonthlyReportData.ts`
- `src/hooks/useMyUserQuery.ts`
- `src/hooks/usePotsData.ts`
- `src/layouts/DashboardLayout/DashboardLayout.tsx`
- `src/pages/CalculatorPage/CalculatorPage.tsx`
- `src/pages/ExpenseHistoryPage/ExpenseHistoryPage.tsx`
- `src/pages/ExpenseHistoryPage/SavedExpenseDialog.tsx`
- `src/pages/ExpenseInputPage/ExpenseInputPage.tsx`
- `src/pages/ExpenseInputPage/ExpenseInputPage.critical.test.tsx` (mock contract only)
- `src/pages/MemoPage/MemoPage.tsx`
- `src/pages/PotsPage/PotsPage.tsx`
- `src/pages/ReportPage/ReportPage.tsx`
- `src/pages/SettingsPage/SettingsPage.tsx`
- Settings/Pots/Report의 분리된 presentation component에는 Mutation `isPending` 전달만 추가했습니다.

## Remaining Issues

- `useDashboardAssetSummary`는 예산 Query와 환율 변환을 조합하는 계산 effect가 있어 이번 단계에서 단일 Query로 합치지 않았습니다.
- Auth/Onboarding에는 여전히 session/route와 결합된 직접 API 호출이 있습니다.
- `exchangeRates.ts`와 `budgets.ts`의 API-level Promise cache는 별도 정책이며 이번 `cachedApiRequest` 수정 대상이 아니어서 유지했습니다.
- Calculator/categories의 단순 Query key는 직접 배열로 남아 있습니다. 현재는 다른 화면과 공유되는 의존성이 확인되지 않았습니다.
- Mutation과 다른 summary 화면의 관계는 `Uncertain Dependencies`에 기록한 상태이며, 실제 API 응답/화면 사용을 확인하기 전에는 추가 invalidation하지 않아야 합니다.
- 기존 working tree에는 이전 Critical/Async/Dialog/Select/Props/Page 책임 단계의 변경도 존재합니다. 이번 보고서의 Query/API 목록과 무관한 파일 이동·대규모 구조 변경은 이번 단계에서 수행하지 않았습니다.

## Ready for Next Step?

**READY WITH ISSUES**

현재 범위의 React Query/Mutation 전환, 실패 cache 제거, 회귀 검증은 완료되었습니다. 다만 Auth/Onboarding의 직접 호출, Dashboard의 조합형 계산 effect, API-level 수동 cache, 확정되지 않은 cross-feature invalidation 관계가 남아 있습니다. 다음 단계에서는 이 항목을 실제 호출·응답·화면 사용 근거로 하나씩 확인한 뒤에만 추가 정리를 진행하는 것이 안전합니다.
