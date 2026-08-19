# Final Frontend Quality Report

- Review date: 2026-08-19
- Scope: current routes, real page implementations, async states, forms, responsive CSS, accessibility, performance, assets, tests, and security preview
- Review mode: static code review plus local automated verification; no API, route, feature, or UI redesign was introduced
- Browser visual inspection: unavailable in this run. Responsive findings explicitly marked `Potential Visual Risk` are hypotheses that require viewport testing.

## Overall Status

**READY WITH ISSUES** for continued engineering work, but **not ready for an unqualified production release**. The repository is mechanically healthy (75/75 tests, TypeScript 0, ESLint 0, production build PASS), while several user-visible data correctness and recovery issues remain. No source implementation was changed during this review.

### Issue Register

#### Q-01 — P1 — Expense save can report failure after the expense was already created

- **Evidence:** `src/pages/ExpenseInputPage/ExpenseInputPage.tsx` awaits `createExpenseMutation.mutateAsync()` and then awaits `refetchBudget()` inside the same `try`. `useExpenseInputData.refetchBudget()` throws when the refresh fails. The form is cleared only after that await.
- **User Impact:** A successful `POST /expenses` followed by a budget refresh failure shows the save-error toast, leaves the entered values in the form, and encourages a retry that can create a duplicate expense.
- **Recommended Action:** Treat the create mutation result as the save outcome. Clear/lock the form after create success and report a separate non-blocking budget-refresh warning, or otherwise make the post-save refresh failure unable to reclassify a successful save. Add a regression test for “create succeeds, refetch fails”.

#### Q-02 — P1 — Expense input can use a default budget/currency before the budget query is ready

- **Evidence:** `src/features/expense/hooks/useExpenseInputData.ts` uses `emptyBudgetSummary` with `homeCurrency: 'KRW'` while the budget query has no data. The exchange-rate query is then started with that value, and the page enables saving when only `rateStatus === 'ready'` and amount is positive. No budget-initial-loading guard is exposed to `ExpenseInputPage`.
- **User Impact:** Before the real budget/home currency arrives, the preview and submitted `convertedAmountHome` can be calculated against KRW (or zero budget values) instead of the user’s configured home currency.
- **Recommended Action:** Represent budget data readiness explicitly, keep the exchange-rate/save contract blocked until budget data is ready, and show an initial loading state instead of the zero/default summary. Confirm the intended fallback with the backend contract before implementation.

#### Q-03 — P1 — Mobile budget summary shows a fabricated usage percentage and wrong remaining value

- **Evidence:** `src/layouts/DashboardLayout/DashboardLayout.tsx` sets `mobileBudgetUsagePercent = 0`. On `/home/expenses`, the mobile summary labels `assetSummary.totalAssetHome` as remaining budget, although that value is the monthly budget response.
- **User Impact:** Mobile users see `0%` regardless of actual spending and can mistake the monthly limit for remaining budget.
- **Recommended Action:** Derive both values from the same actual expense-history response used by the page, or hide the usage/remaining widget until those values are available. Do not add a new endpoint without confirming the existing data contract.

#### Q-04 — P1 — Report partial failure can render a zero remaining budget as if it were valid

- **Evidence:** `src/features/report/hooks/useMonthlyReportData.ts` sets `errorMessage` only when the monthly report query has no data. If the report query succeeds but the expense-history query fails, `errorMessage` is empty while `expenseHistory` is `null`. `src/pages/ReportPage/ReportPage.tsx` passes `data?.remainingBudgetHome ?? 0` to the email dialog.
- **User Impact:** A failed dependency can silently become a `0` remaining-budget value in the report/email preview, which is misleading and may affect a user decision.
- **Recommended Action:** Track the two query outcomes separately and show an explicit partial-data warning or disable only the affected budget section. Preserve report data that is genuinely available.

#### Q-05 — P2 — No route-level error or lazy-load fallback is configured

- **Evidence:** `src/routes/AppRouter.tsx` has lazy routes but no `errorElement`/`ErrorBoundary`/fallback route, and `src/App.tsx` renders `RouterProvider` directly.
- **User Impact:** A chunk load failure or render exception can fall through to the router’s default error experience instead of the product’s localized retry/recovery UI.
- **Recommended Action:** Add a small route-level error/fallback contract after product copy and recovery behavior are agreed; keep it separate from feature refactoring.

#### Q-06 — P2 — Onboarding deep links do not enforce prerequisite steps

