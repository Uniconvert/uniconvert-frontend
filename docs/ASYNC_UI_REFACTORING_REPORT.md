# Async UI Refactoring Report

## Before

서버 데이터를 사용하는 화면마다 상태 처리가 서로 달랐습니다.

| 화면 | Initial Loading | Empty | Error | Retry | Background Fetching | 개선 필요 |
|---|---|---|---|---|---|---|
| ExpenseHistory | 페이지 직접 문구 | 카드·목록·모달별 직접 문구 | 페이지·목록·모달 분산 | inline button | 상태 노출 없음 | 초기/백그라운드/오류·빈 상태 구분 |
| Pots | `!data` 문구 | 자체 empty card | 자체 error card | 자체 button | 상태 노출 없음 | Query 상태 공통화 |
| Report | 페이지 직접 문구 | 차트·거래 목록별 분산 | 자체 feedback card | 자체 button | 상태 노출 없음 | report/expense Query 상태 결합 |
| Memo | `isLoading` 문구 | 자체 empty card | 자체 문구 + retry | inline button | refetch 시 전체 loading | 기존 데이터 유지 |
| Calculator | history/quote별 문구 | history 자체 UI | history/quote 분산 | retry 중복 | 명시적 상태 없음 | 상태 컴포넌트 중복 제거 |
| Settings | Preview 상태 미표시 | `-` placeholder | inline alert | Preview retry 없음 | 상태 노출 없음 | Preview와 사용자 정보 상태 구분 |
| DashboardLayout | fallback 숫자 표시 | 해당 없음 | toast만 표시 | 없음 | 상태 노출 없음 | 예산/요약 초기 Skeleton |
| Onboarding | 통화 API 실패 시 기본 목록 fallback | 기본 목록이 Empty 대체 | 일부 저장 toast | 통화 목록 retry 없음 | fallback 유지 | 기존 fallback 계약을 깨지 않는 별도 개선 필요 |

## Async State Policy

서버 데이터 화면의 기본 상태 계약을 다음과 같이 적용했습니다.

```text
Initial Loading
↓
Success
├─ Data
└─ Empty

Error

Background Fetching
```

- Initial Loading: 사용자에게 기존 데이터가 없을 때만 `LoadingState`를 표시합니다.
- Success + Data: 기존 화면 콘텐츠를 유지합니다.
- Success + Empty: API 성공 후 배열이 비어 있는 경우 `EmptyState`를 표시합니다.
- Error: 초기 데이터가 없을 때 `ErrorState`와 실제 retry action을 표시합니다.
- Background Fetching: 기존 데이터가 있으면 화면을 교체하지 않고 작은 inline loading indicator만 표시합니다.
- React Query 화면에서는 `isLoading`을 초기 상태, `isFetching`을 재조회 상태로 사용했습니다.

## Components Added

- `LoadingState`: `message`, `size`, `variant`(`panel`/`inline`), `role="status"`, `aria-live`, `aria-busy`
- `EmptyState`: `title`, `description`, `icon`, `actionLabel`, `onAction`, `variant`
- `ErrorState`: `title`, `description`, `retryLabel`, `onRetry`, `variant`, `role="alert"`
- `Skeleton`: `width`, `height`, `variant`(`text`/`rect`/`circle`)

모든 상태 컴포넌트는 기존 CSS Module과 design token을 사용하며 외부 UI 라이브러리를 추가하지 않았습니다.

## Pages Updated

- ExpenseHistoryPage
- PotsPage
- ReportPage
- MemoPage
- CalculatorPage
- SettingsPage
- DashboardLayout의 예산/자산 요약 영역

ExpenseInputPage의 Critical 환율 저장 guard와 API 계약은 변경하지 않았습니다. Onboarding 통화 목록도 기본 목록 fallback 동작을 유지하기 위해 이번 범위에서는 이동하지 않았습니다.

## Loading Strategy

- ExpenseHistory, Pots, Report의 초기 Query 실패와 로딩을 명시적으로 분리했습니다.
- Memo는 기존 memo 데이터가 있을 때 재조회 중 전체 목록을 지우지 않고 inline loading을 사용합니다.
- Calculator의 환율 계산은 기존 inline status를 유지하고, 계산 내역 loading은 공통 `LoadingState`로 통일했습니다.
- Settings의 사용자/리포트 Preview Query는 초기 loading과 background fetching을 분리했습니다.
- Dashboard 예산/자산 요약은 실제 레이아웃 이동을 줄이기 위해 `Skeleton`을 사용했습니다.

## Skeleton Strategy

범용 Skeleton을 과도하게 페이지에 삽입하지 않았습니다. Dashboard 요약처럼 고정된 숫자 영역에서 fallback `0`이 실제 성공 데이터처럼 보이는 문제가 있어 해당 영역에만 적용했습니다. ExpenseHistory, Pots, Report의 기존 feedback card는 레이아웃 특성이 강해 이번 단계에서는 공통 LoadingState를 유지했습니다.

