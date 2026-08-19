# Dead Code / Cleanup Report

## Inventory

이번 정리는 현재 저장소의 TypeScript/TSX import, `src/routes/AppRouter.tsx`의 실제 lazy route, 테스트·문서 참조, 정적 자산 문자열 참조를 기준으로 판정했다. 동적 경로가 가능한 항목은 검색 결과만으로 삭제하지 않았다.

| 대상 | 확인 결과 | 판정 |
| --- | --- | --- |
| `src/pages/HomePage/HomePage.tsx` | `/home` route는 `ExpenseInputPage`를 lazy-load한다. `HomePage` import/dynamic import는 소스 전체에 없다. | 삭제 |
| `src/features/pots/components/AutoSavingsCard/*` | 컴포넌트와 CSS 내부 참조만 존재하며 `PotsPage`, Pots hook, 테스트에서 import하지 않는다. | 삭제 |
| `src/hooks/useExchangeCalculatorData.ts` | 선언부 외 import가 없다. Calculator는 `useExchangeRateQuery`와 페이지 내부 quote/history Query를 사용한다. | 삭제 |
| `src/components/common/GoogleIdentityButton/*` | `LoginPage`, `SignUpPage`에서 실제 사용 중이며 Google Identity Services script를 초기화한다. | 유지 |
| `src/components/common/GoogleLoginButton/*` | 소스 import가 없고, 실제 인증 화면은 `GoogleIdentityButton`을 사용한다. | 삭제 |
| `public/assets/icons/google.png` | 삭제한 `GoogleLoginButton` 전용 경로였으며 삭제 전 소스·문서·동적 문자열 참조가 없었다. | 삭제 |
| `src/components/common/PagePlaceholder/*` | `VerifyEmailPage`에서 실제 사용 중이다. | 유지 |

## Deleted Files

- `src/pages/HomePage/HomePage.tsx`
- `src/features/pots/components/AutoSavingsCard/AutoSavingsCard.tsx`
- `src/features/pots/components/AutoSavingsCard/AutoSavingsCard.module.css`
- `src/hooks/useExchangeCalculatorData.ts`
- `src/components/common/GoogleLoginButton/GoogleLoginButton.tsx`
- `src/components/common/GoogleLoginButton/GoogleLoginButton.module.css`
- `public/assets/icons/google.png`

## Removed Exports

삭제된 모듈의 default export만 함께 제거됐다. 현재 사용 중인 공통 export나 feature API export의 이름·계약은 제거하지 않았다.

## Duplicate Code Removed

동일한 런타임 계약을 안전하게 병합할 수 있는 중복 구현은 확인되지 않았다. Calculator의 페이지 내부 quote/history Query와 삭제한 `useExchangeCalculatorData`는 관심사가 겹치지만 Query key, 응답 사용 방식, UI 상태 계약이 달라 무리한 병합은 하지 않았다. `GoogleLoginButton`은 활성 `GoogleIdentityButton`과 인증 방식이 달라, 중복 병합이 아니라 미사용 legacy wrapper 삭제로 처리했다.

## Imports Cleaned

삭제 대상 모듈에는 incoming import가 없었으므로 활성 TS/TSX import 라인을 변경할 필요가 없었다. 삭제된 `GoogleLoginButton`의 문서 import 예제와 연결된 stale 설명은 `docs/COMPONENTS.md`에서 제거했다.

## Debug / Stale Comments

- `src`에서 `TODO`, `FIXME`, `HACK`, `console.log`, `console.debug`, `console.info`는 확인되지 않았다.
- 삭제한 GoogleLogin 문서 예제에 있던 “소셜 로그인 API 확정 후 연결” TODO는 실제 컴포넌트가 제거됨에 따라 함께 제거했다.
- `legacySymbol`은 Pots category 서버 호환 값으로 사용되고, `legacyMascotMessages`는 report fallback 계산에 사용되므로 stale comment/code로 간주하지 않고 유지했다.

## Dependencies Reviewed

`package.json`의 runtime 및 build/test 의존성을 실제 source/config import와 대조했다.