- **Evidence:** `OnboardingRouteGuard` checks authentication, email verification, and completion only. It does not verify that base currency, local currencies, budget, and timezone exist before allowing a later onboarding URL.
- **User Impact:** Direct navigation to a later step can render with missing values and leave the user on a disabled or incomplete form.
- **Recommended Action:** Add step-aware redirects or a recoverable missing-state path once the intended deep-link policy is confirmed.

#### Q-07 — P2 — Calculator amount fields are not programmatically labelled

- **Evidence:** `src/pages/CalculatorPage/CalculatorPage.tsx` renders visible `<span>` labels beside inputs without `label`/`htmlFor`, `id`, or an equivalent `aria-label`.
- **User Impact:** Screen readers may announce the amount and result fields without their intended purpose.
- **Recommended Action:** Associate each input with a stable label while preserving the current visual layout.

#### Q-08 — P2 — Custom date calendars have incomplete keyboard and dialog semantics

- **Evidence:** Expense Input and `ReportBarChart` use `role="dialog"` with day buttons and `aria-pressed`, but no focus handoff/restore, grid semantics, or arrow-key date navigation is implemented.
- **User Impact:** Keyboard and assistive-technology users may lose context or be unable to navigate dates efficiently.
- **Recommended Action:** Reuse a small calendar interaction contract: focus the dialog on open, restore the trigger on close, expose grid/day labels, and support predictable keyboard navigation.

#### Q-09 — P2 — Report chart data is not available as an accessible text summary

- **Evidence:** `src/features/report/components/ReportBarChart.tsx` renders visual bars; axis/weekday content is partly `aria-hidden`, and there is no table, list, or summary of the plotted values.
- **User Impact:** Users who cannot perceive the chart cannot obtain the same daily/monthly spending information.
- **Recommended Action:** Add a concise, localized data summary or visually-hidden table tied to the chart.

#### Q-10 — P2 — Settings profile save is two sequential mutations without a recovery contract

- **Evidence:** `ProfileSetupPage` first updates the nickname and then saves onboarding data. The second request can fail after the first has succeeded.
- **User Impact:** A retry can leave a partially persisted profile/onboarding state, with no indication which step succeeded.
- **Recommended Action:** Keep the API contract, but show step-specific recovery or use a backend transaction when the backend supports it.

#### Q-11 — P2 — File upload modal can surface an unsanitized raw error message

- **Evidence:** `src/components/common/FileUploadModal/FileUploadModal.tsx` displays `error instanceof Error ? error.message : ...` directly. The page callback sanitizes its toast separately through `getApiErrorNotice`, but the modal’s own message path bypasses that policy.
- **User Impact:** Internal or backend error text can be exposed in the modal and may be confusing or sensitive.
- **Recommended Action:** Normalize upload errors through the shared user-facing error policy before rendering.

#### Q-12 — P2 — Currency loading failures are silently replaced by defaults

- **Evidence:** `BaseCurrencyPage` and `LocalCurrenciesPage` catch `getCurrencies()` failures with an empty handler and retain static options.
- **User Impact:** Users cannot tell whether the list is current or a fallback, and there is no retry action.
- **Recommended Action:** Preserve the safe fallback if required, but expose a non-blocking notice and retry after the expected API/fallback policy is confirmed.

#### Q-13 — P3 — Dashboard summary queries still run on Memo route

- **Evidence:** `DashboardLayout` passes `enabled: pathname !== ROUTE_PATHS.reportMemos`, but `useDashboardAssetSummary` calls `useBudgetQuery` and `useMyUserQuery` without an enabled option. Only conversion is skipped.
- **User Impact:** `/report/memos` can make budget/user requests that are not used by that screen.
- **Recommended Action:** Add query-level enablement only after confirming the intended ownership and hook contract; avoid broad React Query redesign in this step.

## User Flow Review

