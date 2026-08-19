# Props / Type Refactoring Report

## Before

이번 단계 시작 시점에는 공통 상태·Dialog·Select 계약과 Critical 회귀 동작이 이미 정리되어 있었다. Props와 타입을 조사한 결과, 공통 컴포넌트의 기본 계약은 대체로 안정적이었지만 통화 타입과 금액 입력 규칙이 UI·도메인·API 경계에 나뉘어 있었다.

| 영역 | 현재 Type/Props | 문제 | 중복 | 개선 필요 | 위험도 |
| --- | --- | --- | --- | --- | --- |
| Button | native button props + `variant` + `fullWidth` + `isLoading` | loading/disabled 관계를 계속 보장할 회귀 테스트가 없었음 | 낮음 | 현 계약 유지 및 테스트 고정 | 낮음 |
| Currency | UI 폴더의 `CurrencyCode`, 도메인의 문자열 union | 페이지의 통화 assertion과 통화 metadata 부재 | 높음 | 공유 타입·metadata로 통합 | 중간 |
| Expense | DTO와 화면 모델이 같은 타입 파일에 존재 | API 응답 optional 값이 화면까지 새어 나갈 가능성 | 중간 | 기존 mapper를 경계로 명시 | 중간 |
| Report | `ExpenseListItemDto`를 페이지 state에 직접 저장 | API optional field를 화면에서 반복 검사 | 낮음 | DTO → `ExpenseListItem` 변환 | 중간 |
| Pots | `PotCard`에 별도 축약 `Pot` interface | 도메인 필드와 이름이 중복 | 중간 | `Pick<Pot, ...>`로 최소 Props 유지 | 낮음 |
| 금액 입력 | `CurrencyAmountInput`이 모든 통화를 정수 처리 | USD/EUR/CNY의 소수 금액 입력 불가 | 낮음 | minor unit 기반 입력/반올림 | 중간 |
| Event/Boolean | 역할별 `onChange`, `onClose`, `onRetry`, `onToggle` 사용 | 배타적 상태를 boolean으로 과도하게 표현하는 패턴은 확인되지 않음 | 낮음 | 대규모 rename 생략 | 낮음 |

## Props Problems

- `Button`은 이미 native props 전달, `type="button"` 기본값, `isLoading` 시 disabled 처리가 일관되어 있었다. 현재 사용처에 `size`, `ghost`, `loading`이 없어 새 API를 추가하지 않았다.
- `LoadingState`, `EmptyState`, `ErrorState`, `Skeleton`, `ModalShell`의 필수 값과 기본값은 실제 사용 방식과 일치했다. 도메인 문구는 페이지에서 전달되고 공통 컴포넌트에 하드코딩되지 않았다.
- `PotCard`의 축약 데이터는 컴포넌트 책임에 맞지만 별도 `Pot` 이름은 도메인 모델과 혼동될 수 있어 `Pick<Pot, ...>`로 정리했다.
- `onArchivePot`, `onDeleteExpense`처럼 도메인 의미가 있는 이벤트 이름은 유지했다. 단순 동작은 기존 `onChange`, `onClose`, `onRetry`, `onSelect` 계약을 유지했다.
- API DTO의 optional 필드는 서버 경계에 남겨 두고, 화면 모델에서는 mapper가 fallback을 적용하도록 했다.

## Component Contracts

- 공통 컴포넌트는 화면 전용 DTO를 받지 않고 렌더링에 필요한 Props만 받는다.
- 상태 표현은 기존 `variant` union(`default`/`compact`, `panel`/`inline`)을 유지했다. 상호 배타적인 표현을 boolean 묶음으로 추가하지 않았다.
- `className`, native button/input props, `type`, `disabled` 같은 HTML 계약은 그대로 전달한다.

## Button Contract

현재 계약을 유지했다.

```ts
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'outline'
  fullWidth?: boolean
  isLoading?: boolean
}
```

`isLoading`이면 `disabled`가 항상 true가 되고 `aria-busy="true"`가 표시된다. `type` 기본값은 `button`이며 native `disabled`, `onClick`, `className`은 그대로 전달된다. `size`/`ghost`/`loading` alias는 실제 사용처가 없어 추가하지 않았다.

## Event Naming