- React, React DOM, React Router: 앱·라우팅·컴포넌트에서 사용
- `@tanstack/react-query`: 화면 Query/Mutation 및 테스트에서 사용
- Vite, React plugin, TypeScript, ESLint, TypeScript ESLint, React Hooks/Refresh plugins, Vitest, Node types: build/lint/test 설정 또는 실행에 사용
- 미사용으로 확정되는 dependency는 없었으므로 package manifest와 lockfile은 변경하지 않았다.

## Confirmed Runtime Usage

- `ROUTE_PATHS.home` → `src/pages/ExpenseInputPage/ExpenseInputPage.tsx`
- `ROUTE_PATHS.expenses` → `src/pages/ExpenseHistoryPage/ExpenseHistoryPage.tsx`
- `ROUTE_PATHS.pots` → `src/pages/PotsPage/PotsPage.tsx`
- `ROUTE_PATHS.report` → `src/pages/ReportPage/ReportPage.tsx`
- `ROUTE_PATHS.reportMemos` → `src/pages/MemoPage/MemoPage.tsx`
- `ROUTE_PATHS.calculator` → `src/pages/CalculatorPage/CalculatorPage.tsx`
- `ROUTE_PATHS.settings` → `src/pages/SettingsPage/SettingsPage.tsx`
- Login/Sign-up → `GoogleIdentityButton` 실제 사용
- Verify Email → `PagePlaceholder` 실제 사용

## Uncertain Cleanup

- `MemoPage`, `CalculatorPage`, Auth, Onboarding의 페이지 내부 state/effect 및 local styling은 현재 화면 동작과 직접 연결되어 있어 이번 단계에서 제거·병합하지 않았다.
- category, currency, mascot 등 public asset의 일부는 문자열 조합 또는 서버 응답 key로 결정될 수 있어 단순 literal 검색만으로 미사용을 확정하지 않았다.
- 역사적 baseline/refactoring 보고서에는 정리 전 후보 파일명이 남아 있다. 이는 당시 상태를 보존하는 기록이며 현재 runtime import가 아니다.
- `legacySymbol`과 report mascot fallback의 필요성이 향후 API 계약에서 사라졌다는 근거가 없으므로 유지했다.

## Files Modified

- `docs/COMPONENTS.md` — 삭제된 GoogleLoginButton 사용 예제와 stale TODO 제거
- `docs/DEAD_CODE_CLEANUP_REPORT.md` — 본 정리 결과 기록

## Files Deleted

- `src/pages/HomePage/HomePage.tsx`
- `src/features/pots/components/AutoSavingsCard/AutoSavingsCard.tsx`
- `src/features/pots/components/AutoSavingsCard/AutoSavingsCard.module.css`
- `src/hooks/useExchangeCalculatorData.ts`
- `src/components/common/GoogleLoginButton/GoogleLoginButton.tsx`
- `src/components/common/GoogleLoginButton/GoogleLoginButton.module.css`
- `public/assets/icons/google.png`

## Tests

- 각 삭제 단위 후 `npx tsc -b` 실행: 모두 통과
- 전체 Vitest: **22/22 test files, 75/75 tests passed**
- 기존 테스트 파일이나 테스트 내용을 삭제·수정하지 않았다.

## TypeScript / ESLint / Build

- TypeScript (`npx tsc -b`): 오류 0
- ESLint (`npm run lint`): 오류 0, 경고 0
- Production build (`npm run build`): 성공, build warning/error 없음

## Remaining Issues

이번 범위에서 런타임 dead code로 확정되지 않은 항목은 보존했다. 특히 동적 asset 경로와 API 호환 fallback은 실제 backend 계약 확인 없이 삭제하지 않았다. 이전 단계의 feature 구조 이동 및 Critical/Async UI 변경으로 인한 기존 working tree 변경은 이번 cleanup에서 되돌리거나 재작성하지 않았다.

## Ready for Final Quality Review?

**READY**

실제 route/import/runtime 참조가 없는 후보만 제거했고, API·Query key·Mutation·UI 디자인·feature 폴더 구조는 변경하지 않았다. 전체 테스트, TypeScript, ESLint, Production build가 모두 통과했으므로 다음 단계는 별도 구조 변경 없이 최종 품질 검토로 진행할 수 있다.
