# Critical Regression Test Report

- 기준 문서: `docs/FRONTEND_BASELINE_REPORT.md`
- 목적: Critical 이슈를 수정하지 않고 현재 잘못된 동작을 재현 테스트로 고정
- 실행일: 2026-08-18
- 구현 코드 수정: 없음
- API 계약 변경: 없음
- 기존 테스트 삭제·수정: 없음

## Added Tests

### 1. 환율 오류 저장 문제

파일: `src/pages/ExpenseInputPage/ExpenseInputPage.critical.test.tsx`

페이지 전체를 브라우저 E2E로 렌더링하지 않고, React hook·API·공통 UI를 최소 mock으로 대체한 뒤 실제 `ExpenseInputPage`가 생성하는 저장 Button의 `disabled` 계약만 확인했다.

추가한 테스트:

1. `allows saving when the exchange rate request succeeds`
2. `should prevent expense submission when exchange rate request is loading`
3. `should prevent expense submission when exchange rate request fails`
4. `should prevent expense submission before an exchange rate is ready`

### 2. 지출 내역 전체 API 실패 문제

파일: `src/api/expenses.critical.test.ts`

`getExpenseHistory` service를 mock API 응답으로 직접 검증했다. 성공·부분 실패·전체 실패를 서로 다른 연월 key로 실행해 내부 요청 캐시의 영향을 피했다.

추가한 테스트:

1. `returns normal expense history data when all core APIs succeed`
2. `keeps partial expense history data when a non-critical API fails`
3. `should throw an error when all expense history requests fail`

## Reproduced Issues

### 환율 조회 성공

- 결과: PASS
- 금액이 있고 환율이 정상인 경우 저장 Button이 활성화된다.
- 이는 정상 저장 가능 상태의 현재 기준선이다.

### 환율 조회 중

- 결과: FAIL
- 기대: `disabled=true`
- 실제: `disabled=false`
- 환율 Query가 loading이어도 금액만 입력돼 있으면 저장 Button이 활성화된다.

### 환율 조회 실패

- 결과: FAIL
- 기대: `disabled=true`
- 실제: `disabled=false`
- 화면에는 환율 오류와 재시도 버튼이 표시되지만, 저장 Button은 차단되지 않는다.

### 환율 데이터 미준비

- 결과: FAIL
- 기대: `disabled=true`
- 실제: `disabled=false`
- 환율 값이 0 또는 준비되지 않은 상태여도 금액 입력만으로 저장 가능 상태가 된다.

### 지출 내역 핵심 API 전체 성공

- 결과: PASS
- 예산 1,000, 지출 200, 잔여 800, 카테고리 1건이 정상적인 화면 모델로 반환된다.

### 지출 내역 일부 API 실패

- 결과: PASS
- 예산·카테고리 요청이 실패해도 summary가 성공하면 부분 데이터가 반환된다.
- 현재 service의 부분 성공 fallback 동작을 기준선으로 고정했다.

### 지출 내역 핵심 API 전체 실패

- 결과: FAIL
- 기대: `지출 내역을 불러오지 못했습니다.` 오류를 throw
- 실제: `monthlyBudgetHome=0`, `monthlyExpenseHome=0`, `categories=[]`인 성공 객체로 resolve
- Empty/0원 데이터처럼 처리되는 Critical 이슈가 재현됐다.

## Passing Tests

### 새로 추가한 테스트

- 7개 중 3개 통과
  - 환율 성공 1개
  - 지출 내역 전체 성공 1개
  - 지출 내역 부분 성공 1개

### 기존 테스트

- 기존 24개 전부 통과

### 전체 Vitest

```text
Test Files  2 failed | 7 passed (9)
Tests       4 failed | 27 passed (31)
```

## Failing Tests

총 4개가 실패했다.

| 테스트 | 실패 원인 분류 | 관찰된 실제 동작 |
|---|---|---|
| exchange rate loading | 구현 문제 | `disabled=false` |
| exchange rate error | 구현 문제 | `disabled=false` |
| exchange rate not ready | 구현 문제 | `disabled=false` |
| all expense history APIs fail | 구현 문제 | 0원/빈 성공 객체 resolve |

