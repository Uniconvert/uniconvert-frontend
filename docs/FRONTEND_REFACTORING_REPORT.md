# Uniconvert 프론트엔드 구조 재검토 및 리팩터링 보고서

- 분석 대상: `C:\Users\COM\uniconvert`
- 분석 기준: 제공된 리팩터링 요구사항, 현재 `src/` 구현, `docs/` 협업 규칙
- 목적: 기존 기능·UI·API 계약을 유지하면서 유지보수성과 기능 확장성을 높이는 구조 제안
- 범위: 구조, 컴포넌트, Props, 상태, API, 타입, 폴더, 코드 품질, 접근성, 테스트 가능성
- 원칙: 이번 보고서는 분석과 계획 단계이며, 기존 구현 코드는 변경하지 않음

## 1. 요약

현재 프로젝트는 React 19 + TypeScript + Vite + React Router + TanStack Query를 사용하는 전형적인 화면 중심 애플리케이션이다. `layouts`, `pages`, `components`, `hooks`, `api`, `types`, `utils`, `constants`가 이미 분리되어 있어 출발점은 양호하다.

다만 핵심 화면이 페이지 단위로 계속 커지면서 서버 데이터, 화면 상태, 도메인 규칙, 렌더링이 한 파일에 함께 들어가 있다. 특히 Report, ExpenseHistory, DashboardLayout, Settings가 대표적이다. Loading/Error/Empty 처리도 화면마다 별도로 작성되어 공통 정책이 없고, React Query와 수동 `useEffect` API 호출이 혼재한다.

가장 위험한 문제는 다음과 같다.

1. 환율 조회 오류가 발생해도 이전 환율로 지출을 저장할 수 있어 금액 데이터가 잘못 기록될 수 있다.
2. 지출 내역 API 전체 실패가 오류가 아닌 0원/빈 데이터로 표시될 가능성이 있다.
3. 공통 모달과 Report 이메일 모달의 포커스 트랩·포커스 복원이 부족하다.
4. Settings의 저장 진행 상태와 일부 오류 상태가 불완전하다.
5. 컴포넌트 테스트와 훅 테스트가 없어 구조 변경 시 회귀를 빠르게 잡기 어렵다.

따라서 전체를 한 번에 재작성하기보다, 공통 상태 UI와 위험도가 높은 데이터 흐름을 먼저 안정화한 뒤 기능 단위로 점진적으로 `features/` 구조로 이동하는 것이 적절하다.

## 2. 현재 구조 분석

### 2.1 현재 폴더 구조

```text
src/
├─ api/                 API client와 도메인 API 함수
├─ auth/                세션·인증 저장소
├─ components/
│  ├─ auth/
│  ├─ common/
│  ├─ onboarding/
│  └─ pots/
├─ constants/            선택지·이미지·프로필 상수
├─ hooks/                React Query 및 수동 데이터 훅
├─ i18n/                 번역 Provider·언어 처리
├─ layouts/              AuthLayout, DashboardLayout
├─ pages/                라우트별 화면
├─ routes/               Router와 Route Guard
├─ styles/               reset, tokens, globals
├─ types/                API·도메인·화면 모델
└─ utils/                날짜·통화·환율·API 오류 등 순수 함수
```

### 2.2 잘 되어 있는 점

- 페이지와 Layout이 분리되어 있고, `AuthLayout`과 `DashboardLayout`이 라우팅 계층에서 재사용된다.
- CSS Module을 사용해 페이지 스타일과 전역 스타일의 충돌을 줄였다.
- `Button`, `TextField`, `ModalShell`, `Toast`, `CurrencyDropdown` 같은 반복 UI가 이미 공통 컴포넌트로 분리되어 있다.
- `api/client.ts`의 `ApiError`, 공통 헤더, 토큰 재발급, `ApiResponse<T>` 처리는 API 계층의 공통 책임을 잘 모은 편이다.
- DTO에서 화면 모델로 정규화하는 코드가 `expenses.ts`, `reports.ts`, `pots.ts`에 존재한다.
- route guard가 인증·이메일 인증·온보딩 완료 상태를 라우팅 계층에서 처리한다.
- `tokens.css`에 색상·간격·radius·shadow·transition의 기본 토큰이 있다.

### 2.3 구조상 주요 문제

