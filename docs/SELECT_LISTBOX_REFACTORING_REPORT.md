# Select / Listbox Refactoring Report

## Before

이번 단계는 기존 선택 UI의 역할과 구현을 조사한 뒤, 동일한 역할의 custom listbox에 공통 keyboard/ARIA 계약을 적용하는 범위로 진행했습니다. API, React Query, feature 폴더, Dialog/Async/Critical 계약은 변경하지 않았습니다.

| 위치 | 구현 방식 | Native/Custom | Keyboard | ARIA | Focus 관리 | 공통화 가능성 | 개선 필요 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `CurrencyDropdown` | 통화 trigger + 아이콘 옵션 | Custom | 기존 click만 | listbox/option 기본 있음 | 없음 | 높음 | 공통 keyboard, active option, outside click |
| ExpenseInput 통화 | `CurrencyDropdown` 사용 | Custom | 공통 적용 | 공통 적용 | trigger 유지 | 완료 | - |
| Calculator 통화 From/To | 페이지 내부 중복 currency menu | Custom | 기존 click만 | role만 일부 | document mousedown | 높음 | hook/ARIA 중복 제거 |
| Report 월 선택 | 월 popup + listbox | Custom | 기존 click만 | listbox/option 일부 | document click | 중간 | hook/ARIA 적용 |
| Report 날짜 선택 | 달력 popup | Custom calendar | 달력 버튼만 | `role="dialog"` | 별도 | 낮음 | 일반 listbox로 통합하지 않음 |
| ExpenseHistory 기간 | 문자열 3개 popup | Native로 전환 | 브라우저 native | label/select | 브라우저 기본 | 높음 | custom 유지 불필요 |
| ExpenseHistory Modal 월 | Modal header의 월 popup | Custom | 기존 click만 | listbox/option 일부 | 없음 | 중간 | hook/ARIA 적용 |
| Memo 정렬 | 문자열 2개 popup | Native로 전환 | 브라우저 native | label/select | 브라우저 기본 | 높음 | custom 유지 불필요 |
| Settings 수신 시간 | radio 목록 + 페이지 이동 + 저장/취소 | Custom dialog-like picker | radio 기본 동작 | 기존 radio + 보강된 dialog | popup 외부/ESC 보강 | 낮음 | 거대한 Select로 통합하지 않음 |
| Settings 발송 주기 | segmented button group | Custom choice group | button 기본 | 기존 button semantics | 기본 | 낮음 | Select가 아님 |
| Onboarding 통화 | 통화 정보가 있는 radio/checkbox 카드 | Custom option picker | 단일 선택 arrow/Home/End 보강 | radio/checkbox | single mode roving tab stop | 낮음 | listbox로 변환하지 않음 |
| Pots 이미지/카테고리 | 이미지 버튼 grid | Custom option picker | button 기본 | `aria-pressed` | 기본 | 낮음 | listbox로 변환하지 않음 |

프로젝트에 기존 native `<select>`는 없었고, 문자열-only 선택인 Memo 정렬과 ExpenseHistory 기간은 native `<select>`로 전환했습니다. 아이콘/복합 레이아웃/기존 popup 디자인이 중요한 통화와 월 선택은 custom을 유지했습니다.

## Native vs Custom Decision

### Native select

- Memo 정렬: `latest`/`oldest` 문자열만 선택하므로 native keyboard, screen reader, focus 동작을 사용합니다.
- ExpenseHistory 기간: `day`/`week`/`month` 문자열만 선택하므로 native select를 사용합니다.

### Custom listbox 또는 option picker

