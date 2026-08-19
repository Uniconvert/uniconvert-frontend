# Release Hardening Report

## Q-05 Route Error Recovery

`AppRouter`의 각 top-level route root에 공통 `errorElement`를 연결했다. lazy route chunk 로드 실패와 route element render 예외가 발생하면 브라우저 기본 오류 화면 대신 `RouteErrorFallback`이 표시된다.

Fallback은 내부 예외 내용을 사용자에게 노출하지 않고 다음 복구 동작을 제공한다.

- 홈으로 이동
- 로그인으로 이동

`RouteErrorFallback`은 기존 `ErrorState` 스타일을 재사용하며, 별도의 대규모 ErrorBoundary 구조나 API 변경은 추가하지 않았다.

## Q-07 Calculator Accessibility

Calculator의 실제 금액 입력과 결과 입력에 고유 `id`를 추가하고 기존 visible label을 `<label htmlFor>`로 연결했다.

- `calculator.amount` → `calculator-from-amount`
- `calculator.result` → `calculator-to-amount`

기존 레이아웃과 입력 동작은 유지했다.

## Q-08 Calendar Accessibility

Expense Input과 Report의 custom calendar에 공통 키보드 계산 유틸리티를 적용했다.

- `ArrowLeft` / `ArrowRight`: 이전·다음 날짜
- `ArrowUp` / `ArrowDown`: 이전·다음 주
- `Home` / `End`: 현재 달의 첫 날짜·마지막 날짜
- `Escape`: 달력 닫기
- Escape 또는 날짜 선택 후 trigger focus 복원
- 달력 열림 시 선택 날짜 또는 첫 날짜로 focus 이동
- 각 날짜 button에 locale 기반 `aria-label`
- 선택 날짜의 `aria-pressed` 및 `aria-current="date"` 유지
- trigger와 calendar 간 `aria-controls` 연결

현재 달의 범위를 벗어나는 화살표 이동은 다른 달을 자동 선택하지 않고 현재 달 안에서 멈춘다. 기존 월 이동 버튼 동작과 날짜 선택 계약은 그대로 유지했다. 대규모 DatePicker 컴포넌트 분리나 API 변경은 하지 않았다.

## Q-09 Chart Accessibility

`ReportBarChart`의 시각적 bar 영역은 `aria-hidden="true"`로 표시하고, 동일한 실제 chart dataset을 visually hidden list로 함께 제공한다.

각 항목은 현재 차트에 표시되는 label과 amount만 다음 형식으로 제공한다.

```text
label: amount
```

새로운 통계나 분석 값을 계산하지 않았으며, 기존 bar chart 디자인은 변경하지 않았다.

## Q-13 Query Enablement

`useDashboardAssetSummary`의 실제 query 계약에 `enabled`를 전달했다.

- `useBudgetQuery(yearMonth, enabled)`
- `useMyUserQuery(enabled)`
- Memo route(`/report/memos`)에서는 두 query 모두 disabled
- 그 외 Dashboard route에서는 기존처럼 enabled

새 Query key나 invalidation을 추가하지 않았다. 기존 Settings/Pots 호출부는 기본값 `enabled = true`로 동작을 유지한다. Memo route의 summary conversion도 기존 `enabled` 정책을 유지한다.

## Deferred Issues

### Q-06

Onboarding deep-link prerequisite 정책은 현재 product requirement가 확정되지 않았다. 어떤 단계를 강제할지 추측하지 않고 기존 Route Guard 동작을 유지했다.

### Q-10

Profile과 onboarding persistence를 하나의 transaction처럼 보이게 하려면 백엔드 transaction 계약과 부분 실패 복구 UX가 필요하다. 프론트에서 임의 순서 변경이나 rollback 정책을 추가하지 않았다.

### Q-12

Currency API 실패 시 static fallback을 유지할지 error/retry로 차단할지는 제품 정책이 필요하다. 현재 fallback 동작을 변경하지 않았다.