| 영역 | 관찰 결과 |
|---|---|
| 페이지 크기 | Report 731줄, ExpenseHistory 504줄, DashboardLayout 482줄 등 한 파일에 여러 책임이 집중됨 |
| 상태 관리 | React Query와 수동 `useEffect` + `useState`가 혼재하며 서버 상태와 UI 상태가 중복됨 |
| 공통 UI | Loading/Error/Empty/Skeleton/Select/DatePicker 정책이 공통화되지 않음 |
| API | `api/`의 서비스 함수, Query 훅, 페이지 내부 fetch가 기능별로 다른 패턴을 사용함 |
| 타입 | 기본 도메인 모델은 있으나 API DTO와 화면 모델이 일부 페이지에서 직접 결합됨 |
| 스타일 | 토큰이 존재하지만 페이지 CSS와 inline style에 색상·크기·gradient가 반복됨 |
| 접근성 | 기본 ARIA는 양호하나 Modal focus trap, custom listbox 키보드 조작, 차트 요약이 불완전함 |
| 테스트 | API client·utils 위주로 7개 파일 24개 테스트가 있으며 컴포넌트·훅·페이지 테스트는 없음 |
| 정리 필요 | 사용되지 않는 `HomePage`, `AutoSavingsCard`, `useExchangeCalculatorData` 등 잔여 코드가 있음 |

## 3. 문제점 분류 및 우선순위

### Critical

#### C-01. 환율 오류 상태에서 저장 가능

- 현재 문제: `useExpenseInputData`의 환율 오류 처리에서 Query 오류가 수동 Promise 체인에 전달되지 않으며, `isTemporaryRate`가 항상 `false`다. ExpenseInput 화면은 환율 오류를 보여주지만 저장 버튼은 금액만 있으면 활성화된다.
- 왜 문제인가: 환율이 오래된 값이거나 기본값인 상태에서 실제 지출이 저장되면 금액·예산·리포트 값이 연쇄적으로 틀어진다.
- 개선 방법: `rateStatus: 'idle' | 'loading' | 'ready' | 'error'`를 명시하고 `ready`가 아니면 저장을 막는다. Query의 `data`, `error`, `isFetching`을 직접 사용하고 fallback 환율 사용 여부를 명시한다.
- 영향 파일: `src/hooks/useExpenseInputData.ts`, `src/pages/ExpenseInputPage/ExpenseInputPage.tsx`, `src/components/common/Button/Button.tsx`

#### C-02. 지출 내역 전체 실패가 빈 데이터로 숨겨질 가능성

- 현재 문제: `buildRealHistory`에서 `expenseResponses`를 항상 성공한 빈 객체로 채우기 때문에 모든 보고서·카테고리·예산 요청이 실패해도 전체 실패 조건이 작동하지 않는다.
- 왜 문제인가: 사용자는 서버 오류를 빈 내역으로 오해하고, 잘못된 0원 화면에서 추가 작업을 할 수 있다.
- 개선 방법: 각 요청의 성공·실패를 명시하는 결과 타입을 사용하고, 핵심 데이터가 모두 실패한 경우에만 `ApiError`를 던진다. 부분 성공 시에는 화면에 “일부 데이터만 표시”를 알린다.
- 영향 파일: `src/api/expenses.ts`, `src/hooks/useExpenseHistoryData.ts`, `src/pages/ExpenseHistoryPage/ExpenseHistoryPage.tsx`

### High

#### H-01. 공통 Modal의 포커스 관리 부족

- 현재 문제: 모달을 열 때 컨테이너에 포커스만 주고, Tab 포커스 트랩과 닫힌 뒤 트리거 복원이 없다.
- 왜 문제인가: 키보드 사용자와 스크린리더 사용자가 모달 외부로 이동하거나, 닫은 뒤 현재 위치를 잃는다.
- 개선 방법: 열기 전 `document.activeElement` 저장, 첫 조작 요소로 포커스 이동, Tab 순환, ESC 처리, 닫힌 후 트리거 복원을 `ModalShell`에 일관되게 구현한다.
- 영향 파일: `src/components/common/ModalShell/ModalShell.tsx`

#### H-02. Report 이메일 모달이 공통 모달 계층을 우회

