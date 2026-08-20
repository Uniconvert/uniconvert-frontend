# Flickering / Layout Shift Report

## Observed Symptoms

지출 내역 탭(`/expenses`)을 클릭하면 Dashboard shell은 유지되지만 Outlet 내부 콘텐츠가 잠시 비어 보인 뒤 지출 내역 화면이 나타나는 현상이 보고되었다. 특히 초기 데이터 요청이 진행되는 동안 페이지 입장 애니메이션과 Loading 상태가 겹쳐 빈 화면처럼 인지될 가능성이 있었다.

## Confirmed Root Causes

| 위치 | 관측 가능 원인 | 현재 동작 | 수정 필요 여부 |
| --- | --- | --- | --- |
| `src/features/expense/expenseHistory.module.css` | `ui-page-enter`가 `opacity: 0`에서 시작 | 지출 내역 route child가 마운트될 때 초기 Query loading과 함께 콘텐츠가 280ms 동안 투명해짐 | 수정 완료 |
| `src/routes/AppRouter.tsx` | Expense History가 navigation-time `lazy` route로 분리됨 | 클릭 시 route chunk가 준비될 때까지 Outlet의 새 콘텐츠가 표시되지 않을 수 있음 | 수정 완료 |
| `src/pages/ExpenseHistoryPage/ExpenseHistoryPage.tsx` | 데이터가 없을 때 feedback card, 데이터가 도착하면 요약 grid로 조건부 교체 | 초기 요청 완료 시 내부 DOM이 상태에 따라 교체됨 | 기존 상태 계약 유지 |
| `src/features/expense/hooks/useExpenseHistoryData.ts` | range query에 `keepPreviousData` 적용 | 동일 화면의 day/week/month 전환 시 기존 데이터를 유지하고 background fetching | 변경 불필요 |
| `src/layouts/DashboardLayout/DashboardLayout.tsx` | `Outlet`에 pathname 기반 key 없음 | DashboardLayout/Header/Sidebar는 route 전환에서 유지됨 | 변경 불필요 |

## Rejected Hypotheses

- `DashboardLayout` 전체가 route마다 remount되는 구조는 확인되지 않았다. 라우터 중첩 구조에서 `DashboardLayout`은 상위 route element로 유지된다.
- `Outlet key={location.pathname}`와 같은 pathname 기반 강제 remount는 존재하지 않는다. 현재 `Outlet`의 key는 예산 저장 후 의도적으로 cache를 갱신하는 `budgetVersion`뿐이다.
- 모든 route lazy 로딩을 제거하지 않았다. 지출 내역에서만 확인된 navigation-time chunk gap을 줄이기 위해 해당 route만 정적 Component route로 변경했다.
- 이 증상만으로 전체 앱 Full Re-render 또는 FOUC라고 단정할 근거는 확인되지 않았다.
- Expense History range query의 기존 데이터 소실은 `placeholderData: keepPreviousData`로 이미 방지되고 있다.
- SVG donut은 고정 viewBox와 `donutWrap`의 width/height를 사용하므로 이번 탭 진입 증상의 직접 원인으로 확인되지 않았다.

## React Re-render vs Remount

DashboardLayout은 유지되고 Outlet의 route child가 교체된다. 지출 내역 페이지는 새 route child로 마운트된다. 기존에는 route lazy chunk 대기와 `.page`의 page-enter animation이 함께 발생할 수 있어, route content가 비어 보이는 구간이 생겼다.

## React Query Loading Contract

Expense History는 다음 계약을 유지한다.

- history data 없음 + `isLoading`: 기존 전체 LoadingState 표시
- history data 있음 + `isFetching`: 기존 화면 유지, inline LoadingState 표시
- range 변경: `queryKey: ['expense-history', yearMonth, range]` 유지 및 `keepPreviousData` 사용
- 오류: data가 없는 경우 ErrorState와 Retry 표시

## Query Key Transition

`expenseKeys.historyFor(yearMonth, range)`가 실제 range를 포함한다. range 변경 시 새 요청은 계속 수행하며, 이전 데이터를 영구 확정 데이터로 바꾸지 않는다.

## Conditional Rendering

초기에는 feedback card를 표시하고 history data가 준비되면 `ExpenseHistorySummary`로 교체한다. 이는 기존 Empty/Error 계약을 유지하기 위한 상태 전환이며, 이번 수정에서는 API나 상태 의미를 바꾸지 않았다.

## Layout Reservation

데이터가 준비된 이후의 주요 카드 shell은 항상 렌더링된다. 월별 Empty 영역은 `min-height: 19rem`을 사용하고, donut wrapper는 고정된 clamp 크기와 SVG viewBox를 사용한다. 저장 지출 목록은 데이터 개수에 따라 높이가 달라질 수 있어 추가적인 시각 QA가 필요하다.

