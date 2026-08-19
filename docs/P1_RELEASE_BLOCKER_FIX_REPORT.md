# P1 Release Blocker Fix Report

- Scope: Q-01 through Q-04 only
- Review rule: no new endpoint, request/response contract, feature move, library, or Q-05+ issue work
- Existing working-tree changes from earlier refactoring stages were preserved

## Q-01 Expense Save Recovery

### Before

`ExpenseInputPage` handled `createExpenseMutation.mutateAsync()` and the follow-up `refetchBudget()` in one `try/catch`. A successful expense create followed by a budget refresh failure therefore showed the save-error toast and left the form values in place.

### Fix

- The form is cleared immediately after the create mutation succeeds.
- Budget refresh runs in its own `try/catch` after the success feedback.
- Refresh failure uses a non-blocking `info` Toast and cannot reclassify the already-successful expense create as a save failure.
- The submit handler still guards amount, pending mutation, budget readiness, and exchange-rate readiness.

### Regression test

Added a test for `create succeeds → budget refetch fails` that verifies:

- create is called once;
- budget refresh is called once;
- amount, merchant, and memo are cleared;
- success feedback is retained;
- refresh feedback is separate `info` feedback;
- no save-error feedback is emitted.

## Q-02 Budget Readiness

### Before

When the budget query had no data, `emptyBudgetSummary` supplied `KRW`. The exchange-rate query could then become ready against that fallback, and the save guard did not know whether the real budget/home currency was ready.

### Fix

- Added the explicit hook-level `BudgetStatus`: `loading | ready | error`.
- Exchange-rate lookup now receives `budgetQuery.data?.homeCurrency` only; no rate request is started from the fallback currency while budget data is absent.
- The displayed rate, conversion currency, usage, and remaining amount use unavailable placeholders until budget data is ready.
- Submit guards require both `budgetStatus === 'ready'` and the existing valid exchange-rate conditions.
- Budget errors have a budget-specific retry action and are not presented as exchange-rate errors.
- Existing fallback data remains a UI-safe empty shape, but it is no longer a calculation or save source of truth.

### Regression tests

Added coverage for:

- budget loading blocks save and does not use fallback KRW;
- budget error blocks readiness;
- ready non-KRW home currency is passed to the exchange-rate query;
- page-level ready/non-ready save behavior remains enforced.

## Q-03 Mobile Budget Summary

### Before

`DashboardLayout` rendered a hard-coded `0%` usage and displayed the monthly budget total as if it were the remaining budget on `/home/expenses`.

### Fix

- The dashboard observes the existing Expense History React Query cache using the existing `expenseKeys.historyFor(yearMonth, 'day')` key.
- The observer is `enabled: false`; `ExpenseHistoryPage` remains the owner of the active request, so no new API request or endpoint was added.
- When the existing cache contains data, the summary uses its actual `budgetUsagePercent` and `remainingBudgetHome` fields.
- When data is unavailable or non-finite, the summary renders `—` and an empty progress track instead of a fabricated number.
- A valid zero-budget response remains `0%` and `0`, preserving the distinction between real zero and unavailable data.

### Regression tests

Added pure metric tests for:

- actual usage/remaining values;
- valid zero-budget values;
- missing or invalid data returning unavailable metrics.

## Q-04 Report Partial Failure

### Before

When the monthly report succeeded but the expense-history query failed, the report page continued rendering while the email dialog received `data?.remainingBudgetHome ?? 0`. An unavailable value was therefore displayed as a real zero.

### Fix

- `useMonthlyReportData` now exposes `expenseHistoryErrorMessage` independently from the full-report error.
- Report success is preserved when only expense history fails.
- `ReportPage` passes `null` rather than `0` when the expense-history budget is unavailable.
- `EmailReportDialog` accepts `number | null`; `null` renders `—` plus the partial/loading message, while numeric `0` still renders as a real zero.
- No report or email API contract changed, and no additional API call was introduced.

### Regression tests

Added coverage for:

- report + expense history full success;
- report failure without report data;
- report success + expense-history failure as partial data;
- email dialog unavailable remaining budget not rendering `0`/`USD 0.00`.

## Behavior Before / After

| Area | Before | After |
|---|---|---|
| Expense save + refresh failure | Save error state after a successful create; form remained filled | Create success is final; form clears; refresh issue is separate non-blocking feedback |
| Budget/home currency not ready | Fallback KRW could feed rate/calculation readiness | No rate/save readiness until real budget data exists |
| Mobile budget summary | Always `0%`; monthly limit shown as remaining | Actual cached Expense History values, or `—` when unavailable |
| Report partial failure | Missing remaining budget coerced to `0` | Partial error is exposed; dialog renders unavailable state |

## Tests Added

Fourteen focused P1 regression tests were added across:

- `ExpenseInputPage.critical.test.tsx` — Q-01/Q-02 page behavior
- `useExpenseInputData.test.ts` — Q-02 budget/rate readiness
- `mobileBudgetSummary.test.ts` — Q-03 metric contract
- `useMonthlyReportData.test.ts` — Q-04 full/error/partial query states
- `reportComponents.test.tsx` — Q-04 dialog rendering

Existing tests were not deleted or weakened.

## Existing Regression Tests

The prior baseline and Critical/Async/Dialog/Select/Listbox/Props/Page/React Query contracts remain in the full suite. The current run includes the previously reported 75-test baseline plus the new P1 coverage.

## TypeScript / ESLint / Build

| Check | Result |
|---|---|
| `npx tsc -b` | PASS — 0 errors |
| `npm run lint` | PASS — 0 errors, 0 warnings |
| Targeted P1 tests | PASS — 20/20 |
| Full Vitest | PASS — 25 files, 89/89 tests |
| `npm run build` | PASS — 200 modules transformed, no build warnings/errors |

## Files Modified

### P1 implementation

- `src/features/expense/hooks/useExpenseInputData.ts`
- `src/pages/ExpenseInputPage/ExpenseInputPage.tsx`
- `src/layouts/DashboardLayout/DashboardLayout.tsx`
- `src/layouts/DashboardLayout/mobileBudgetSummary.ts`
- `src/features/report/hooks/useMonthlyReportData.ts`
- `src/pages/ReportPage/ReportPage.tsx`
- `src/features/report/components/EmailReportDialog.tsx`

### P1 tests

- `src/pages/ExpenseInputPage/ExpenseInputPage.critical.test.tsx`
- `src/features/expense/hooks/useExpenseInputData.test.ts`
- `src/layouts/DashboardLayout/mobileBudgetSummary.test.ts`
- `src/features/report/hooks/useMonthlyReportData.test.ts`
- `src/features/report/components/reportComponents.test.tsx`

No API endpoint, request/response mapper, package manifest, feature folder, or Q-05+ implementation was changed for this task.

## Remaining Issues

- Q-05 through Q-13 from `FINAL_FRONTEND_QUALITY_REPORT.md` remain intentionally unchanged.
- Mobile budget metrics remain unavailable until the existing Expense History cache has data; the UI now shows `—` rather than guessing.
- Browser-level responsive, accessibility, offline, and E2E verification were not added in this P1 fix step.

## Ready for Secure Coding Review?

**YES.** Q-01, Q-02, Q-03, and Q-04 are implemented with focused regression coverage. TypeScript, ESLint, targeted tests, full Vitest, and Production build all pass. Secure Coding Review is the next phase and was not started as part of this change.
