# Micro Interaction Report

## Existing Animation

The audit found existing motion in the shared Button, Toast, LoadingState, Skeleton, Settings popup/sections, Report chart bars, Calculator swap control, and several navigation/form controls. These animations were kept as the baseline. No API, React Query, or data-loading logic was changed.

| Area | Existing behavior | Follow-up |
| --- | --- | --- |
| Button | Color, shadow, spinner, and press transitions | Added a restrained hover lift and pressed scale |
| Toast / Loading / Skeleton | Existing entrance, spinner, and pulse animations | Preserved |
| Settings / Report | Existing Product Polish section, popup, chart, and report-button motion | Preserved; added shared page/progress timing only |
| Modal / Dialog | No shared entrance motion | Added overlay fade and dialog fade/translate |
| Dropdown / Select | Hover/focus styling without a consistent open transition | Added a short opacity/translate entrance |
| Page shells | No common entrance policy | Added a one-time, 280ms page entrance to the requested screens |

## Async UI Audit

| Screen | Loading | Empty | Error / Retry | Improvement note |
| --- | --- | --- | --- | --- |
| Expense Input | Inline form/status feedback; save button loading | Not applicable to the form | Budget and exchange-rate alerts expose retry actions | Kept data and Critical readiness guards unchanged |
| Expense History | Initial `LoadingState`; inline background indicator | Domain empty states in the summary components | Shared `ErrorState` with retry; modal list has its own error contract | Page entrance runs only on mount, so range changes do not fade the page |
| Pots | Initial and inline background `LoadingState` | Shared `EmptyState` | Shared `ErrorState` with reload | Added page entrance and existing progress width transition |
| Report | Initial and inline background `LoadingState` | Report-specific empty rendering | Shared `ErrorState` with retry | Added page/menu motion; kept report chart animation |
| Memo | Initial and inline background `LoadingState` | Shared `EmptyState` | Shared `ErrorState` with retry | Added row-menu opening motion |
| Calculator | Inline quote loading; history `LoadingState` | Shared `EmptyState` for history | Inline quote error and history `ErrorState` with retry | Added page, currency-menu, and quick-action motion |
| Settings | Inline user/profile fetching; preview `LoadingState` | Preview `EmptyState` | Profile/preview retry actions | Added page entrance and retained settings Product Polish motion |
| Dashboard layout | `aria-busy` background-fetch indication for the mobile budget summary | No new dashboard empty state | Existing budget mutation feedback | Added content entrance only; no data behavior changed |
| Onboarding / auth | Button-level pending states | Not applicable to server data cards | Existing form errors/toasts | No page-level animation added to avoid changing the onboarding flow |

## Added Micro Interactions

- Added shared motion tokens (`--motion-fast`, `--motion-base`, `--motion-slow`, and `--motion-ease-out`).
- Added shared keyframes for page, dropdown, overlay, and dialog entrances.
- Added a global `prefers-reduced-motion` policy that shortens transitions and animations without changing interaction behavior.
- Added width transitions for existing budget, report, and Pots progress bars. No count-up or new data calculation was introduced.

## Button

Interactive shared buttons now lift by 1px on hover and settle to a 0.99 scale on press. Disabled buttons remain static. Calculator quick actions use the same restrained treatment.

## Card

Display-only summary cards were not given hover motion. This avoids suggesting that non-clickable cards are interactive and prevents layout movement.

## Modal / Dropdown

`ModalShell` now fades the backdrop and gently moves/scales the dialog into place. Existing focus management, Escape handling, scroll locking, and capture-specific styles remain unchanged. Currency, expense-history, report, memo, and calculator menus use the same short open transition while retaining their existing keyboard and selection behavior.

## Page Entrance

Dashboard content, Expense History, Report, Pots, Settings, and Calculator page shells receive a single subtle opacity/translate entrance on mount. Expense History range changes remain query-driven and do not trigger a page remount or full-page fade.

## Report / Progress

Existing Report chart-bar entrance animation remains in place. Existing Report, Settings, Expense History, and Pots progress bars now transition their existing inline widths; values, endpoints, and rendering contracts are unchanged.

## Navigation

Existing navigation color/background transitions were retained. No route or navigation state logic was changed.

## Reduced Motion

The global reduced-motion media query shortens CSS motion to an effectively immediate transition and disables smooth scrolling. Existing component-specific reduced-motion rules remain available for spinners, Toasts, and Report/Settings Product Polish effects.

## Performance

Motion uses only opacity and transform for entrances, plus width/height transitions on existing progress/chart elements. No new runtime dependency, timer, observer, API request, or React state was added.

## Files Changed

Animation-related changes are limited to:

- `src/styles/tokens.css`
- `src/styles/globals.css`
- `src/components/common/Button/Button.module.css`
- `src/components/common/ModalShell/ModalShell.module.css`
- `src/components/common/CurrencyDropdown/CurrencyDropdown.module.css`
- `src/features/expense/expenseHistory.module.css`
- `src/features/report/report.module.css`
- `src/features/settings/settings.module.css`
- `src/features/pots/components/PotCard/PotCard.module.css`
- `src/layouts/DashboardLayout/DashboardLayout.module.css`
- `src/pages/CalculatorPage/CalculatorPage.module.css`
- `src/pages/MemoPage/MemoPage.module.css`
- `src/pages/PotsPage/PotsPage.module.css`

## Tests

No behavior tests were removed or weakened. The existing component, feature, critical-regression, and report/email tests remain the verification source because this change is CSS-only.

## TypeScript / ESLint / Build

- TypeScript: passed (`npx tsc -b`)
- ESLint: passed (`npm run lint`)
- Vitest: passed — 35 files, 122 tests
- Production build: passed (`npm run build`)

## Manual QA Areas

- Open/close a Dialog and confirm focus, Escape, scroll lock, and backdrop behavior.
- Open each updated menu with mouse and keyboard.
- Change Expense History range and confirm previous data remains visible while fetching.
- Confirm progress bars animate without layout shift.
- Test with `prefers-reduced-motion: reduce` enabled.
- Confirm report-image capture excludes the send button and dialog overlay.

## Ready for Next Step?

Ready after the automated verification below and a brief browser QA pass of the areas above.