## Empty State Strategy

API가 정상 성공했지만 데이터가 없는 경우에만 `EmptyState`를 사용합니다.

- ExpenseHistory: 월 지출, 최근 지출, 선택 월 모달
- Pots: Pot 목록 없음
- Memo: 메모 없음/검색 결과 없음
- Calculator: 계산 내역 없음
- Settings: Preview 데이터 없음

도메인별 문구와 이미지는 페이지에서 Props로 전달하고 공통 컴포넌트에는 하드코딩하지 않았습니다.

## Error / Retry Strategy

- 초기 핵심 데이터 실패는 `ErrorState`로 표시하고 실제 `retry`, `refetch`, 재조회 함수를 연결했습니다.
- 기존 데이터가 있는 background refetch 실패는 기존 화면을 유지합니다.
- 서버 내부 오류 원문은 `getApiErrorNotice`를 거쳐 사용자용 문구만 표시합니다.
- Retry가 의미 없는 화면에는 새 버튼을 추가하지 않았습니다.

## Accessibility

- Loading: `role="status"`, `aria-live="polite"`, `aria-busy="true"`
- Error: `role="alert"`
- Retry/Action: 실제 `<button type="button">`
- Skeleton: `aria-hidden="true"`
- 기존 페이지의 제목, dialog, listbox, form semantics는 유지했습니다.

## Tests Added

- `src/components/common/AsyncState.test.tsx`
  - LoadingState 기본 렌더링과 message
  - EmptyState title/description/action 및 action 실행
  - ErrorState 오류 문구/retry 및 retry 실행
- Skeleton은 시각적 primitive로 별도 테스트를 추가하지 않았습니다.

기존 Critical 회귀 테스트 7개와 기존 테스트는 수정하지 않았습니다.

## Full Test Result

- 전체 Vitest: 테스트 파일 10/10 PASS, 테스트 35/35 PASS
- 기존 테스트: 24/24 PASS
- Critical Regression Tests: 7/7 PASS
- 신규 공통 상태 테스트: 4/4 PASS

## TypeScript / ESLint / Build

- TypeScript typecheck: PASS, error 0
- ESLint: PASS, error 0 / warning 0
- Production build: PASS
- Build warning/error: 없음

## Files Added

- `src/components/common/LoadingState/LoadingState.tsx`
- `src/components/common/LoadingState/LoadingState.module.css`
- `src/components/common/EmptyState/EmptyState.tsx`
- `src/components/common/EmptyState/EmptyState.module.css`
- `src/components/common/ErrorState/ErrorState.tsx`
- `src/components/common/ErrorState/ErrorState.module.css`
- `src/components/common/Skeleton/Skeleton.tsx`
- `src/components/common/Skeleton/Skeleton.module.css`
- `src/components/common/AsyncState.test.tsx`
- `docs/ASYNC_UI_REFACTORING_REPORT.md`

## Files Modified

- `src/hooks/useExpenseHistoryData.ts`
- `src/hooks/usePotsData.ts`
- `src/hooks/useMonthlyReportData.ts`
- `src/hooks/useDashboardAssetSummary.ts`
- `src/pages/ExpenseHistoryPage/ExpenseHistoryPage.tsx`
- `src/pages/PotsPage/PotsPage.tsx`
- `src/pages/ReportPage/ReportPage.tsx`
- `src/pages/MemoPage/MemoPage.tsx`
- `src/pages/CalculatorPage/CalculatorPage.tsx`
- `src/pages/SettingsPage/SettingsPage.tsx`
- `src/layouts/DashboardLayout/DashboardLayout.tsx`

Critical Fix 관련 기존 구현 파일은 이번 단계에서 동작을 변경하지 않았습니다.

## Remaining Issues

- Onboarding 통화 목록은 기존 기본 목록 fallback을 유지하고 있어 공통 Error/Retry UI가 아직 연결되지 않았습니다.
- ExpenseInput의 환율 오류 문구와 Dashboard 요약 계산 오류는 기존 inline/toast 계약을 유지했습니다.
- React Query 전체 통일, useMutation 도입, feature 폴더 이동, 대규모 페이지 분리는 범위 밖입니다.
- 페이지별 전용 Skeleton을 더 세밀하게 설계하는 작업은 실제 화면 캡처/UX 검토 후 별도 단계가 필요합니다.

## Ready for Next Step?

**READY WITH ISSUES** — 이번 범위의 공통 상태 컴포넌트와 우선순위 화면 적용은 완료되었고 모든 검증이 통과했습니다. 다만 Onboarding fallback, ExpenseInput inline error, 전체 Query 구조 통일은 남아 있으며, 요청에 따라 다음 리팩터링 단계는 진행하지 않고 여기서 중단합니다.
