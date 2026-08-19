# Critical Fix Report

## Fixed Issues

1. 환율 조회가 loading, error, idle 또는 유효하지 않은 값인 상태에서 지출 저장이 가능했던 문제
2. 지출 내역 핵심 API가 모두 실패해도 0원·빈 배열 성공 객체로 반환되던 문제

## Root Cause

### 환율 저장

`ExpenseInputPage`의 저장 버튼은 금액만 확인했고, submit handler도 금액과 저장 중 상태만 검사했습니다. `useExpenseInputData`에는 loading/error 플래그가 있었지만 저장 조건에 연결되지 않았고, 환율이 준비됐는지 판단하는 명시적 상태도 없었습니다.

### 지출 내역 전체 실패

`buildRealHistory`가 실제 요청 대신 항상 resolve되는 빈 `expenseResponses` 객체를 `Promise.all`에 포함하고 있었습니다. 따라서 전체 실패 판정에서 해당 값이 절대 `null`이 되지 않아, 모든 핵심 요청이 실패해도 빈 성공 모델이 반환됐습니다.

## Implementation

### 환율 저장 보호

- `ExchangeRateStatus`를 `idle | loading | ready | error`로 도입했습니다.
- `available === true`이고 유한한 양수인 환율만 사용할 수 있는 환율로 인정합니다.
- query의 `isLoading`뿐 아니라 재조회 중인 `isFetching`도 `loading`으로 처리합니다.
- 저장 버튼과 submit handler 모두 다음 조건을 적용합니다.
  - 금액이 0보다 큼
  - 환율 상태가 `ready`
  - 환율 값이 유한한 양수
  - 현재 저장 중이 아님

### 지출 내역 전체 실패 보호

- 항상 성공하는 가짜 `expenseResponses`를 제거했습니다.
- summary 또는 월/범위 category 집계 응답 중 하나라도 성공했는지 명시적으로 확인합니다.
- 핵심 집계 응답이 모두 실패하면 `지출 내역을 불러오지 못했습니다.`를 throw합니다.
- 일부 요청만 실패한 경우에는 기존의 성공 응답 기반 부분 데이터 fallback을 유지합니다.

## Files Modified

- `src/hooks/useExpenseInputData.ts`
- `src/pages/ExpenseInputPage/ExpenseInputPage.tsx`
- `src/api/expenses.ts`
- `docs/CRITICAL_FIX_REPORT.md`

기존에 추가된 회귀 테스트 파일은 수정하지 않았습니다.

## Regression Tests

- Critical 테스트: 7/7 PASS
  - 환율 성공 저장 가능: PASS
  - 환율 loading 저장 차단: PASS
  - 환율 error 저장 차단: PASS
  - 환율 미준비 저장 차단: PASS
  - 지출 내역 전체 성공: PASS
  - 지출 내역 부분 성공: PASS
  - 지출 내역 전체 실패 오류 처리: PASS
- 기존 테스트: 24/24 PASS

## Full Test Result

- Vitest: 테스트 파일 9/9 PASS, 테스트 31/31 PASS
- Critical targeted Vitest: 7/7 PASS

## TypeScript / ESLint / Build

- TypeScript typecheck: PASS, 오류 0건
- ESLint: PASS, error 0건 / warning 0건
- Production build: PASS
- Build warning/error: 없음

## Behavior Before

- 환율 loading/error/not-ready 상태에서도 금액만 입력하면 저장 버튼이 활성화됐습니다.
- 우회적으로 submit handler가 호출돼도 환율 상태를 검사하지 않았습니다.
- 지출 내역 핵심 API가 모두 실패하면 0원·빈 배열 성공 객체가 반환됐습니다.

## Behavior After

- 정상 환율 조회가 완료된 `ready` 상태에서만 저장할 수 있습니다.
- loading, error, idle, 유효하지 않은 환율, 저장 중 상태에서는 버튼과 submit handler 모두 저장을 차단합니다.
- 지출 내역 핵심 집계 요청이 모두 실패하면 지정된 오류가 발생합니다.
- 전체 성공 및 부분 성공의 기존 데이터 반환 테스트는 계속 통과합니다.

## Remaining Risks

- 이번 범위는 두 Critical 이슈에 한정했으며, 구조 리팩터링이나 E2E 테스트 보강은 진행하지 않았습니다.
- 환율 API가 HTTP 성공이지만 잘못된 응답 형태를 반환하는 경우는 `ready`가 아닌 오류 상태로 차단합니다. 실제 서버의 응답 계약 변경 여부는 별도 확인이 필요합니다.

## Ready for Next Refactoring Step?

**READY** — 이번 수정 범위의 Critical 회귀 테스트, 기존 테스트, typecheck, lint, production build가 모두 통과했습니다. 다만 요청에 따라 다음 리팩터링 단계는 진행하지 않고 여기서 중단합니다.