- 현재 문제: Report 이메일 모달이 직접 Portal을 만들며 `role="dialog"`, `aria-modal`, 명확한 닫기 버튼, focus 관리가 없다.
- 왜 문제인가: 모달마다 접근성·스크롤·닫기 동작이 달라지고 회귀가 반복된다.
- 개선 방법: `ModalShell` 또는 같은 계약의 `Dialog` 컴포넌트로 통합한다. 이메일 미리보기 전용 내용만 feature 컴포넌트에 둔다.
- 영향 파일: `src/pages/ReportPage/ReportPage.tsx`, `src/components/common/ModalShell/ModalShell.tsx`

#### H-03. 실패한 GET Promise를 캐시에 보관

- 현재 문제: `cachedApiRequest`가 성공·실패와 관계없이 Promise를 60초 캐시한다.
- 왜 문제인가: 사용자가 즉시 재시도해도 같은 reject Promise를 재사용할 수 있다.
- 개선 방법: `request.catch(() => { cache.delete(path); throw error })` 형태로 실패 시 캐시를 제거한다. 가능하면 캐시는 Query Client로 통합한다.
- 영향 파일: `src/api/cachedRequests.ts`, `src/api/emailReports.ts`, `src/api/expenses.ts`

#### H-04. 페이지에 서버 상태와 UI 상태가 함께 집중

- 현재 문제: Report는 차트·달력·메일 모달·거래 조회·전송 상태를, Settings는 프로필·이메일 리포트·시간 선택·미리보기를 한 파일에서 관리한다.
- 왜 문제인가: 변경 영향 범위가 넓고 단위 테스트 작성이 어렵다.
- 개선 방법: `useReportPageState`, `useEmailReportSettings`, `DailyExpenseChart`, `MonthlyExpenseChart`, `EmailReportDialog`처럼 기능 단위로 분리한다.
- 영향 파일: `src/pages/ReportPage/ReportPage.tsx`, `src/pages/SettingsPage/SettingsPage.tsx`, `src/layouts/DashboardLayout/DashboardLayout.tsx`

### Medium

#### M-01. Loading/Error/Empty 구현의 불일치

- 현재 문제: 어떤 화면은 문장 하나, 어떤 화면은 카드, 어떤 화면은 별도 CSS를 사용한다. 공통 `EmptyState`, `ErrorState`, `Skeleton`이 없다.
- 개선 방법: 공통 primitive를 만들고 화면별 문구·일러스트·CTA만 Props로 주입한다. 초기 로딩과 백그라운드 재조회(`isLoading` vs `isFetching`)를 구분한다.

#### M-02. Custom Select/Listbox의 키보드 계약 부재

- 현재 문제: CurrencyDropdown, Report, Memo, Calculator의 custom listbox가 마우스 중심이며 Arrow/Home/End/Enter 규칙이 통일되어 있지 않다.
- 개선 방법: 우선 네이티브 `<select>`로 대체 가능한 곳은 대체하고, 유지가 필요한 곳은 `useListboxKeyboard`와 공통 `Select` 계약을 적용한다.

#### M-03. 금액 입력 규칙이 통화별로 일관되지 않음

- 현재 문제: `CurrencyAmountInput`은 숫자 이외를 모두 제거해 소수 통화를 표현하지 못하고, Pots slider는 모든 통화에서 10,000 단위다.
- 개선 방법: 통화 metadata에 `minorUnit`, `step`, `maximumFractionDigits`를 두고 입력·표시·검증에 동일하게 사용한다.

#### M-04. Settings 저장 상태와 시간 선택 오류

- 현재 문제: 프로필·이메일 설정 저장 중 중복 제출을 차단하는 공통 상태가 없고, 시간 목록이 `01:00~24:00`으로 생성된다. 이메일 설정 성공 메시지도 프로필 업데이트 문구를 재사용한다.
- 개선 방법: mutation 상태를 Button에 연결하고, `00:00~23:00`을 생성하며, 기능별 성공·실패 메시지를 분리한다.
- 영향 파일: `src/pages/SettingsPage/SettingsPage.tsx`

#### M-05. 토큰과 하드코딩 스타일 혼재

- 현재 문제: 토큰은 있으나 Report/Memo 등 페이지 CSS와 inline style에 색상·간격·gradient·z-index가 반복된다.
- 개선 방법: 먼저 실제 반복 값만 semantic token으로 승격한다. 모든 색상을 무리하게 토큰화하지 말고 브랜드 색, 상태 색, surface, chart palette부터 정리한다.

#### M-06. API DTO와 화면 모델 경계가 기능별로 다름