공통 컴포넌트는 `onChange`, `onClose`, `onRetry`, `onSelect`, `onAction`을 사용한다. Listbox의 `onOpen`/`onClose`/`onSelect`, Dialog의 `onClose`, 상태 UI의 `onRetry`가 동일한 의미로 연결된다. Pots의 archive/delete처럼 도메인 의미가 강한 callback은 일반 `onClick`으로 바꾸지 않았다.

## Boolean Props

`isLoading`, `fullWidth`, `disabled`, `showCloseButton`, `showBookmark`, `showHeader`는 서로 배타적인 variant가 아니라 독립적인 표시/동작 제어라 유지했다. `isPrimary`/`isSecondary`/`isSmall`/`isLarge`처럼 중복 boolean 표현은 추가로 발견되지 않았다.

## DTO / Model Boundary

API 응답은 optional DTO로 유지하고, 화면에는 정규화된 모델을 전달한다.

- `mapExpenseListItemDto`가 `ExpenseListItemDto`의 id, merchant, category, icon, amount, date를 안전한 `ExpenseListItem`으로 변환한다.
- Report 이메일 모달은 더 이상 `ExpenseListItemDto`를 state에 보관하지 않고 `ExpenseListItem`만 렌더링한다.
- `ExpenseListResponseDto.expenses`는 실제 응답의 page/array 두 형태를 타입에 명시했고, 요청 endpoint나 payload는 변경하지 않았다.
- React Query hook은 query generic을 명시해 `history.data as ...`, `recent.data as ...`, `refetch().data as ...` assertion을 제거했다.

## Expense Types

- `ExpenseListItemDto`: 서버 응답의 optional 필드.
- `ExpenseListItem`: 목록 화면에서 항상 사용할 수 있는 정규화 모델.
- `ExpenseDetail`/`CreateExpenseInput`: 저장 API에 필요한 domain/input 모델.
- `ExpenseFormValue`: 화면 입력값과 계산된 `convertedAmountHome`/`appliedRate`를 구분하는 폼 모델.
- API가 반환한 통화 문자열은 `normalizeCurrencyCode`로 지원 목록을 확인한 뒤 domain `CurrencyCode`로 좁힌다.

## Report / Pots / User Types

- Report의 summary/category DTO는 API 전용으로 유지하고 `MonthlyReportData`만 화면 모델로 사용한다.
- Pots API의 `PotResponseDto`는 API 파일에 남기고, `Pot`은 domain 모델로 유지한다. `PotCard`에는 필요한 필드만 `Pick<Pot, ...>`로 전달한다.
- User의 optional profile/onboarding 필드는 PATCH 및 서버 미완성 응답을 표현하므로 required로 강제하지 않았다.
- Calculator와 Expense Input의 온보딩 통화 값은 `normalizeCurrencyCode`로 지원 통화만 사용한다.

## Currency Amount Rules

`src/types/currency.ts`에 공유 `CurrencyCode`, `CurrencyMetadata`, `CURRENCY_METADATA`를 추가했다.

- KRW/JPY: `minorUnit=0`, 정수 입력 및 반올림.
- USD/EUR/CNY: `minorUnit=2`, 최대 소수 둘째 자리까지 입력 및 반올림.
- `CurrencyAmountInput`은 locale의 `.`/`,` 입력을 정규화하고 invalid/empty 입력을 안전하게 처리한다.
- `formatCurrencyAmount`도 metadata의 maximum fraction digits를 사용한다.
- Pots slider는 기존 KRW의 10,000 단위 정책을 유지하고, 비-KRW는 1 단위로 동작한다. 실제 API amount 타입은 기존 `number` 그대로다.

## Assertions Removed

이번 범위에서 제거한 불필요한 assertion은 다음과 같다.

- Expense Input의 onboarding 통화 `as CurrencyCode` → `isCurrencyCode`/`find`.
- `createExpense` 응답 통화 `as CreateExpenseInput['currency']` → `normalizeCurrencyCode`.
- Expense page 응답의 `as ExpensePageDto | ExpenseListItemDto[]` → DTO union 타입과 `Array.isArray` 분기.
- `useExpenseHistoryData`의 query data assertions.
- `usePotsData.refetch`의 `as PotsData` assertion.