- CurrencyDropdown 및 Calculator 통화: 통화 아이콘과 기존 시각적 레이아웃이 필요합니다.
- Report 월 및 ExpenseHistory Modal 월: 기존 chart/modal header의 popup 디자인과 월 표시 형식을 유지해야 합니다.
- Settings 시간: 24시간 목록을 페이지 단위로 보여주고 저장/취소 액션이 함께 있어 단순 select가 아닙니다.
- Onboarding 통화와 Pots 선택: 부가 정보가 있는 카드/grid 선택이며 radio/checkbox 또는 pressed button semantics가 더 적합합니다.
- 날짜 달력: 날짜 범위 선택 interaction model이 일반 Select/Listbox와 달라 이번 단계에서 통합하지 않았습니다.

## Common Contract

큰 범용 `Select` 컴포넌트 대신 `src/hooks/useListboxKeyboard.ts`에 실제로 반복된 동작만 공통화했습니다.

- `open`, `optionCount`, `selectedIndex`, `onOpen`, `onClose`, `onSelect`를 controlled state와 연결
- 선택 trigger에 `aria-haspopup="listbox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant` 제공
- listbox에 고정 ID, option에 고정 option ID 제공
- option에 `role="option"`, `aria-selected`, `tabIndex={-1}` 제공
- pointerdown outside 시 닫힘
- 옵션 hover 시 active index 동기화
- disabled index를 건너뛰는 순수 keyboard 계산 함수 제공

기존 호출부의 `value`/`onChange` 계약은 유지했고, 각 화면의 도메인 상태와 시각적 옵션 렌더링은 화면에 남겼습니다.

## Keyboard Interaction

Custom listbox는 trigger focus를 유지하고 active option을 `aria-activedescendant`로 표현하는 방식을 사용합니다.

- Enter/Space: 닫힌 상태에서 열기, 열린 상태에서 active option 선택
- ArrowDown/ArrowUp: 다음/이전 enabled option
- Home/End: 첫/마지막 enabled option
- Escape: 변경 없이 닫기
- Tab: 선택하지 않고 닫은 뒤 자연스러운 다음 focus로 이동
- disabled option: navigation 대상에서 제외

Native select는 브라우저의 표준 keyboard 계약을 사용합니다. Onboarding single radio group은 선택된 항목만 tab stop으로 두고 Arrow/Home/End로 이동·선택합니다.

## Focus Strategy

Custom listbox는 trigger focus를 유지합니다. option button은 `tabIndex={-1}`로 두어 Tab 순서가 popup 내부의 개별 옵션으로 분산되지 않도록 했고, active option은 `aria-activedescendant`로 전달합니다. Native select와 radio group은 브라우저 표준 focus 동작을 사용합니다.

## Accessibility / ARIA

- CurrencyDropdown, Calculator, Report 월, ExpenseHistory Modal 월: trigger/listbox/option 관계를 모두 연결했습니다.
- Report 날짜 picker: `aria-haspopup="dialog"`를 추가하고 기존 달력 semantics는 유지했습니다.
- Settings 시간 popup: `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls`, `role="dialog"`를 추가했습니다.
- Onboarding single currency selection: radio group의 roving tab stop과 arrow navigation을 추가했습니다.
- API 오류와 option empty 상태는 기존 Async UI 계약을 변경하지 않았습니다.

## Components Added

- `src/hooks/useListboxKeyboard.ts`

공통 hook은 DOM 렌더링이나 특정 visual style을 소유하지 않고 keyboard state, active option, outside click만 관리합니다.

## Components Updated

- `CurrencyDropdown`: keyboard navigation, active descendant, option IDs, outside click 공통화
- `CurrencySelection`: single radio keyboard navigation 및 roving tab stop

## Pages Updated

- Calculator: From/To 통화 선택을 공통 hook 기반으로 변경
- Report: 월 listbox keyboard/ARIA 적용, 날짜 picker의 dialog hint 보강, 월 선택용 중복 outside listener 제거
- ExpenseHistory: 기간 선택을 native select로 전환, Modal 월 listbox에 공통 hook 적용
- Memo: 정렬을 native select로 전환
- Settings: 시간 popup ARIA, Escape, outside click 보강