## Chart Stability

Expense History donut은 `donutWrap`의 width/height와 SVG `viewBox="0 0 272 272"`가 지정되어 있어 데이터 도착 후 측정에 의한 초기 크기 재계산은 확인되지 않았다.

## Animation Interaction

### 수정 전

지출 내역 `.page`에 `ui-page-enter`가 적용되어 `opacity: 0`과 `translateY(6px)`에서 시작했다. 초기 Query loading과 동시에 실행되어 사용자는 콘텐츠가 사라졌다가 나타나는 것처럼 볼 수 있었다.

### 수정 후

Expense History 페이지에서는 page-level entrance animation을 제거했다. 다른 페이지의 animation, dropdown/modal animation, `prefers-reduced-motion` 정책은 변경하지 않았다. Dashboard shell의 animation도 변경하지 않았다.

추가로 Expense History route만 정적 `Component` route로 전환해 navigation-time lazy chunk gap을 제거했다. 다른 페이지의 lazy code-splitting은 유지된다.

## Dashboard Layout Persistence

라우터는 `DashboardRouteGuard → DashboardLayout → Outlet` 중첩 구조를 사용한다. `DashboardLayout`의 Header, Sidebar, page tabs는 route 변경 시 유지된다. `Outlet`의 `budgetVersion` key는 예산 저장 후 갱신 용도로만 사용된다.

## Expense History

이번 변경 범위의 대상이다. 초기 진입 시 LoadingState와 API 요청은 그대로 유지하고, route child 마운트 시 투명해지는 page animation만 제거했다. day/week/month 전환의 기존 `keepPreviousData` 및 background fetching 동작은 유지된다.

## Report

Report 페이지 자체의 async 상태와 chart animation은 이번 작업에서 변경하지 않았다. 별도 Report 전환에서 동일한 증상이 확인되면 별도 측정 후 범위를 정한다.

## Files Changed

- `src/features/expense/expenseHistory.module.css`
  - Expense History page entrance animation 제거
- `src/features/expense/components/expenseHistoryComponents.test.tsx`
  - 데이터가 비어도 주요 카드 shell이 유지되는 회귀 테스트 추가
- `src/routes/AppRouter.tsx`
  - Expense History route를 navigation-time lazy 로딩에서 정적 Component 로딩으로 변경
- `src/routes/AppRouter.publicCalculator.test.ts`
  - Expense History route가 lazy로 되돌아가지 않는 회귀 테스트 추가
- `docs/FLICKERING_LAYOUT_SHIFT_REPORT.md`
  - 조사 결과 및 검증 기록

## Tests Added

- `ExpenseHistorySummary`가 데이터 없음 상태에서도 자산·카테고리·월별·최근 지출의 주요 영역을 유지하는지 검증
- 기존 `useExpenseHistoryData` range transition 테스트(초기 loading, 이전 data 유지, background fetching, 새 data 교체, error/retry)를 유지

## Full Test Result

- Vitest: 39 test files, 135 tests passed

## TypeScript / ESLint / Build

- `npx tsc -b`: PASS
- `npm run lint`: PASS
- `npm run test`: PASS
- `npm run build`: PASS

## Manual Browser QA Required

자동화된 DevTools Performance/Profiler 측정은 이 환경에서 수행하지 않았다. 다음 viewport에서 실제 클릭 전환을 확인해야 한다.

- 1366×768
- 1920×1080
- 2560×1440

확인 흐름:

1. Dashboard 접속
2. 지출 입력 → 지출 내역 클릭
3. 지출 내역 일 → 주 → 월 전환
4. Report, Pots, Settings, Calculator, Memo 이동 후 지출 내역 재진입

각 전환에서 흰색 flash, 전체 콘텐츠 소실, 카드 위치 튐, donut 크기 변화, Sidebar/Header 재생성, scrollbar 좌우 이동이 없는지 확인한다.

## Remaining Risks

- API가 늦거나 실패하면 초기 feedback card에서 콘텐츠 grid로 바뀌는 구조적 전환은 남아 있다. 이는 현재 Error/Loading 계약을 유지하기 위한 동작이다.
- 저장 지출 목록은 항목 수에 따라 카드 높이가 달라질 수 있다.
- 실제 Layout Shift 수치와 animation 체감은 브라우저 viewport 및 네트워크 속도에 따라 달라질 수 있다.

## Ready for Visual QA?

**READY FOR VISUAL QA**

코드 수준의 직접 원인을 최소 수정했고 전체 자동 검증을 통과했다. 최종적으로는 위 viewport에서 지출 내역 탭 클릭과 range 전환을 수동 확인해야 한다.