API client generic, localStorage/sessionStorage JSON, DOM event target, focus 테스트의 assertion은 외부 입력·브라우저 경계 또는 테스트 double을 좁히기 위한 것으로 유지했다.

## Shared Types

추가된 공유 타입은 `src/types/currency.ts`의 `CurrencyCode`, `CurrencyMetadata`뿐이다. API 전용 DTO나 페이지 전용 Props를 전역으로 이동하지 않았다. 기존 `CurrencyDropdown/currencyOptions.ts`는 호환성을 위해 shared type을 re-export한다.

## Tests Added

- `src/components/common/Button/Button.test.tsx` — loading/disabled/native props/variant/click handler 계약 2개.
- `src/components/common/CurrencyAmountInput/CurrencyAmountInput.test.ts` — zero-decimal, fractional precision, invalid/empty 입력 3개.
- `src/api/expenses.types.test.ts` — DTO → domain 정상/누락 필드 mapping 2개.

신규 테스트는 총 7개이며 모두 통과했다.

## Full Test Result

- 신규 Props/Type 테스트: **7/7 PASS**
- Critical·Async·Dialog·Select 회귀 테스트: **24/24 PASS**
- 전체 Vitest: **16개 파일, 55/55 PASS**

## TypeScript / ESLint / Build

- TypeScript `npx tsc --project tsconfig.app.json --pretty false`: **0 errors**
- ESLint `npm run lint`: **0 errors, 0 warnings**
- Production `npm run build`: **PASS**
- 첫 테스트 시도에서 발생한 `node_modules/.vite-temp` EPERM은 코드 오류가 아닌 Windows 임시 파일 권한 문제였으며, 권한 승인 후 동일 테스트가 정상 통과했다.

## Files Added

- `src/types/currency.ts`
- `src/components/common/Button/Button.test.tsx`
- `src/components/common/CurrencyAmountInput/CurrencyAmountInput.test.ts`
- `src/api/expenses.types.test.ts`
- `docs/PROPS_TYPE_REFACTORING_REPORT.md`

## Files Modified

- `src/types/expense.ts`
- `src/components/common/CurrencyDropdown/currencyOptions.ts`
- `src/components/common/CurrencyAmountInput/CurrencyAmountInput.tsx`
- `src/utils/currency.ts`
- `src/api/expenses.ts`
- `src/hooks/useExpenseHistoryData.ts`
- `src/hooks/usePotsData.ts`
- `src/hooks/useExpenseInputData.ts`
- `src/pages/ExpenseInputPage/ExpenseInputPage.tsx`
- `src/pages/CalculatorPage/CalculatorPage.tsx`
- `src/pages/ReportPage/ReportPage.tsx`
- `src/components/pots/PotCard/PotCard.tsx`
- `src/components/pots/CreatePotModal/CreatePotModal.tsx`
- `src/pages/PotsPage/PotsPage.tsx`

이 저장소에는 이전 Critical/Async/Dialog/Select 단계의 변경도 같은 working tree에 존재한다. 이번 단계에서는 그 파일들의 API·상태·접근성 계약을 별도로 변경하지 않았다.

## Remaining Issues

- API DTO는 compile-time 타입이며 runtime schema validation 라이브러리는 도입하지 않았다. 외부 응답 fallback은 현재 mapper에서 처리한다.
- `src/api/memos.ts`의 여러 레거시 응답 shape를 지원하는 assertion은 실제 서버 변형을 수용하기 위해 남아 있다.
- 컴포넌트 테스트 환경은 현재 static markup/pure function 중심이며 실제 브라우저 상호작용(E2E)은 아직 범위 밖이다.
- 이메일 리포트 전송은 기존 backend SES/API 계약에 의존하며 이번 Props/Type 단계에서 변경하지 않았다.

## Ready for Next Step?

**READY WITH ISSUES**

이번 단계의 Props, DTO/domain 경계, 통화 금액 규칙은 안정화되었고 모든 회귀·정적 검증·Production build가 통과했다. 다음 단계로 진행할 수 있지만, runtime schema validation과 실제 브라우저 상호작용 테스트는 별도 과제로 남아 있다. React Query 전체 통일, feature 이동, 대규모 페이지 분리는 이번 단계에서 진행하지 않았다.
