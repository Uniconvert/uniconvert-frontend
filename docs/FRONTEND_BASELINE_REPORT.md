# Frontend Baseline Report

- 대상 프로젝트: `C:\Users\COM\uniconvert`
- 기준선 확보일: 2026-08-18
- 목적: 구조 리팩터링 전 현재 실행 상태·라우팅·핵심 흐름·API·테스트 범위를 고정
- 작업 원칙: 소스 수정, 파일 이동, 폴더 변경, 자동 수정 미실행

## Environment

### Runtime

| 항목 | 현재 값 |
|---|---|
| OS | Windows (`win32-x64`) |
| Node.js | `v22.17.1` |
| npm | `10.9.2` |
| TypeScript 실행 버전 | `6.0.3` |
| Vite 실행 버전 | `8.1.0` |
| Vitest 실행 버전 | `4.1.10` |

### 주요 의존성

- React `^19.2.7`
- React DOM `^19.2.7`
- React Router `^7.18.1`
- TanStack Query `^5.101.4`
- TypeScript `~6.0.2`
- Vite `^8.1.0`
- Vitest `^4.1.10`
- ESLint `^10.5.0`

### npm scripts

| Script | 명령 | 기준선 사용 여부 |
|---|---|---|
| `dev` | `vite` | 개발 서버 실행용 |
| `build` | `tsc -b && vite build` | 실행 완료 |
| `lint` | `eslint .` | 실행 완료 |
| `test` | `vitest run` | 실행 완료 |
| `test:watch` | `vitest` | watch 모드 |
| `preview` | `vite preview` | 배포 산출물 확인용 |
| `typecheck` | 없음 | `npx tsc --project tsconfig.app.json --pretty false`로 대체 |

### 설정 및 작업 트리

- Vite alias: `@/* → src/*`
- ESLint는 `dist`를 global ignore한다.
- 현재 작업 트리에는 기존 분석 보고서인 `docs/FRONTEND_REFACTORING_REPORT.md`가 untracked 상태로 존재한다.
- 이번 기준선 작업에서 소스 파일은 수정하지 않았다.

## TypeScript

### 실행 명령

```text
npx tsc --project tsconfig.app.json --pretty false
```

### 결과

- 상태: PASS
- 오류: 0건
- 경고: 0건
- `tsconfig.app.json`의 `noEmit: true` 설정에 따라 JavaScript 산출물은 생성하지 않았다.

TypeScript 자체 기준선은 깨끗하다. 다만 `package.json`에 독립적인 `typecheck` script가 없어 이후 리팩터링부터는 동일 명령을 script로 고정하는 것이 추적에 유리하다. 이번 단계에서는 설정을 변경하지 않았다.

## ESLint

### 실행 명령

```text
npm run lint
```

### 결과

- 상태: PASS
- Error: 0건
- Warning: 0건
- 자동 fix: 실행하지 않음

현재 ESLint 기준으로 보고할 파일별 오류는 없다.

## Tests

### 실행 명령

```text
npm test
```

### 결과

- 상태: PASS
- Test Files: 7 passed
- 전체 테스트: 24
- 성공: 24
- 실패: 0
- 테스트 실행 시간: 약 1.08초

현재 테스트는 Vite/Vitest 설정을 로드하는 과정에서 프로젝트 내부 임시 파일 생성 권한이 필요해 승인된 실행 환경에서 수행했다. 이는 테스트 실패가 아니라 실행 권한 조건이다.

### 테스트 파일 분류

| 분류 | 파일 | 테스트 수/범위 |
|---|---|---|
| API | `src/api/client.test.ts` | 공통 응답 변환, API 오류, 네트워크 오류 |
| API | `src/api/memos.test.ts` | 메모 페이지 변환, 메모 삭제, 지출 삭제 endpoint |
| Utils | `src/utils/apiError.test.ts` | 오류 메시지 정규화 |
| Utils | `src/utils/categoryIcon.test.ts` | 카테고리 아이콘 매핑 |
| Utils | `src/utils/currency.test.ts` | 통화 포맷·현지 연월 |
| Utils | `src/utils/exchangeRate.test.ts` | 환율 계산·표시 정책 |
| i18n/Utils | `src/i18n/language.test.ts` | 브라우저 언어 해석 |
| Hook | 없음 | 테스트 파일 없음 |
| Component | 없음 | 테스트 파일 없음 |
| Page | 없음 | 테스트 파일 없음 |