초기 targeted test 실행에서 발생한 `mockButton` hoisting 오류는 테스트 작성 문제였으며, `vi.hoisted` mock으로 수정했다. 수정 후 남은 4개 실패는 모두 테스트 runner나 mock 오류가 아닌 현재 구현의 실제 동작이다.

## Root Cause

### 1. 환율 오류 저장

`ExpenseInputPage`의 저장 Button은 현재 다음 조건만 사용한다.

```tsx
disabled={numericAmount <= 0}
```

`useExpenseInputData`는 `isRateLoading`과 `isRateError`를 반환하지만 페이지의 저장 조건과 submit guard에서 이를 사용하지 않는다. submit handler도 `numericAmount <= 0 || isSaving`만 검사한다.

추가로 hook 내부의 rate 처리에는 다음 특성이 있다.

- `rateQuery.data`가 없을 때 Promise가 reject되지 않아 query error가 fallback catch로 전달되지 않는다.
- `isTemporaryRate`가 항상 `false`다.
- rate 상태가 “ready”인지 구분하는 명시적 상태가 없다.

관련 구현:

- `src/hooks/useExpenseInputData.ts:108`
- `src/hooks/useExpenseInputData.ts:133`
- `src/pages/ExpenseInputPage/ExpenseInputPage.tsx:107`
- `src/pages/ExpenseInputPage/ExpenseInputPage.tsx:242`

### 2. 지출 내역 전체 실패

`buildRealHistory` 내부에서 `expenseResponses`가 실제 API 응답이 아니라 항상 resolve되는 빈 객체로 선언된다.

```ts
Promise.resolve({ expenses: [], mascotMessages: [] })
```

그 뒤 전체 실패 판정은 `expenseResponses === null`을 요구한다. 따라서 summary, category, budget, remaining budget, user context가 모두 실패해도 해당 조건이 성립하지 않고, 빈 배열·0원 값으로 화면 모델을 만든다.

관련 구현:

- `src/api/expenses.ts:296`
- `src/api/expenses.ts:314`
- `src/api/expenses.ts:323`
- `src/api/expenses.ts:356`

이번 단계에서는 이 구현을 수정하지 않았다.

## Files Added / Modified

### Added

- `src/pages/ExpenseInputPage/ExpenseInputPage.critical.test.tsx`
- `src/api/expenses.critical.test.ts`
- `docs/CRITICAL_REGRESSION_TEST_REPORT.md`

### Modified

- 없음

기존 테스트 파일과 구현 파일은 수정하지 않았다. 기존 baseline/refactoring 보고서도 수정하지 않았다.

## Verification Commands

### TypeScript

```text
npx tsc --project tsconfig.app.json --pretty false
```

- PASS
- 오류 0건

### ESLint

```text
npm run lint
```

- PASS
- Error 0건
- Warning 0건
- 자동 fix 미실행

### Full Vitest

```text
npm test
```

- 기존 테스트 24개: 전부 통과
- 새 테스트 7개: 3개 통과, 4개 의도된 재현 실패
- 전체: 27개 통과, 4개 실패

### Critical tests only

```text
npx vitest run src/pages/ExpenseInputPage/ExpenseInputPage.critical.test.tsx src/api/expenses.critical.test.ts
```

- 3개 통과
- 4개 실패
- 테스트 작성 오류 없이 재현 완료

## Ready for Fix?

### YES — READY FOR IMPLEMENTATION

두 Critical 이슈 모두 현재 구현에서 재현되는 최소 테스트가 확보됐다.

- 환율 테스트는 정상 상태 1개가 통과하고, loading/error/not-ready 보호 조건 3개가 현재 구현에서 실패한다.
- 지출 내역 테스트는 정상·부분 성공이 유지되며, 전체 실패가 빈 성공 객체로 처리되는 문제가 실패로 고정됐다.
- TypeScript와 ESLint가 통과해 테스트 자체의 정적 오류는 없다.
- 기존 24개 테스트는 모두 통과해 기존 기준선이 훼손되지 않았다.

다음 단계에서만 실제 구현을 수정하고, 수정 후 이 7개 테스트가 모두 통과하는지 확인하면 된다. 이번 단계에서는 재현 테스트 확보에서 중단했다.