- 현재 문제: 일부 API는 DTO→도메인 정규화를 수행하지만 일부 페이지는 DTO 필드를 직접 읽고 `as` assertion을 사용한다.
- 개선 방법: `api/dto`, `domain`, `features/*/model` 세 층을 필요한 기능부터 적용한다. 모든 응답에 거대한 공통 모델을 만들지 않는다.

### Low

#### L-01. 사용되지 않는 파일 및 중복 구현

- 현재 문제: `HomePage`, `AutoSavingsCard`, `useExchangeCalculatorData`, 구형 Google 버튼 등 실제 라우트에서 사용되지 않는 코드가 남아 있다. Calculator에도 전용 훅과 페이지 내부 구현이 중복된다.
- 개선 방법: 사용처를 확인한 뒤 삭제 또는 `deprecated` 표시를 한다. 삭제 전 빌드·검색으로 참조가 없는지 확인한다.

#### L-02. 전역 rem 축소 방식의 가독성 위험

- 현재 문제: 1920px 미만에서 `html` font-size가 12px까지 축소될 수 있다.
- 개선 방법: 고정적인 전역 축소 대신 주요 heading·spacing에 `clamp()`를 제한적으로 사용하고 본문 최소 크기를 유지한다.

#### L-03. 라우트 fallback과 전역 오류 경계 부족

- 현재 문제: Router에 명시적인 `errorElement` 또는 route-level loading fallback이 없다.
- 개선 방법: 앱 수준 ErrorBoundary와 Router fallback을 추가하되 기존 화면 디자인을 침범하지 않는 최소 UI로 구성한다.

## 4. 개선 구조 제안

전체를 새 구조로 이동하기보다, 현재 `pages`와 `components`를 라우트 호환 계층으로 유지하고 복잡한 도메인부터 점진적으로 feature 단위로 이동한다.

```text
src/
├─ app/
│  ├─ App.tsx
│  ├─ providers.tsx
│  └─ router.tsx
├─ layouts/
│  ├─ AuthLayout/
│  ├─ DashboardLayout/
│  └─ parts/
│     ├─ Header/
│     ├─ Sidebar/
│     └─ PageTabs/
├─ components/
│  └─ ui/
│     ├─ Button/
│     ├─ TextField/
│     ├─ Select/
│     ├─ Dialog/
│     ├─ Toast/
│     ├─ LoadingState/
│     ├─ EmptyState/
│     └─ ErrorState/
├─ features/
│  ├─ auth/
│  │  ├─ components/
│  │  ├─ hooks/
│  │  ├─ api.ts
│  │  └─ model.ts
│  ├─ expense/
│  │  ├─ components/
│  │  ├─ hooks/
│  │  ├─ api.ts
│  │  ├─ dto.ts
│  │  └─ model.ts
│  ├─ pots/
│  ├─ report/
│  ├─ calculator/
│  ├─ settings/
│  └─ onboarding/
├─ pages/
│  └─ <route>/Page.tsx       route adapter와 조합만 담당
├─ api/
│  ├─ client.ts
│  ├─ queryKeys.ts
│  └─ errors.ts
├─ auth/
├─ i18n/
├─ types/
│  └─ shared.ts              정말 여러 feature가 공유하는 타입만
├─ utils/
├─ constants/
└─ styles/
```

### 4.1 분류 원칙

#### 공통 UI

다음은 재사용성과 변경 가능성이 높으므로 공통 UI로 유지하거나 확장한다.

- `Button`: `variant`, `size`, `loading`, `fullWidth` 계약 통일
- `TextField`: label, helper/error, describedBy, password action
- `Dialog`: ModalShell의 접근성·포커스·스크롤 책임
- `Toast`: 성공·오류·정보 알림
- `Select`/`Listbox`: 키보드·aria 계약을 한 곳에서 관리
- `LoadingState`, `EmptyState`, `ErrorState`: 시각적 shell과 공통 action

반대로 `BudgetAllocationSummary`, `PotCard`, `EmailReportDialog`는 도메인 규칙과 데이터 의미가 강하므로 `features/pots`, `features/report`에 둔다.

#### Layout

현재 DashboardLayout에서 다음을 분리한다.

- `Header`: 브랜드와 사용자 chip
- `Sidebar`: 주 내비게이션과 로그아웃 action
- `AssetSummary`: 월 예산 요약
- `PageTabs`: 홈·리포트 하위 탭
- `BudgetEditDialog`, `LogoutDialog`: layout 전용 feature component