## Build

### 실행 명령

```text
npm run build
```

### 결과

- 상태: PASS
- 실행 단계: `tsc -b` 성공 후 `vite build` 성공
- Vite transform: 163 modules
- Vite warning: 0건
- Vite error: 0건
- 산출물: `dist/` 생성·갱신
- 가장 큰 JS chunk: `index-DCgc6dF8.js`, 403.02 kB raw / 124.40 kB gzip

빌드 자체는 통과한다. 큰 초기 chunk는 현재 기준선의 성능 관찰값으로 기록하며, 이번 단계에서는 분할이나 최적화를 수행하지 않았다.

## Current Routes

현재 Router는 `src/routes/AppRouter.tsx`의 lazy route와 세 종류의 인증 Guard로 구성된다.

| Route | Page | Layout / Guard | 주요 역할 |
|---|---|---|---|
| `/` | `LandingPage` | 없음 | 서비스 랜딩 |
| `/login` | `LoginPage` | `AuthLayout` + `GuestRouteGuard` | 이메일·Google 로그인 |
| `/signup` | `SignUpPage` | `AuthLayout` + `GuestRouteGuard` | 회원가입 |
| `/verify-email` | `VerifyEmailPage` | `AuthLayout` + `EmailVerificationRouteGuard` | 이메일 인증 안내/placeholder |
| `/onboarding/base-currency` | `BaseCurrencyPage` | `AuthLayout` + `OnboardingRouteGuard` | 기준 통화 설정 |
| `/onboarding/local-currencies` | `LocalCurrenciesPage` | 동일 | 현지 통화 설정 |
| `/onboarding/budget` | `BudgetSetupPage` | 동일 | 월 예산 설정 |
| `/onboarding/timezone` | `TimezoneSetupPage` | 동일 | 브라우저 시간대 확인·저장 |
| `/onboarding/profile` | `ProfileSetupPage` | 동일 | 닉네임·프로필·목표 설정 |
| `/home` | `ExpenseInputPage` | `DashboardRouteGuard` + `DashboardLayout` | 지출 입력 |
| `/home/expenses` | `ExpenseHistoryPage` | 동일 | 지출 내역·예산·최근 지출 |
| `/home/pots` | `PotsPage` | 동일 | Pots 조회·생성·수정·보관·배정 |
| `/report` | `ReportPage` | 동일 | 일별·월별 리포트·이메일 리포트 |
| `/report/memos` | `MemoPage` | 동일 | 메모 조회·수정·삭제 |
| `/calculator` | `CalculatorPage` | 동일 | 환율 계산·계산 내역 |
| `/ocr` | `OcrUploadPage` | 동일 | 파일 업로드 기반 지출 import |
| `/settings` | `SettingsPage` | 동일 | 프로필·이메일 리포트 설정 |
| `*` | `NotFoundPage` | 없음 | 미등록 경로 |

Guard 동작은 다음과 같다.

- 미로그인 보호 화면 → `/login`
- 이메일 미인증 사용자 → `/verify-email`
- 온보딩 미완료 사용자 → `/onboarding/base-currency`
- 이미 인증·온보딩 완료한 사용자의 인증/온보딩 화면 접근 → `/home`

## Critical User Flows

### 로그인

```text
/login
→ LoginPage
→ login() 또는 googleLogin()
→ POST /auth/login 또는 POST /auth/social/google
→ GET /users/me
→ session token/user 저장
→ GuestRouteGuard 판단
→ /verify-email 또는 /onboarding/base-currency 또는 /home
```

주요 컴포넌트: `AuthPanelShell`, `TextField`, `Button`, `GoogleIdentityButton`, `Toast`

### 회원가입 / 인증

```text
/signup
→ SignUpPage
→ signUp()
→ POST /auth/signup
→ session token/user 저장
→ 인증·온보딩 Guard 진입
```

현재 `auth.ts`는 회원가입 응답으로 `isEmailVerified: true`를 설정한다. 백엔드 인증 상태 필드가 아직 구현되지 않았다는 코드 주석과 함께 동작하는 현재 기준선이다.

