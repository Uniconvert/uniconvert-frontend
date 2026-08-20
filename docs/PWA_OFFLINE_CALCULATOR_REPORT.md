# PWA Offline Calculator Report

## Before

The project already had a dependency-free Service Worker, a public `/offline` calculator entry, `navigator.onLine` handling, and a pair-scoped exchange-rate cache from the previous offline-calculator work. It did not expose a Web App Manifest, and the Service Worker precache list did not explicitly include the manifest, root icons, or local fonts.

The current route contract is intentionally preserved: `/offline` is the public calculator route and `/calculator` remains the authenticated dashboard calculator. Changing the existing `/calculator` route would change the dashboard navigation and its regression contract, so it is not part of this PWA hardening pass.

| Location | Current role | PWA/offline impact | Changed |
| --- | --- | --- | --- |
| `index.html` | HTML shell and metadata | Manifest discovery and install metadata | Yes |
| `public/manifest.webmanifest` | Web App Manifest | Install/start URL, theme, icons | Added |
| `public/sw.js` | App-shell Service Worker | Static precache, navigation fallback, runtime static cache | Yes |
| `src/pwa/registerServiceWorker.ts` | Production-only registration | Avoids stale SW during development | No |
| `src/routes/AppRouter.tsx` | Public/protected route tree | Keeps `/offline` public and data screens protected | No |
| `src/routes/RouteGuards.tsx` | Auth and offline guard | Shows `OfflineFallback` for protected data routes | No |
| `src/pages/CalculatorPage/CalculatorPage.tsx` | Live/cached conversion UI | Uses API online and exact-pair local cache offline | No |
| `src/features/calculator/exchangeRateCache.ts` | Local exchange-rate storage | Stores only validated pair/rate metadata | No |
| `src/hooks/useOnlineStatus.ts` | Browser network hint | Enables/disables online requests and recovery | No |
| `src/api/exchangeRates.ts` | Existing exchange-rate API | Backend contract remains unchanged | No |

## PWA Architecture

The implementation keeps three storage responsibilities separate:

- Service Worker Cache Storage: app HTML, JavaScript, CSS, fonts, icons, and other static assets.
- React Query: online server data and existing query lifecycle.
- `localStorage`: only the last valid exchange rate for an exact currency pair.

No backend API response is written to Service Worker Cache Storage.

The project already had a working custom Service Worker, so `vite-plugin-pwa` was not added as a second registration/build pipeline. This avoids duplicate workers and preserves the existing production registration behavior.

## Manifest

`public/manifest.webmanifest` is linked from `index.html` and contains:

- `name`/`short_name`: `Uniconvert`
- `start_url` and `scope`: `/`
- `display`: `standalone`
- theme color: `#66a9e4`
- background color: `#f5f8fc`
- existing Uniconvert favicon asset for 192px and 512px install slots

The manifest is copied into `dist` by Vite and is included in the Service Worker app-shell precache list.

## Service Worker

The existing worker was hardened without changing API behavior:

- bumped the app-shell cache version to `uniconvert-app-shell-v2`;
- explicitly precaches the HTML shell, manifest, favicon assets, OG image, and local fonts;
- follows linked `/assets` and `/fonts` URLs from production JavaScript/CSS bundles;
- serves cached `index.html` when a navigation request fails offline;
- activates immediately and removes older app-shell cache versions;
- caches only same-origin static destinations (`script`, `style`, `image`, `font`, `manifest`).

The worker does not intercept non-GET requests, cross-origin requests, `/api/*`, or `/auth/*` requests. API calls with other paths also have `destination === ''` and do not enter the static cache strategy.

## Static Asset Cache

The app shell explicitly includes the existing local fonts and root icon assets. Production bundle traversal also discovers hashed JavaScript, CSS, and `/assets` dependencies, including lazy route chunks and calculator assets. Static assets requested after activation are cached on successful GET responses for subsequent offline navigation.

## API Cache Policy

Exchange-rate, expense, budget, report, Pots, memo, settings, OCR, authentication, and email API responses are not cached by the Service Worker. The existing API client and response contracts are unchanged.

## Public Calculator

`/offline` remains the public calculator route used by the current product contract. It is accessible with or without a session and uses the existing `CalculatorPage` in `PublicCalculatorLayout`. The authenticated `/calculator` dashboard route remains protected, preserving the existing dashboard navigation and user-specific layout.

## Exchange Rate Local Cache

The existing `src/features/calculator/exchangeRateCache.ts` stores:

```text
uniconvert:exchange-rate:{FROM}:{TO}
```