| Flow / route | Actual implementation and API evidence | State / interaction review |
|---|---|---|
| Landing `/` | Lazy `LandingPage`; navigation only | No server state. Static entry points are present. |
| Login `/login` | `login` → `POST /auth/login`; Google Identity button → configured social endpoint; session stored in `sessionStorage` | Client validation, loading buttons, disabled duplicate submit, sanitized toast errors. Guard redirects to verify/onboarding/home. |
| Signup `/signup` | `signUp` → `POST /auth/signup`; Google flow; session persistence | Field-level validation and pending state are present. Backend verification behavior is represented by the current session contract. |
| Email verification `/verify-email` | Route + `EmailVerificationRouteGuard`; current page is `PagePlaceholder` | Entry/guard exists, but no completed verification API flow is implemented in the current code. |
| Onboarding | `/onboarding/base-currency`, `/local-currencies`, `/budget`, `/timezone`, `/profile`; `GET /currencies`, `POST /onboarding`, `PATCH /users/me` | Buttons disable while submitting and empty selections are blocked. Silent currency fallback and deep-link prerequisite gap are Q-06/Q-12. |
| Expense input `/home` | `useExpenseInputData`; categories/budget/rate reads; `POST /expenses`; import uses `POST /expenses/import` | Exchange-rate loading/error/not-ready save guard and retry exist. Budget readiness, post-save refresh classification, and fallback preview are Q-01/Q-02. Custom calendar is Q-08. |
| Expense history `/home/expenses` | `useExpenseHistoryData`; summary/category/recent/month expense reads; edit/delete expense APIs | Initial loading, background inline loading, empty, error, retry, and modal mutation disabled states are distinct. |
| Pots `/home/pots` | `usePotsData`; `GET /pots`, create/update/allocation/archive mutations | Initial loading, empty, error/retry, background refresh, save/archive disabled states, and confirmation dialogs are present. |
| Report `/report` | `useMonthlyReportData`; report summary/categories and expense history; daily/monthly chart; email send | Initial loading, error/retry, transaction loading, and email pending states exist. Partial dependency handling is Q-04; calendar/chart accessibility is Q-08/Q-09. |
| Memo `/report/memos` | `useMemoData`; `GET /expenses/memos`, memo update/delete | Loading, background fetching, empty, error/retry, pagination, edit/delete dialogs and disabled deletion are present. Dashboard summary requests remain unnecessary (Q-13). |
| Calculator `/calculator` | Exchange quote/history queries and currency listbox | Quote loading/error and history loading/empty/error/retry exist. Amount field labelling is Q-07; long unbroken history values are a visual risk. |
| Settings `/settings` | User query, profile update, email-report setting read/update, report preview and send | Inline loading, preview error/retry, pending save/send, radio time selection, and dialog Escape handling exist. Sequential onboarding/profile persistence is Q-10. |
| Logout | `DashboardLayout` calls logout, clears session, navigates to `/login` | Local session cleanup is retained even when server logout fails, according to the current flow. |

## Responsive Risks

Static CSS review covered 360, 390, 768, 1024, 1440, and 1920px targets. No browser screenshot or computed-layout run was available, so the following are `Potential Visual Risk` rather than confirmed visual defects.

- `src/styles/globals.css` clamps the root font size to a minimum of 12px while layouts use rem breakpoints. At 768px and 1024px, the effective breakpoint can differ from the nominal CSS value; verify the Dashboard/Expense/Report/Pots switch points with real viewport screenshots.
- Dashboard and most data pages switch at `63.75rem`; auth/onboarding uses `40rem`/`56rem`; Settings also has `87.5rem` and `63.75rem` branches. The interaction between the root clamp and these thresholds needs browser confirmation.
- Calculator history uses `white-space: nowrap` for source/result/time values. Long localized strings or large amounts may clip or overflow at 360/390px.
- Expense Input’s intermediate grid uses minimum column widths before the mobile breakpoint. Verify 768/1024px for horizontal pressure around the preview panel.
- Settings and Report contain fixed/minimum card widths and several nowrap labels. Verify 200% zoom and narrow landscape layouts.
- `overflow: clip/hidden` appears in dashboard, report, auth, and onboarding containers; it can conceal focus rings or long content if a breakpoint is missed.

## Accessibility

Positive findings: shared `Button`, `TextField`, `ModalShell`, `LoadingState`, `EmptyState`, and `ErrorState` provide native controls, focus-visible styling, live/status semantics, and retry actions. Images are generally marked decorative with empty alt text, and the custom Listbox hook has keyboard/ARIA tests.

Residual issues are Q-07 (Calculator labels), Q-08 (calendar focus/grid/keyboard contract), and Q-09 (chart data summary). Additional review notes:

- Settings time selection uses native radio inputs and labels, which is keyboard-operable, but the surrounding custom dialog does not implement focus handoff/restore.
- Navigation and most action controls are real buttons/links; no new clickable-div blocker was confirmed in the reviewed routes.
- Heading structure is generally page heading → section headings, but full screen-reader traversal has not been automated.
- Color-only chart meaning is not sufficient on its own; the Q-09 text summary is the required fallback.
- 200% zoom, Windows high contrast, reduced motion, and browser text enlargement require manual browser QA.