`/verify-email`은 route와 guard는 존재하지만 현재 `PagePlaceholder` 기반 화면이다. 실제 인증 메일 발송·완료 API 흐름은 구현 기준선에서 확인되지 않는다.

### 온보딩

```text
base-currency
→ local-currencies
→ budget
→ timezone
→ profile
→ save onboarding/profile
→ isOnboardingCompleted
→ /home
```

주요 컴포넌트: `OnboardingPanel`, `CurrencySelection`, `AuthPanelShell`, `Button`

주요 API:

- `GET /currencies`: 기준·현지 통화 목록
- `POST /onboarding`: 통화·예산·시간대·프로필 저장
- `PATCH /users/me`: 프로필 업데이트

### 지출 입력

```text
/home
→ ExpenseInputPage
→ useExpenseInputData
→ categories / budget / exchange-rate 데이터 조회
→ POST /expenses 또는 POST /expenses/import
→ Query invalidation + budget refetch + Toast
```

주요 컴포넌트: `CurrencyDropdown`, `FileUploadModal`, `Button`, `Toast`

### 지출 내역

```text
/home/expenses
→ ExpenseHistoryPage
→ useExpenseHistoryData
→ 월별 집계·최근 지출·선택 월 상세 조회
→ 지출명 PATCH /expenses/:id
→ 지출 DELETE /expenses/:id
```

주요 컴포넌트: `ModalShell`, `FloatingMascot`, `Toast`

### Pots

```text
/home/pots
→ PotsPage
→ usePotsData + useMyUserQuery
→ GET /pots?includeArchived=false
→ POST /pots
→ PATCH /pots/:id
→ POST /pots/:id/allocations
→ PATCH /pots/:id/archive
```

주요 컴포넌트: `PotCard`, `CreatePotModal`, `BudgetAllocationSummary`, `CurrencyAmountInput`, `ModalShell`

### Report

```text
/report
→ ReportPage
→ useMonthlyReportData
→ summary/categories + expense history
→ 일별·월별 차트 렌더링
→ 이메일 미리보기 거래 조회
→ POST /reports/email/send
```

주요 컴포넌트: 페이지 내부 `BarChart`, `FloatingMascot`, `Button`, `Toast`

### Settings

```text
/settings
→ SettingsPage
→ useMyUserQuery
→ GET /users/me
→ PATCH /users/me
→ GET/PUT /users/me/email-report-setting
→ GET /reports/summary + /reports/categories (미리보기)
→ POST /reports/email/send
```

주요 컴포넌트: `Button`, `Toast`, 프로필·시간 선택 UI(현재 페이지 내부 구현)

### 로그아웃

```text
DashboardLayout
→ logout()
→ POST /auth/logout
→ clearSession()
→ /login
```

서버 로그아웃 실패 시에도 브라우저 세션을 지우고 로그인 화면으로 이동하는 현재 동작을 유지해야 한다.

## API Flows

모든 실제 HTTP 요청은 `src/api/client.ts`의 Fetch 기반 `apiRequest`를 사용한다. Axios는 사용하지 않는다. 다만 Query 훅, 일반 함수, 페이지 내부 `useEffect`가 혼재한다.

