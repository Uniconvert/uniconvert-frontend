# Release Hardening Report

## Completed Hardening

### Route Error Recovery

`AppRouter`의 top-level route root에 공통 `errorElement`를 연결했습니다. lazy route chunk 로드 실패와 route render 예외는 `RouteErrorFallback`으로 표시하며, 내부 예외 내용은 노출하지 않습니다.

Fallback은 홈 이동과 로그인 이동을 제공합니다. 기존 `ErrorState` 스타일을 재사용하고 API 계약이나 대규모 ErrorBoundary 구조는 변경하지 않았습니다.

### Calculator Accessibility

Calculator의 금액 입력과 결과 입력에 고유 `id`를 추가하고 visible label과 `<label htmlFor>`로 연결했습니다.

- `calculator.amount` → `calculator-from-amount`
- `calculator.result` → `calculator-to-amount`

### Calendar and Chart Accessibility

Expense Input과 Report의 custom calendar에 키보드 이동, 날짜 라벨, 선택 semantics, trigger focus 복원 동작을 적용했습니다. `ReportBarChart`의 시각 bar는 `aria-hidden="true"`로 처리하고 동일한 실제 dataset을 visually hidden list로 제공합니다.

### Query Enablement

`useDashboardAssetSummary`는 실제 query 계약에 따라 `enabled`를 전달합니다. Dashboard route에서는 budget/user query를 활성화하고 Memo route(`/report/memos`)에서는 비활성화합니다. 기존 Query key와 invalidation은 변경하지 않았습니다.

## Deferred Issues

- Onboarding deep-link prerequisite 정책
- Profile/onboarding persistence transaction 및 부분 실패 복구
- Currency API 실패 시 fallback/error 정책
- 인증·ownership·upload validation·CORS·email provider에 대한 백엔드 계약

제품 요구사항이나 백엔드 계약이 확정되지 않은 항목은 임의로 변경하지 않았습니다.

## Tests and Verification

- Vitest: 39개 파일 / 135개 테스트 통과
- TypeScript: 오류 0개
- ESLint: 오류·경고 0개
- Production build: 통과
- GitHub Actions PR 검사: 통과

## Latest Release Updates

PR [#34](https://github.com/Uniconvert/uniconvert-frontend/pull/34)에서 API·Google 로그인·Google Apps Script origin을 제한하는 CSP와 계산기 최근 내역 긴 값의 말줄임 처리를 반영했습니다. API request/response 계약과 기존 hardening 동작은 변경하지 않았습니다.

## Deployment Verification

배포 전 CSP 및 보안 응답 헤더, lazy chunk 복구, calendar focus, chart screen-reader 데이터, Memo route query, `/offline` 설치와 Gmail PNG 수신을 실제 환경에서 확인합니다.

코드 수준 검증은 완료되었으며 위 항목은 브라우저·배포 환경 QA 대상으로 남아 있습니다.