## Forms

- Login/Signup use `TextField` associations, inline validation, disabled submit, loading state, and shared API error notices.
- Expense Input uses native labels for amount/merchant/memo and a disabled submit guard for non-positive amount, unusable rate, and pending save. Q-01/Q-02 show that post-submit and prerequisite-data semantics still need a separate contract.
- Pots and Settings disable save/archive actions while pending and prevent invalid target/amount values in the current page logic.
- Onboarding steps disable progression when required selections are absent. Q-06 and Q-10 cover deep-link and sequential persistence edge cases.
- File upload validates through the modal and import API; Q-11 concerns only raw message rendering.

## Error Handling

`src/utils/apiError.ts` centralizes user-facing notices and hides generic 5xx/network details; its tests cover network errors, 500 responses, 400 validation messages, and unknown values. Page-level retry actions are present for Expense History, Pots, Report, Memo, Calculator history, Settings preview, and rate loading.

Remaining error-contract issues:

- Q-01 reclassifies a successful save when the follow-up budget refresh fails.
- Q-04 treats a failed report dependency as an implicit zero in the email dialog.
- Q-11 bypasses the shared sanitization policy inside the upload modal.
- Q-12 provides no visible retry for currency list failures.

## ErrorBoundary / Router

Route guards correctly cover guest, email-verification, onboarding, and dashboard access using the current `sessionStorage` session contract. The wildcard route renders `NotFoundPage`.

Q-05 remains: `createBrowserRouter` has lazy routes but no explicit `errorElement` or route-level error boundary, and `RouterProvider` has no load/render fallback. A lazy chunk or render exception therefore lacks a product-owned recovery contract.

## Performance

- Lazy route modules are used for page-level code splitting; the latest build transformed 199 modules.
- The largest generated JavaScript chunk is about 384.22 kB raw / 118.38 kB gzip. This is an observation, not a measured regression or blocker.
- Query defaults are conservative (`staleTime` 30s, one retry, no focus refetch). Several feature hooks opt into fresh-on-entry behavior.
- `FloatingMascot` timers and Listbox/document listeners have cleanup paths.
- Q-13 identifies unnecessary Dashboard summary requests on Memo; confirm query enablement before changing hooks.
- No bundle profile, Core Web Vitals, slow-network, offline, or low-memory measurement was run.

## Assets

- The cleanup step removed only confirmed-unused legacy assets/components; active Google Identity Services, category icons, currency icons, and mascot assets remain referenced.
- Fonts are served from `public/fonts` with `font-display: swap`.
- Category icon paths can be built from an API `iconKey`; the current code does not inject HTML, but an allowlist/path-normalization review belongs in secure coding.
- External Google Identity Services script is loaded from `accounts.google.com`; CSP and third-party availability should be verified before release.

## CSS / Design Tokens

`src/styles/tokens.css` defines primary colors, surfaces, spacing, radii, shadows, typography, and content width. Shared state components reuse these tokens and CSS Modules remain the styling boundary.

The feature styles still contain many literal colors, fallback colors in `var()` expressions, and one-off pixel values (notably Settings and Report). This is not a current functional defect, but it makes theme/contrast changes harder and should be handled as a later token-consolidation task. No arbitrary styling was added in this review.

## Edge Cases

- Exchange-rate error/loading/not-ready save blocking is preserved by the critical fix; Q-02 shows budget readiness is a separate prerequisite not represented in that guard.
- Expense history distinguishes full failure from empty/partial data through the critical API fix and current page states.
- Report partial dependency failure is Q-04.
- Onboarding currency fetch fallback is Q-12; timezone and locale behavior should be checked across browser/OS settings.
- Date calculations use local `Date` objects and ISO strings in multiple screens. Around midnight and DST boundaries, selected date/month and report range behavior needs timezone tests.
- Large amounts, fractional currencies, long merchant/memo text, and 200% zoom need explicit boundary tests.
- Offline/network recovery is not covered by automated tests.

## Test Coverage

Current automated baseline: **22 test files, 75 tests, 75 passed**.

Covered areas include API client/cached requests, expense critical behavior, API type mapping, API error/currency/category/exchange utilities, shared Async/Loading/Empty/Error/Skeleton primitives, Button/Text input/currency controls, ModalShell, Listbox keyboard behavior, dashboard components, feature components for Expense/Report/Settings, and React Query contract helpers.