| 기능 | Hook / 호출 위치 | API 함수 | Endpoint |
|---|---|---|---|
| Auth login | `LoginPage` | `login` | `POST /auth/login` |
| Google login | `LoginPage`, `SignUpPage` | `googleLogin` | `POST /auth/social/google` 또는 env 경로 |
| Sign up | `SignUpPage` | `signUp` | `POST /auth/signup` |
| User session | `useMyUserQuery`, auth 후속 조회 | `getMyUser` | `GET /users/me` |
| Logout | `DashboardLayout` | `logout` | `POST /auth/logout` |
| Currency setup | Onboarding pages | `getCurrencies` | `GET /currencies` |
| Onboarding save | Budget/Profile/Timezone pages | `saveOnboarding` | `POST /onboarding` |
| Budget read | `useBudgetQuery`, dashboard, Pots | `getBudget` | `GET /budgets/:yearMonth` |
| Budget write | Dashboard modal | `upsertBudget` | `PUT /budgets/:yearMonth` |
| Categories | `useExpenseInputData` | `getCategories` | `GET /categories` |
| Expense input | `ExpenseInputPage` | `createExpense` | `POST /expenses` |
| CSV/OCR import | `ExpenseInputPage`, `OcrUploadPage` | `importExpenses` | `POST /expenses/import` |
| Expense history | `useExpenseHistoryData`, `useExpenseInputData` | `getExpenseHistory` | `/reports/summary`, `/reports/categories`, budget, remaining budget 조합 |
| Recent expenses | `useExpenseHistoryData` | `getRecentExpenses` | `GET /expenses/recent`, 실패 시 `GET /expenses` fallback |
| Month expenses | History modal | `getExpensesForMonth` | 페이지 단위 `GET /expenses` |
| Expense edit | History/Memo | `updateSavedExpenseName`, `updateExpenseMemo` | `GET/PATCH /expenses/:id` |
| Expense delete | History/Memo | `deleteSavedExpense`, `deleteExpenseMemos` | `DELETE /expenses/:id`, `DELETE /expenses/memos` |
| Pots read | `usePotsData` | `getPots` | `GET /pots?includeArchived=false` |
| Pot create | `PotsPage` | `createPot` | `POST /pots` |
| Pot edit | `PotsPage` | `updatePot` | `PATCH /pots/:id` |
| Pot allocation | `PotsPage` | `allocatePotAmount` | `POST /pots/:id/allocations` |
| Pot archive | `PotsPage` | `archivePot` | `PATCH /pots/:id/archive` |
| Monthly report | `useMonthlyReportData` | `getMonthlyReport` | `/reports/summary`, `/reports/categories` 및 최근 월 summary |
| Email report send | Report/Settings | `sendEmailReport` | `POST /reports/email/send` |
| Email settings | Settings | `getEmailReportSetting`, `updateEmailReportSetting` | `GET/PUT /users/me/email-report-setting` |
| Exchange rate | `useExchangeRateQuery`, Dashboard | `getCurrentExchangeRate` | `GET /exchange-rates/current` |
| Exchange quote | `CalculatorPage` | `getExchangeQuote` | `GET /exchange-rates/quote` |
| Quote history | Calculator hook/page | `getExchangeQuoteHistory` | `GET /exchange-rates/quote/history` |
| Memo list | `MemoPage` 내부 `useEffect` | `getExpenseMemos` | `GET /expenses/memos` |

### 현재 API 호출 패턴

- 공통 client: `src/api/client.ts`
- 도메인 API 함수: `src/api/*.ts`
- React Query: `useBudgetQuery`, `useMyUserQuery`, `usePotsData`, `useExpenseHistoryData`, `useMonthlyReportData`, `useExchangeRateQuery`
- 수동 `useEffect` 호출: `useExpenseInputData`, `useExchangeCalculatorData`, `MemoPage`, 일부 onboarding/settings/report 로직
- Mutation 전용 `useMutation`: 없음. 저장·수정·삭제는 페이지에서 async 함수와 `useState`로 관리한다.

## Existing Test Coverage

현재 자동 테스트는 API client와 순수 함수에 집중되어 있다.

### API

- 공통 `apiRequest`의 성공·서버 오류·네트워크 오류
- 메모 응답 변환
- 메모 다중 삭제 요청 body
- 지출 삭제 endpoint

### Utils / i18n

- API 오류 메시지
- 카테고리 아이콘 매핑
- 통화 포맷과 현지 연월
- 환율 계산 및 소수점 표시
- 브라우저 언어 해석

### 미존재 영역

- Hook 테스트: 없음
- Component 테스트: 없음
- Page 테스트: 없음
- Router/Guard 테스트: 없음
- React Query 캐시·invalidation 테스트: 없음
- Modal focus/ESC/keyboard 테스트: 없음
- Responsive visual/E2E 테스트: 없음

## Missing Test Coverage

리팩터링 전에 우선 다음 테스트를 기준선으로 추가하는 것이 안전하다. 이번 단계에서는 테스트를 추가하지 않았다.

### Critical

- 환율 API 실패 시 Expense 저장 버튼이 비활성화되는지
- 환율 fallback 사용 시 화면에 fallback 상태가 표시되는지
- 지출 내역 핵심 API 전체 실패가 Error 상태가 되는지
- 401 응답 후 token reissue와 원 요청 재시도가 동작하는지

### High