Layout은 라우팅과 배치만 알고, API 호출과 세부 폼 규칙은 전용 훅·컴포넌트로 넘긴다.

### 4.2 Props 계약

기존 이름을 깨지 않으면서 공통 API를 다음처럼 정리한다.

```tsx
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  fullWidth?: boolean
}

type AsyncState = 'idle' | 'loading' | 'success' | 'error'

type FeedbackStateProps = {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}
```

기존 `isLoading`은 즉시 제거하지 않고 `loading`으로 내부 표준화한 뒤 호환 기간을 둔다. boolean Props가 계속 늘어나는 컴포넌트는 `mode` 또는 `variant` union으로 상태를 표현한다.

### 4.3 상태 구조

서버 상태와 화면 상태를 분리한다.

```text
React Query
├─ query data / error / isLoading / isFetching
├─ mutation isPending / onSuccess / onError
└─ invalidation / optimistic update

Local state
├─ modal open/close
├─ selected tab / date / menu
└─ 아직 서버에 저장되지 않은 draft form
```

계산 가능한 값은 `useState`로 저장하지 않고 selector 또는 `useMemo`로 계산한다. `ReportPage`의 날짜·메일·거래 영역, `SettingsPage`의 프로필·이메일 설정 영역을 별도 훅으로 나누되, 작은 컴포넌트까지 과도하게 잘게 나누지는 않는다.

### 4.4 API 구조

현재 `api/client.ts`는 유지하고, 기능별로 Query/Mutation 계층을 표준화한다.

```text
api/client.ts
  ↓
features/expense/api.ts
  ↓
features/expense/queries.ts
  ↓
features/expense/hooks/useExpenseHistory.ts
  ↓
ExpenseHistoryPage
```

원칙은 다음과 같다.

- 컴포넌트에서 `apiRequest`를 직접 호출하지 않는다.
- GET은 Query, 생성·수정·삭제·전송은 Mutation으로 통일한다.
- Query key는 `api/queryKeys.ts` 또는 feature별 key factory에서 관리한다.
- 오류 메시지 변환은 API 계층의 원시 오류와 UI 계층의 표시 문구를 분리한다.
- 현재 `getExpenseHistory`처럼 여러 endpoint를 조합하는 함수는 service에 두되, 성공·부분 실패·전체 실패를 반환 타입으로 명시한다.

### 4.5 타입 구조

```text
features/expense/dto.ts      서버 응답에 맞는 optional DTO
        ↓ mapper
features/expense/model.ts    화면에서 보장되는 도메인 모델
        ↓
components props             화면에 필요한 최소 필드만
```

API DTO 전체를 컴포넌트 Props로 전달하지 않는다. `unknown` 오류는 경계에서 `ApiError` 또는 typed error로 정규화하고, 정상 흐름의 `as` assertion을 줄인다.

## 5. 단계별 리팩터링 계획

### 0차. 기준선 확보

- 기능별 route 목록과 주요 사용자 흐름을 고정한다.
- `tsc`, ESLint, 기존 Vitest를 CI 기준으로 기록한다.
- Expense 입력·내역·Pots·Report·Settings에 최소 회귀 테스트 시나리오를 작성한다.
- 이 단계에서는 파일 이동을 하지 않는다.

영향: 기능 변화 없음. 이후 단계의 회귀 비교 기준이 된다.

### 1차. 폴더·파일 구조

- `features/expense`, `features/pots`, `features/report`부터 도입한다.
- 기존 페이지는 route adapter로 남기고 내부 구현을 feature로 이동한다.
- import alias와 CSS Module 경로를 한 기능씩 정리한다.
- 사용되지 않는 코드의 참조를 검색해 목록화한다.

영향: import 경로와 cycle 문제가 발생할 수 있으므로 한 feature 단위로 이동하고 매 단계 typecheck를 실행한다.

### 2차. 공통 UI

- `LoadingState`, `EmptyState`, `ErrorState`를 추가한다.
- `ModalShell`을 `Dialog` 계약으로 강화한다.
- CurrencyDropdown·Report·Memo·Calculator의 선택 UI를 공통 Select 계약으로 통합한다.
- 기존 스타일과 문구는 Props로 전달해 UI를 유지한다.

영향: 포커스와 키보드 동작이 개선되지만, 기존 custom control의 시각 상태가 바뀌지 않았는지 화면 검증이 필요하다.