Missing or thin coverage:

- Router and all route guards
- Full Login/Signup/Verify Email/Onboarding page interactions
- Direct page integration for Expense Input, Expense History, Pots, Report, Memo, Calculator, Settings
- Q-01 post-save refresh failure and Q-02 budget-not-ready save guard
- Q-03 mobile summary data correctness and Q-04 report partial failure
- Custom calendars, chart accessibility, settings time dialog focus, and FileUploadModal raw error handling
- Responsive visual regression, 200% zoom, offline/slow-network behavior, and cross-browser testing

## Recommended E2E Flows

Keep the first E2E set to five flows:

1. Login → guard destination matrix (verified, unverified, and onboarding-incomplete sessions).
2. Signup → five onboarding steps → `/home`, including required-field and API failure recovery.
3. Expense input → exchange-rate ready save; loading/error/not-ready blocked; create-success followed by budget-refresh failure; verify no duplicate on retry.
4. Expense History → loading, success, empty, partial/error/retry, then edit/delete in the modal.
5. Pots → create, edit/allocate, archive confirmation, and mutation failure feedback.

Report/Settings email preview, Calculator, and OCR should receive focused E2E coverage after the first five flows or when their release risk changes.

## Security Preview

- Access and refresh tokens are kept in `sessionStorage`, not `localStorage`; this reduces persistence but remains exposed to same-origin JavaScript if an XSS occurs.
- No `dangerouslySetInnerHTML`, direct `innerHTML`, or sensitive debug logging was found in the reviewed source.
- `VITE_*` values are client-visible configuration. No source-level secret was confirmed; deployment environment and repository history still require separate review.
- Google Identity Services is an external script dependency; use a restrictive CSP/allowlist and verify failure behavior.
- Server-derived category/icon keys are used for asset paths rather than HTML; validate/allowlist these keys during the secure coding phase.
- Client guards are navigation UX, not authorization. Backend endpoints must continue to enforce authentication and ownership.

## Issues Fixed

**None in this review.** The request was a quality assessment after the completed Critical Fix, Async UI, Dialog, Select/Listbox, Props/Type, Page Responsibility, Feature Structure, and Dead Code steps. Existing changes were preserved; no API, route, feature, or visual behavior was modified.

## Remaining Issues

The open issues are Q-01 through Q-13 above. Q-01 through Q-04 are data correctness/recovery concerns and should be resolved before broad production release. Q-05 through Q-13 are recovery, accessibility, performance, and maintainability follow-ups with varying urgency.

## Release Blockers

The following are release blockers for a trustworthy production sign-off:

| Priority | Issue | Reason |
|---|---|---|
| P1 | Q-01 | A saved expense can be reported as failed and duplicated on retry. |
| P1 | Q-02 | A save can occur before the real budget/home currency is ready. |
| P1 | Q-03 | Mobile budget usage and remaining values are demonstrably incorrect. |
| P1 | Q-04 | Report email preview can display zero for a failed dependency. |

Q-05 is a release-hardening concern. Q-06 through Q-13 can be sequenced after the P1 data-contract fixes, except accessibility issues required by the product’s supported compliance target.

## Post-MVP Improvements

- Add route-level ErrorBoundary/loading fallback and guard-matrix tests.
- Add page-level integration and a five-flow E2E suite.
- Standardize calendar semantics/focus and provide chart text summaries.
- Consolidate remaining literal CSS colors into existing tokens after contrast review.
- Measure Core Web Vitals, bundle composition, slow network, offline recovery, and 360/390/768/1024/1440/1920 viewport behavior.
- Resolve onboarding deep-link policy and backend transaction/recovery behavior for multi-step persistence.
- Review CSP, third-party script failure, asset-key allowlisting, token exposure, and backend authorization in the secure coding phase.

## Tests / TypeScript / ESLint / Build

| Check | Result |
|---|---|
| `npx tsc -b` | PASS — 0 errors |
| `npm run lint` | PASS — 0 errors, 0 warnings |
| `npm test` | PASS — 22 files, 75/75 tests |
| `npm run build` | PASS — `tsc -b` and Vite build; 199 modules; no build warnings/errors |

## Ready for Secure Coding Review?

**NOT READY for release sign-off.** The static quality review is complete and the next engineering phase can be planned, but Q-01 through Q-04 must be resolved and regression-tested before calling the frontend release-ready. Secure Coding should be the next focused review after those P1 fixes are accepted; this report does not start that phase.