- Login 성공·실패·세션 저장
- Signup 성공 후 onboarding redirect
- 각 Guard의 redirect matrix
- Modal ESC, 배경 클릭, focus trap, focus restore
- Expense 입력 성공·실패·중복 제출 차단
- Pots 생성·수정·배정·보관 성공/실패
- Report 조회 오류와 이메일 전송 오류
- Settings 프로필 및 이메일 리포트 저장

### Medium

- Empty 상태: 지출 없음, Pots 없음, 메모 없음, 계산 내역 없음
- Recent expense pagination/filter/edit/delete
- 통화별 금액 precision과 step
- Custom dropdown의 키보드 조작
- 360px/390px 주요 화면 smoke test

## Regression Checklist

### 인증·온보딩

- [ ] 랜딩에서 로그인·회원가입 진입
- [ ] 이메일 로그인 성공
- [ ] 이메일 로그인 실패 시 오류 메시지 표시
- [ ] Google 로그인 성공·실패 처리
- [ ] 회원가입 성공 후 세션 저장
- [ ] 미로그인 보호 경로가 `/login`으로 이동
- [ ] 이메일 인증 미완료 사용자가 `/verify-email`로 이동
- [ ] 온보딩 미완료 사용자가 base currency 단계로 이동
- [ ] 기준 통화 선택 및 다음 단계 이동
- [ ] 현지 통화 선택 및 다음 단계 이동
- [ ] 월 예산 저장
- [ ] 브라우저 시간대 저장
- [ ] 프로필·목표 저장
- [ ] 온보딩 완료 후 `/home` 이동

### 지출

- [ ] 지출 입력 화면 초기 로딩
- [ ] 통화 변경
- [ ] 금액·상점명·날짜·카테고리·메모 입력
- [ ] 환율 조회 성공 및 환산 금액 표시
- [ ] 환율 조회 실패 메시지와 재시도
- [ ] 환율 오류/로딩 중 잘못된 지출 저장 방지
- [ ] 지출 저장 성공 Toast 및 입력 초기화
- [ ] 지출 저장 실패 오류 표시
- [ ] CSV 파일 업로드 성공
- [ ] 잘못된 확장자·초과 용량 오류 표시
- [ ] 지출 내역 조회
- [ ] 지출 내역 Empty 상태
- [ ] 지출 내역 API 오류 및 재시도
- [ ] 기간·월 선택
- [ ] 최근 지출 상세 모달
- [ ] 지출명 수정
- [ ] 지출 삭제
- [ ] 메모 목록 조회·검색·정렬
- [ ] 메모 수정·삭제

### Pots

- [ ] Pots 조회
- [ ] Pots 로딩·빈 상태·오류 상태
- [ ] Pot 생성
- [ ] Pot 생성 실패 오류
- [ ] Pot 목표 금액 수정
- [ ] Pot 카테고리·대표 이미지 수정
- [ ] Pot 금액 배정
- [ ] Pot 목표 달성 메시지
- [ ] Pot 보관(삭제) 확인 모달
- [ ] Pot 보관 실패 오류
- [ ] 예산·배정·사용 가능 금액 요약 갱신

### Report·Calculator

- [ ] Report 조회
- [ ] Report 로딩·오류·재시도
- [ ] 일별 날짜 선택
- [ ] 월별 선택
- [ ] 차트 데이터와 텍스트 정보 일치
- [ ] 이메일 리포트 미리보기
- [ ] 이메일 리포트 전송 성공·실패
- [ ] 계산기 통화 선택
- [ ] 계산기 금액 입력·debounce 계산
- [ ] 통화 swap
- [ ] 환율 계산 실패 표시
- [ ] 계산 내역 조회·Empty·오류·재시도

### Settings·공통

- [ ] 프로필 조회
- [ ] 닉네임·프로필 이미지·목표 저장
- [ ] 프로필 저장 실패 오류
- [ ] 이메일 리포트 설정 조회
- [ ] 이메일 리포트 on/off
- [ ] 발송 시간·주기 저장
- [ ] Settings 미리보기 로딩·오류 상태
- [ ] 로그아웃 성공
- [ ] 로그아웃 API 실패에도 로컬 세션 삭제
- [ ] 모든 공통 버튼의 disabled/loading 상태
- [ ] Toast 자동 닫기·수동 닫기
- [ ] Modal ESC 닫기·배경 클릭·포커스 이동
- [ ] 키보드만으로 주요 흐름 수행
- [ ] 모바일 360px/390px에서 가로 스크롤 없음