## Tests Added

- `RouteErrorFallback.test.tsx`
  - route fallback 렌더링
  - home recovery navigation
- `useCalendarKeyboard.test.ts`
  - Arrow/Home/End 날짜 이동
  - Escape close 및 trigger focus restore 계약
  - accessible date label 생성
- `CalculatorPage.accessibility.test.tsx`
  - amount/result label과 input id 연결
- `reportComponents.test.tsx`
  - chart accessible summary
  - visual chart `aria-hidden`
  - date button label 및 selected semantics
- `useDashboardAssetSummary.test.tsx`
  - Memo route disabled query
  - Dashboard route enabled query

기존 테스트를 삭제하거나 약화하지 않았다. 기존 Critical 테스트의 직접 page-function 호출 계약도 유지했다.

## Full Test Result

- Release hardening tests: PASS
- Existing Critical/P1/Secure tests: PASS
- Full Vitest: 30 test files, 102/102 tests passed

## TypeScript / ESLint / Build

- TypeScript: `npx tsc -b` — 0 errors
- ESLint: `npm run lint` — 0 errors, 0 warnings
- Production build: `npm run build` — PASS
- API endpoint / request / response contract: unchanged
- New library: none

## Files Modified

### Existing files

- `src/routes/AppRouter.tsx`
- `src/pages/CalculatorPage/CalculatorPage.tsx`
- `src/pages/ExpenseInputPage/ExpenseInputPage.tsx`
- `src/features/report/components/ReportBarChart.tsx`
- `src/features/report/report.module.css`
- `src/hooks/useBudgetQuery.ts`
- `src/hooks/useMyUserQuery.ts`
- `src/hooks/useDashboardAssetSummary.ts`
- `src/features/report/components/reportComponents.test.tsx`

### Files added

- `src/routes/RouteErrorFallback.tsx`
- `src/routes/RouteErrorFallback.module.css`
- `src/routes/routeRecovery.ts`
- `src/routes/RouteErrorFallback.test.tsx`
- `src/hooks/useCalendarKeyboard.ts`
- `src/hooks/useCalendarKeyboard.test.ts`
- `src/hooks/useDashboardAssetSummary.test.tsx`
- `src/pages/CalculatorPage/CalculatorPage.accessibility.test.tsx`

Secure Coding 단계의 `FileUpload` sanitization, session cleanup, token handling, Google Identity handling은 되돌리거나 수정하지 않았다.

## Remaining Backend Requirements

- Route fallback과 별개로 실제 production asset/cache 정책에서 lazy chunk 재배포 전략 확인
- Q-06 onboarding prerequisite product contract 확정
- Q-10 profile/onboarding persistence transaction 및 부분 실패 복구 계약 확정
- Q-12 currency fallback/error 정책 확정
- 기존 Secure Coding 보고서의 authentication, ownership, upload validation, CORS, email provider 요구사항 이행

## Remaining Deployment Requirements

- CSP에서 Google Identity Services script origin과 실제 API `connect-src` allowlist 확인
- `frame-ancestors` 또는 `X-Frame-Options`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy`, `Permissions-Policy`, HSTS
- production에서 lazy chunk 실패 시 fallback과 cache invalidation 동작 확인

## Ready for Browser / E2E QA?

**YES — browser/E2E QA로 진행할 수 있다.**

코드 수준 검증은 완료되었으며, 실제 브라우저에서 다음을 확인하면 된다.

- lazy chunk 또는 route render 실패 시 fallback 표시와 홈/로그인 복구
- Calculator 입력·결과의 screen-reader accessible name
- Expense Input/Report calendar의 실제 focus 이동, Escape 복원, 날짜 선택
- Report chart의 screen-reader 데이터 읽기와 시각 bar 중복 방지
- Memo route의 budget/user network request 미발생 및 다른 Dashboard route의 정상 요청

이번 단계에서는 브라우저 자동화나 E2E 환경 자체는 실행하지 않았다.