기존 환율 저장 guard, ExpenseHistory Critical 실패 처리, Async Loading/Empty/Error/Retry, Modal focus trap/ESC/focus restore, Report 이메일 Dialog는 변경하지 않았습니다.

## Tests Added

- `src/hooks/useListboxKeyboard.test.ts`: 8개
  - Enter/Space open
  - ArrowUp/ArrowDown
  - Home/End
  - disabled option skip
  - Enter/Space selection
  - Escape close
  - Tab close 및 natural focus
- `src/components/common/CurrencyDropdown/CurrencyDropdown.test.tsx`: 선택값과 trigger ARIA 계약

신규 선택 UI 테스트는 총 9개이며, 기존 Dialog/Async/Critical 테스트와 함께 실행했습니다.

## Full Test Result

- 신규 Select/Listbox 테스트: 9/9 PASS
- Dialog 테스트: 4/4 PASS
- Async UI 테스트: 4/4 PASS
- Critical Regression Tests: 7/7 PASS
- 전체 Vitest: 13개 파일, 48/48 PASS

## TypeScript / ESLint / Build

- TypeScript (`tsc --project tsconfig.app.json`): 오류 0
- ESLint: error 0, warning 0
- Production build: PASS
- Build warning/error: 없음

## Files Added

- `src/hooks/useListboxKeyboard.ts`
- `src/hooks/useListboxKeyboard.test.ts`
- `src/components/common/CurrencyDropdown/CurrencyDropdown.test.tsx`
- `docs/SELECT_LISTBOX_REFACTORING_REPORT.md`

## Files Modified

이번 Select/Listbox 단계에서 직접 수정한 파일은 다음과 같습니다.

- `src/components/common/CurrencyDropdown/CurrencyDropdown.tsx`
- `src/components/onboarding/CurrencySelection/CurrencySelection.tsx`
- `src/pages/CalculatorPage/CalculatorPage.tsx`
- `src/pages/ExpenseHistoryPage/ExpenseHistoryPage.tsx`
- `src/pages/ExpenseHistoryPage/ExpenseHistoryPage.module.css`
- `src/pages/MemoPage/MemoPage.tsx`
- `src/pages/MemoPage/MemoPage.module.css`
- `src/pages/ReportPage/ReportPage.tsx`
- `src/pages/SettingsPage/SettingsPage.tsx`

앞선 Critical Fix, Async UI, Dialog 단계의 변경 파일은 유지했고 되돌리거나 구조를 이동하지 않았습니다.

## Remaining Issues

- 현재 Vitest 환경에는 browser-level `jsdom`/사용자 이벤트 도구가 없어 실제 DOM에서의 focus 유지, `aria-activedescendant` 이동, pointerdown outside를 통합 렌더링으로 검증하지 못했습니다. 순수 keyboard 계약과 CurrencyDropdown의 정적 ARIA 마크업은 검증했습니다.
- Report/ExpenseInput 날짜 달력은 일반 listbox가 아니므로 별도 keyboard/calendar 개선 과제로 남겼습니다.
- Settings의 발송 주기 segmented button과 Pots의 이미지 선택 grid는 Select가 아닌 choice group으로 유지했습니다.
- 여러 dropdown을 동시에 여는 전역 정책은 각 화면의 기존 상태 모델을 유지했으며, 전역 overlay manager는 도입하지 않았습니다.

## Ready for Next Step?

READY WITH ISSUES

Native와 Custom 선택 UI를 역할에 맞게 구분했고, 반복되는 custom listbox의 keyboard/ARIA/outside click 계약을 공통 hook으로 적용했습니다. 전체 테스트 48개, TypeScript, ESLint, Production build가 모두 통과했습니다. 다음 단계로 진행할 수 있지만, 실제 브라우저 focus 회귀를 보강하려면 browser-level 테스트 환경을 추가하는 것이 안전합니다.