## Existing Issues

이번 기준선에서는 문제를 수정하지 않고 기록만 남긴다.

| 우선순위 | 이슈 | 관련 파일 |
|---|---|---|
| Critical | 환율 Query 오류가 수동 Promise 처리로 전달되지 않고, 오류 상태에서도 지출 저장 가능 | `src/hooks/useExpenseInputData.ts`, `src/pages/ExpenseInputPage/ExpenseInputPage.tsx` |
| Critical | 지출 집계 요청이 모두 실패해도 `expenseResponses`가 빈 성공 객체라 전체 오류 판정이 작동하지 않을 가능성 | `src/api/expenses.ts` |
| High | 공통 Modal에 focus trap·닫힌 뒤 focus restore 없음 | `src/components/common/ModalShell/ModalShell.tsx` |
| High | Report 이메일 모달이 공통 Modal 계약을 우회하고 dialog semantics가 부족함 | `src/pages/ReportPage/ReportPage.tsx` |
| High | 실패한 GET Promise가 `cachedApiRequest`에 일정 시간 남아 즉시 재시도를 막을 수 있음 | `src/api/cachedRequests.ts` |
| High | Report, ExpenseHistory, DashboardLayout, Settings가 데이터·상태·UI·모달 책임을 동시에 보유 | 해당 page/layout 파일 |
| Medium | Loading/Error/Empty UI가 공통 컴포넌트 없이 화면별로 중복 구현됨 | `src/pages/*`, `src/components/common` |
| Medium | Custom listbox와 달력의 키보드 조작 계약이 통일되지 않음 | Report, Memo, Calculator, CurrencyDropdown, ExpenseInput |
| Medium | `CurrencyAmountInput`과 Pots slider의 통화별 소수점/step 규칙이 일관되지 않음 | `src/components/common/CurrencyAmountInput`, `src/pages/PotsPage` |
| Medium | Settings 시간 선택이 `01:00~24:00`을 생성하며 저장 중 중복 제출 상태가 부족함 | `src/pages/SettingsPage/SettingsPage.tsx` |
| Medium | README에 기술된 `/reports/monthly`와 현재 `reports.ts`의 실제 호출 방식이 다름 | `README.md`, `src/api/reports.ts` |
| Low | `HomePage`, `AutoSavingsCard`, `useExchangeCalculatorData` 등 미사용 코드가 존재 | 해당 파일 |
| Low | 별도 `typecheck` npm script가 없음 | `package.json` |
| Low | 대형 JS 초기 chunk가 403.02 kB raw로 생성됨 | Vite build output |

### 기준선에서 확인하지 못한 항목

- 실제 API 서버와의 통합 동작은 로컬 테스트에서 검증하지 않았다.
- 브라우저 viewport별 시각 회귀 검증은 수행하지 않았다.
- Chrome/WebKit E2E 및 스크린리더 검증은 수행하지 않았다.
- 실제 사용자 인증 계정으로 로그인·온보딩을 끝까지 재현하지 않았다.

## 최종 평가

### READY WITH ISSUES

TypeScript, ESLint, Vitest, Production build는 모두 통과하므로 코드베이스 자체는 리팩터링을 시작할 수 있는 실행 기준선을 갖추고 있다.

다만 환율 오류 상태에서 저장 가능한 문제, 지출 API 전체 실패가 빈 데이터로 보일 가능성, Modal 접근성 부족, 컴포넌트·페이지 테스트 부재는 리팩터링 중 회귀를 유발할 위험이 높다.

따라서 대규모 구조 이동을 바로 시작하기보다는, 이 보고서와 회귀 체크리스트를 기준선으로 고정한 뒤 다음 순서가 적절하다.

1. Critical 데이터 무결성 이슈를 재현 테스트로 고정
2. 공통 Modal 및 Loading/Error/Empty 상태의 동작 계약을 테스트로 고정
3. 그 후 파일 이동 없는 작은 feature 단위 리팩터링 시작

이번 단계에서는 위 이슈를 수정하지 않았다.