### 3차. Props·타입

- Button의 `loading`, `size`, `variant`를 표준화한다.
- API DTO와 feature model을 분리한다.
- `CurrencyAmountInput`에 통화별 precision/step 규칙을 추가한다.
- 이벤트 이름을 `onChange`, `onSubmit`, `onClose`, `onRetry`로 정리한다.

영향: 타입 오류가 일시적으로 증가할 수 있다. 기존 Props 별칭을 한 릴리스 동안 유지하면 위험을 낮출 수 있다.

### 4차. API·Custom Hook

- React Query를 서버 상태의 기본 경로로 삼는다.
- 페이지 내부 `useEffect` API 호출을 Query/Mutation으로 이동한다.
- 실패 캐시 제거, Query key factory, mutation invalidation을 표준화한다.
- `useExpenseHistory`, `useMonthlyReport`, `usePots`, `useEmailReportSettings`부터 전환한다.

영향: 요청 시점과 캐시 동작이 바뀔 수 있으므로 stale data·재조회·로그아웃 시나리오를 확인한다.

### 5차. Loading/Error/Empty UI

- 서버 데이터 화면마다 `Loading → Success → Empty → Error`를 명시한다.
- 초기 로딩과 백그라운드 갱신을 구분한다.
- Retry action은 실제 Query refetch와 연결한다.
- 전체 실패와 부분 성공을 다른 상태로 표시한다.

영향: API 오류가 기존의 빈 화면 대신 오류 화면으로 바뀔 수 있다. 이는 데이터 정확성을 위한 의도된 UX 변경이며 문구는 기존 톤을 유지한다.

### 6차. 중복 코드·품질·테스트

- Report/ExpenseHistory의 달력·listbox·피드백 중복을 제거한다.
- 사용되지 않는 파일을 삭제한다.
- `useEffect` 의존성과 계산 가능한 state를 점검한다.
- component, hook, accessibility, API 실패 시나리오 테스트를 추가한다.
- 360/390/768/1024/1440/1920 viewport의 핵심 흐름을 검증한다.

영향: 기능 변화는 가장 적지만 파일 삭제와 스타일 정리 중 누락 가능성이 있으므로 최종 검색·빌드가 필요하다.

## 6. 테스트 및 완료 기준

### 자동 검증

- TypeScript typecheck 통과
- ESLint 통과
- 기존 Vitest 전체 통과
- 공통 Button/TextField/Dialog/Select 단위 테스트
- 주요 Query/Mutation 성공·실패 테스트
- Expense 입력 환율 오류 저장 차단 테스트
- 지출 내역 전체 실패가 ErrorState로 가는 테스트

### 수동 검증

- 로그인 → 온보딩 → 지출 입력 → 내역 → Pots → Report → Settings 흐름
- 마우스 없이 Tab/Enter/Space/ESC로 주요 기능 사용
- 모달 열기·닫기 후 포커스 복원
- 360px 및 390px 모바일에서 가로 스크롤·텍스트 겹침 확인
- 200% 확대에서 핵심 CTA와 오류 메시지 확인
- 네트워크 오류·빈 데이터·느린 응답·부분 응답 확인

### 완료 정의

- 페이지는 조합과 라우팅 중심이고 API·도메인 규칙이 feature 계층에 있다.
- Loading/Error/Empty 상태의 시각·행동 계약이 공통화되어 있다.
- API DTO가 컴포넌트 Props로 직접 새지 않는다.
- 공통 컴포넌트는 variant/size/loading/event naming이 일관된다.
- Critical/High 항목이 해결되고, 기존 UI와 API 계약이 유지된다.
- 주요 화면에 최소한의 컴포넌트·훅·API 실패 테스트가 있다.

## 7. 최종 판단

현재 구조는 폐기 후 재작성할 정도로 잘못된 상태는 아니다. 오히려 이미 있는 Layout, 공통 UI, API client, 정규화 로직을 보존하고, 복잡한 페이지를 feature 단위로 천천히 분리하는 편이 요구사항과 위험도에 가장 맞다.

우선순위는 시각적 재배치가 아니라 데이터 정확성과 상태·접근성 계약의 통일이다. 특히 환율 오류 저장, 지출 오류 은닉, Modal focus 문제를 먼저 해결한 뒤 공통 상태 UI와 Query/Mutation 패턴을 확립해야 이후 구조 이동이 안전해진다.