Only a validated `fromCurrency`, `toCurrency`, positive finite `rate`, `rateDate`, and `cachedAt` are stored. Invalid JSON, invalid currency pairs, unavailable responses, non-positive rates, and non-finite rates return `null`. An invalid response cannot overwrite an existing valid pair cache, and storage failures do not crash the app.

## Live / Cached Rate

- Online: the existing current-rate query is enabled and valid responses update the exact pair cache.
- Offline: the current-rate and quote queries are disabled; only the exact selected pair cache is used.
- A cached rate is labeled as offline/cached and retains its saved rate date.
- A missing pair cache shows the existing unavailable guidance and never falls back to a hardcoded or unrelated rate.
- When the browser transitions from offline to online, the selected pair uses the existing query `refetch` and returns to the live source after a successful response.

## Offline Route Policy

Protected server-data screens continue to use `OfflineFallback` while offline. Landing, login, signup, verification, and the existing public calculator route are not forced through that fallback. No forced reload, redirect loop, or session reset is introduced.

## Offline Fallback

`OfflineFallback` remains the existing accessible status page with an explanation and a link to `/offline`. It reuses the existing design tokens and does not expose server data as if it were available.

## Cold Start Offline

The production worker now precaches the shell, manifest, root icons, fonts, and linked production chunks after an online visit. This provides the app-shell prerequisite for a cold-start offline visit and allows `/offline` to be resolved by the SPA navigation fallback.

Cold-start behavior still requires browser verification with `npm run preview`: the worker must be activated once while online, then the preview origin must be reopened while offline. Automated unit tests and a successful build cannot prove browser cache activation by themselves.

## Network Recovery

`useOnlineStatus` continues to listen for `online`/`offline` events. The calculator refetches the selected pair when connectivity is restored; it does not reload the page or invalidate unrelated queries.

## Privacy / Security

Service Worker cache contains static application resources only. Local storage contains no access token, refresh token, profile data, expense, budget, report, OCR, or email data. The existing session storage policy is unchanged.

## Tests Added

- Extended `src/features/calculator/exchangeRateCache.test.ts` to prove an invalid/unavailable response cannot overwrite a valid pair cache.
- Extended `src/pages/CalculatorPage/CalculatorPage.offline.test.tsx` to prove the exchange-rate query is disabled when the browser is offline.
- Existing route, API mapping, offline calculator, and critical regression tests remain unchanged.

## Full Test Result

After the changes:

- Vitest: 38 test files, 132 tests passed.
- TypeScript: passed with 0 errors.
- ESLint: passed with 0 errors and 0 warnings.
- Production build: passed.

## TypeScript / ESLint / Build

`npx tsc -b`, `npm run lint`, and `npm run build` pass. The build output contains `dist/manifest.webmanifest` and the copied `dist/sw.js` app-shell worker.

## Production Preview QA

`npm run build` completed successfully. `npm run preview` was not kept running in this change because browser DevTools inspection is a manual QA step; the production preview procedure is listed below.

## Manual QA Required

1. Run `npm run preview` and open the preview origin while online.
2. Confirm Application → Manifest, icons, `start_url`, and `display: standalone`.
3. Confirm Application → Service Workers shows `public/sw.js` activated.
4. Confirm Cache Storage contains the app shell and static resources, but no API response entries.
5. Open `/offline`, load USD/KRW, and verify the pair cache in Local Storage.
6. Switch DevTools Network to Offline and verify cached conversion, source/date label, and missing-pair guidance.
7. Visit a protected data route offline and verify `OfflineFallback` and the calculator link.
8. Close/reopen the preview tab while offline and verify the shell, `/offline`, and the saved pair calculation.
9. Restore network and verify the selected pair changes from cached to live without a page reload.

## Limitations

- `navigator.onLine` is a connectivity hint; an online API 4xx/5xx remains an API error, not an offline state.
- Cached rates are not treated as live/current rates and are refreshed only after online recovery.
- The public calculator route is `/offline` by the existing product contract; `/calculator` remains the authenticated dashboard route.
- Browser activation, Cache Storage contents, installability, and cold-start behavior require manual production-preview QA.
- The two manifest size slots reuse the existing 512px Uniconvert favicon so no new visual asset was designed.

## Ready for PWA QA?

**READY WITH MANUAL QA** — manifest, static app-shell caching, API-cache exclusion, validated exchange-rate storage, offline route behavior, recovery handling, typecheck, lint, tests, and production build are complete. Browser DevTools and cold-start verification remain before declaring full offline support complete.
