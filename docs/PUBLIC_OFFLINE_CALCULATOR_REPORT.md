# Public Offline Calculator Report

## Before

`/calculator` remains the authenticated dashboard calculator. The public offline entry point is `/offline`. Before this change, the page used the existing current-rate and quote queries, but had no network-status policy or currency-pair cache. A browser refresh while offline also had no app-shell fallback because the project did not contain a service worker.

The existing API mapper already consumes the unwrapped `apiRequest` payload (`fromCurrency`, `toCurrency`, `rate`, `rateDate`, `changeRate`), so the backend envelope and endpoint were left unchanged.

| 위치 | 현재 역할 | 변경 필요 여부 |
| --- | --- | --- |
| `src/routes/AppRouter.tsx` | Public, auth, and dashboard route tree | Offline calculator added as a separate public route |
| `src/routes/RouteGuards.tsx` | Session checks for protected data routes | Offline protected-route fallback added |
| `src/pages/CalculatorPage/CalculatorPage.tsx` | Currency selection, quote, and history UI | Online/offline rate policy added |
| `src/api/exchangeRates.ts` | Current-rate, quote, and history API calls | Contract unchanged |
| `src/hooks/useExchangeRateQuery.ts` | Current-rate React Query | Optional `enabled` gate added |
| `src/features/calculator/exchangeRateCache.ts` | New pair-scoped local cache helper | Added |
| `src/hooks/useOnlineStatus.ts` | New `navigator.onLine`/event hook | Added |
| `src/main.tsx`, `src/pwa/registerServiceWorker.ts`, `public/sw.js` | App bootstrap and static app-shell fallback | Added minimal service worker |

## Route Policy

- `/calculator` remains under `DashboardRouteGuard` with its existing dashboard UI.
- `/offline` is outside `DashboardRouteGuard` and is accessible without a session.
- `/`, login, signup, verification, and onboarding retain their existing route structure.
- Home, expense history, Pots, Report, memo, OCR, and Settings remain protected.
- When a protected data route is open and the browser reports offline, `OfflineFallback` is shown instead of pretending server data is available.
- The public offline calculator layout has no image-based brand or login navigation; the calculator provides its own text-only home link and does not render dashboard user/profile/logout controls.

## Public Calculator

The existing `/calculator` page remains in the dashboard and keeps its prior visual treatment. The separate `/offline` entry reuses the calculator implementation with the offline cache policy and public layout. No authentication request or new backend endpoint was added.

The `/offline` presentation is intentionally focused on conversion: the recent-conversion history panel, history modal, Uni mascot, and image assets are omitted, and no login button is rendered. The heading identifies the page as the offline exchange calculator. A visible Online/Offline status badge and text-only home button are shown.

## Online Calculator

- `navigator.onLine !== false` enables the existing current-rate and quote queries.
- A valid rate means a finite number greater than zero, valid currency codes, and `available !== false`.
- The latest valid current-rate response is written to the pair-specific cache.
- The first valid response for a pair is cached once per mounted calculator view; repeated renders do not write the same rate again. A changed rate/date or a different pair can update the cache.
- Quote failures remain API/quote errors and are not mislabeled as offline.
- Current-rate recovery is triggered with the existing query's `refetch` when the `offline` → `online` event is observed.

## Offline Calculator

- When `navigator.onLine` is false, current-rate, quote, and history queries are disabled; no repeated server request is made.
- The exact selected pair is read from local storage. A matching valid cache keeps the calculator usable and shows the offline source label and cached rate date.
- Without an exact pair cache, conversion is unavailable and the user sees the saved-rate guidance. No hardcoded, 1:1, zero, or other-pair fallback is used.
- Changing a pair re-reads that pair's cache, so a previous pair's rate is not displayed for the new pair.

When `/offline` first opens while online, the calculator also warms the local cache for `USD → KRW`, `EUR → KRW`, `JPY → KRW`, and `CNY → KRW` (plus the currently selected pair when different). Failed warm-up requests are ignored so the selected pair's normal visible query remains the source of loading/error feedback. No synthetic rate is created when a pair is unavailable.

## Exchange Rate Cache

`src/features/calculator/exchangeRateCache.ts` stores values under:

`uniconvert:exchange-rate:{FROM}:{TO}`

The stored model is `fromCurrency`, `toCurrency`, `rate`, `rateDate`, and `cachedAt`. Invalid JSON, unavailable responses, non-positive/non-finite rates, invalid currencies, and pair mismatches return `null` and cannot overwrite a valid cache. Storage failures are caught so the app does not crash.

## Live vs Cached

The calculator displays the source explicitly:

- Online: `Live`/localized equivalent plus `1 FROM = RATE TO` and the API rate date when present.
- Offline: `Offline`/localized equivalent plus the same rate and a cached-rate notice/date.

The calculation path uses one shared `convertAmount(amount, rate)` helper for both sources. Online quote/current-rate data supplies the live rate, while offline uses the exact cached rate; no unrelated statistic is calculated.

## Offline Fallback

`OfflineFallback` is a small accessible page with an offline message and a link to `/offline`. It does not reload the page or redirect every route to the calculator. Landing/auth/onboarding routes are not forced through this fallback because they are not children of the protected data guard.

## Network Recovery

The online-status hook listens for `online` and `offline` browser events. When an open calculator transitions back online, the current selected pair is refetched through the existing React Query instance. A successful response changes the visible source back to live and refreshes the pair cache without a full-page reload.

## PWA / Service Worker

Because the repository had no PWA plugin or service worker, a dependency-free service worker was added. During install it precaches `/` and `/index.html` plus linked build assets discovered from the app shell and static modules, caches same-origin static script/style/image/font responses, serves the app shell for failed navigations, and activates immediately. Registration occurs only in production after the window load event.

This supports the app-shell portion of an offline cold start without adding a new library or changing Vite configuration.

## Cached Assets

Only the app shell and same-origin static assets discovered by `public/sw.js` are cached. Exchange rates are intentionally stored separately in local storage by the calculator feature.

## Data Not Cached

No service-worker cache is used for expense, report, budget, user, auth, OCR, Pots, memo, or other private API responses. The quote history query is disabled offline rather than cached.

## Privacy / Security

The new cache contains only currency codes, a numeric rate, its date, and a local cache timestamp. It does not store access tokens, refresh tokens, email, profile data, expenses, budgets, reports, or API keys. Existing auth/session storage and backend contracts were not changed.

## Tests Added

- `src/features/calculator/exchangeRateCache.test.ts`: valid storage/read, pair isolation, invalid JSON, unavailable/invalid rate rejection.
- `src/pages/CalculatorPage/CalculatorPage.offline.test.tsx`: live source display, exact-pair cached display, no-cache offline guidance, and the focused public view without history or mascot content.
- `src/routes/AppRouter.publicCalculator.test.ts`: regular calculator remains protected and only the offline calculator is public.

Existing exchange-rate mapping tests continue to verify the real `rate` payload (`1415.2`) is read without a second `data` unwrap.

## Full Test Result

- Vitest: **38 test files, 131 tests passed**.
- Targeted calculator/cache/route tests: passed.

## TypeScript / ESLint / Build

- `npx tsc -b`: passed, 0 errors.
- `npm run lint`: passed, 0 errors and 0 warnings.
- `npm run build`: passed.

## Manual Browser QA

Not performed in this run. The following still needs Chrome/DevTools verification:

1. Visit `/calculator` while signed in and confirm its existing dashboard UI.
2. Visit `/offline` without login and confirm live conversion and local-storage entry.
3. Toggle Network → Offline and verify cached conversion, source/date label, and no-cache guidance for a new pair.
4. Visit a protected data route offline and confirm `OfflineFallback` and calculator link.
5. Close the tab, keep the browser offline, revisit the site, and confirm the service-worker app shell opens and the cached pair calculates.
6. Restore network and confirm the selected pair refetches and changes from cached to live.

The implementation distinguishes app-runtime network loss from cold-start offline. Until the cold-start steps above are manually completed, cold-start support is implemented but not marked as browser-verified.

## Limitations

- `navigator.onLine` is a browser connectivity hint; an online HTTP 4xx/5xx response remains an API error.
- Cached rates are intentionally not treated as current live rates and are not refreshed until the browser is online again.
- Recent conversion history is server data and is unavailable while offline.
- Service-worker scope/update behavior requires a production-hosted HTTPS (or localhost) manual check.

## Ready for Offline QA?

**READY WITH MANUAL QA** — the public route, pair-isolated offline calculation, recovery path, protected-route fallback, tests, typecheck, lint, and production build are complete. Browser DevTools and cold-start verification remain before declaring full offline support complete.
