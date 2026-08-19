# Browser / E2E QA Report

## Environment

| 항목 | 결과 |
| --- | --- |
| Project | `C:\Users\COM\uniconvert` |
| Node.js | v22.17.1 |
| npm | 10.9.2 |
| React | 19.2.7 |
| Vite | 8.1.0 |
| Test runner | Vitest 4.1.10 |
| Dev server | `npx vite --host 127.0.0.1`로 실행 확인 |
| Preview server | `npx vite preview --host 127.0.0.1`로 실행 확인 |
| Browser automation | 연결 불가. Browser runtime bootstrap에서 trusted RPC dependency 경로 오류가 발생해 Chromium tab을 만들지 못함 |

브라우저 자동화가 연결되지 않았으므로 실제 화면 클릭·타이핑·스크린샷·DevTools Network/Console 검증은 완료된 것으로 판정하지 않았다. 가능한 범위에서 개발/preview 서버의 HTTP history fallback, 정적 DOM 진입점, 정적 asset 응답과 기존 자동화 계약 테스트를 별도로 확인했다.

## Viewports Tested

실제 브라우저 viewport를 설정할 수 없어 다음 6개 viewport는 **미실행(Not Executed)** 으로 남겼다.

| Viewport | 실제 브라우저 | 확인 내용 |
| --- | --- | --- |
| 360 × 800 | 미실행 | horizontal scroll, 버튼/모달 overflow, 모바일 navigation 확인 필요 |
| 390 × 844 | 미실행 | 동일 |
| 768 × 1024 | 미실행 | tablet layout, chart/dropdown 위치 확인 필요 |
| 1024 × 768 | 미실행 | sidebar와 content 폭 확인 필요 |
| 1440 × 900 | 미실행 | desktop page layout 확인 필요 |
| 1920 × 1080 | 미실행 | max-width, 빈 공간, chart 비율 확인 필요 |

HTML의 `viewport` meta 태그는 존재하며, dev/preview 서버는 모든 주요 history path에 200 응답을 반환했다. 이것만으로 실제 CSS overflow나 시각적 clipping을 PASS로 판정하지 않았다.

## User Flows Tested

브라우저 세션과 인증 상태를 만들 수 없어 사용자 입력 기반 flow는 미실행이다. 다음 경로는 route table과 SPA fallback 응답으로 존재 여부만 확인했다.

| Flow | Route | 브라우저 실행 | 정적/자동화 근거 |
| --- | --- | --- | --- |
| Login | `/login` | 미실행 | route 등록, preview history fallback 200 |
| Signup / verification | `/signup`, `/verify-email` | 미실행 | route 등록 확인 |
| Onboarding | `/onboarding/*` | 미실행 | 5개 onboarding route 등록 확인 |
| Expense input | `/` | 미실행 | protected route 등록, Critical tests PASS |
| Expense history | `/expenses` | 미실행 | protected route 등록, existing tests PASS |
| Pots | `/pots` | 미실행 | protected route 등록 |
| Report | `/report` | 미실행 | protected route 등록, chart/calendar tests PASS |
| Memo | `/report/memos` | 미실행 | protected route 등록, memo query enablement test PASS |
| Calculator | `/calculator` | 미실행 | route 등록, accessibility test PASS |
| Settings | `/settings` | 미실행 | protected route 등록 |

## Keyboard QA

마우스 없이 실제 Tab/Shift+Tab/Enter/Space/Escape/Arrow 동작을 브라우저에서 실행하지 못했다.

코드 수준 계약은 기존 자동화 테스트로 확인했다.

- `useCalendarKeyboard.test.ts`: ArrowLeft/Right/Up/Down, Home/End, Escape와 trigger focus restore 계산 계약
- `useListboxKeyboard.test.ts`: listbox 키보드 이동 계약
- `ModalShell.test.tsx`: dialog close/focus 관련 계약
- `RouteErrorFallback.test.tsx`: route 오류 복구 UI 계약

위 테스트 PASS는 실제 focus ring, DOM focus, 200% zoom clipping까지 보증하지 않으므로 브라우저 수동 재검증이 필요하다.

## Calendar QA

Expense Input과 Report calendar의 실제 open → selected day focus → Arrow/Home/End → Escape → trigger restore 흐름은 브라우저에서 미실행이다.

공통 pure keyboard contract와 accessible date label 생성 테스트는 PASS했다. 실제 월 이동, 날짜 선택, focus가 DOM에서 이동하는지는 다음 브라우저 실행에서 확인해야 한다.

## Route / Guard QA

`AppRouter`의 landing/auth/onboarding/dashboard/wildcard route 및 `RouteGuards`의 login, email verification, onboarding redirect 조건을 정적으로 확인했다.

dev 및 preview 서버에서 `/`, `/login`, `/signup`, `/onboarding`, `/dashboard`, `/expenses/input`, `/expenses`, `/pots`, `/report`, `/report/memos`, `/calculator`, `/settings`, unknown path가 모두 SPA entry를 200으로 반환했다. 이는 history fallback 확인이며 React guard redirect 성공을 의미하지 않는다.

실제 guest/logged-in/email-unverified/onboarding-incomplete 상태의 redirect는 인증 세션과 브라우저 실행이 필요해 미판정이다.

## Expense Input

실제 금액 입력, exchange-rate loading/error/not-ready 차단, 정상 저장, 저장 실패, double click, decimal currency, calendar, file import는 미실행이다.

`ExpenseInputPage.critical.test.tsx` 및 exchange-rate 관련 hook 테스트를 포함한 전체 Vitest는 PASS했다. 백엔드 기본 주소는 무인증 요청에서 HTTP 401을 반환했으므로 실제 저장 flow는 유효한 사용자 세션 없이는 검증할 수 없었다.

## Expense History

loading/success/empty/error/retry, partial success, month selection, edit/delete, dialog keyboard를 실제 브라우저에서 미실행했다.

핵심 API 전체 실패가 Empty 성공으로 변환되지 않는 Critical 회귀 테스트와 기존 API 테스트는 전체 PASS했다. 이는 service 계약 검증이며 실제 화면에서 ErrorState가 보이는지까지는 확인하지 못했다.

## Pots

create/edit/allocation/archive, mutation failure, modal close, keyboard, responsive layout은 미실행이다. 인증된 백엔드 응답과 실제 DOM 상호작용이 필요하다.

## Report

initial loading, month/date select, chart, transaction list, partial failure, email dialog/send pending-failure-success, chart accessible summary, calendar keyboard는 미실행이다.

chart accessible summary, chart `aria-hidden`, date button semantics와 report query 계약 테스트는 PASS했다. 이메일 provider/SES 성공 여부와 backend response handling은 이 환경에서 검증하지 않았다.

## Calculator

amount input, from/to currency listbox, quote loading/success/error, history, keyboard navigation, narrow viewport overflow는 미실행이다.

amount/result label과 input id 연결 accessibility 테스트는 PASS했다. 실제 외부 환율 API 응답과 화면 overflow는 브라우저에서 확인해야 한다.

## Settings

profile load/save, email-report setting, time picker, preview, send, save pending/failure feedback은 미실행이다. 백엔드 인증 세션과 메일 provider 동작이 필요하다.

## Memo Network Check

실제 DevTools Network 패널 확인은 미실행이다.

대신 `useDashboardAssetSummary.test.tsx`에서 현재 코드 계약을 확인했다.

- `/report/memos`: budget query와 user summary query에 `enabled = false`
- 그 외 Dashboard route: 두 query 모두 `enabled = true`

실제 브라우저에서 불필요한 요청이 발생하지 않는지와 Dashboard route의 정상 요청은 Network tab으로 재검증해야 한다.

## Offline / Slow Network

Slow 3G 및 Offline throttling을 실행하지 못했다. Loading, ErrorState, Retry, mutation failure, lazy route loading이 멈추거나 잘못된 성공 상태를 표시하는지는 미판정이다.

## Console / Runtime Errors

브라우저 Console과 unhandled rejection을 수집하지 못했다. 대신 다음 비브라우저 검증은 통과했다.

- TypeScript: 0 errors
- ESLint: 0 errors, 0 warnings
- Production build: PASS
- 기존 전체 Vitest: 30 files, 102/102 PASS

따라서 build-time 오류나 테스트에서 드러난 runtime contract 오류는 없었지만, 실제 console warning/key warning/failed lazy asset은 브라우저에서 미판정이다.

## Assets

dev server에서 소스에 정적으로 참조된 `/assets` 및 `/fonts` 경로 70개를 HTTP 요청해 모두 200으로 확인했다. favicon, apple-touch-icon, og-image와 Vite entry도 200이었다.

동적으로 생성되는 category/currency/profile 경로와 Google Identity script의 실제 브라우저 로딩·404 여부는 Console/Network 세션이 없어 미판정이다.

## Issues Reproduced

브라우저에서 재현된 제품 이슈는 없다. 실제 브라우저 tab이 생성되지 않아 추측성 finding을 등록하지 않았다.

## Issues Not Reproduced

다음은 제품 이슈로 확정하지 않았으며 브라우저 세션 확보 후 재검증해야 한다.

- 200% zoom에서 navigation, form, modal, calendar, chart의 clipping/overflow
- 360–1920px viewport의 horizontal scroll, chart/dropdown/modal overflow
- 실제 keyboard focus ring, dialog focus trap/restore, calendar DOM focus
- route render error 및 lazy chunk failure에서 `RouteErrorFallback` 표시와 recovery navigation
- guest/logged-in/email-unverified/onboarding 상태별 redirect
- Expense Input/History/Pots/Report/Settings의 실제 API loading/error/retry 화면
- `/report/memos`의 실제 Network request absence와 다른 Dashboard route의 query 실행
- Offline/Slow 3G 상태의 ErrorState/Retry 및 mutation feedback
- duplicate GET/POST, duplicate expense save, duplicate email send
- 브라우저 Console의 React warning, unhandled rejection, 404 dynamic asset

## Tests / TypeScript / ESLint / Build

| 검증 | 결과 |
| --- | --- |
| `npm test` | 30 test files, 102/102 PASS |
| `npx tsc -b` | PASS, 0 errors |
| `npm run lint` | PASS, 0 errors / 0 warnings |
| `npm run build` | PASS, 205 modules transformed |
| dev HTTP history fallback | 주요 route 및 unknown path 200 |
| preview HTTP history fallback | 주요 route 및 unknown path 200 |
| static asset smoke | 정적 `/assets`·`/fonts` 참조 70/70 HTTP 200 |

QA 단계에서 소스, API endpoint, request/response contract, UI 코드는 수정하지 않았다.

## Remaining Manual QA

브라우저 자동화 또는 실제 Chromium 세션을 확보한 뒤 다음 순서로 실행한다.

1. 360, 390, 768, 1024, 1440, 1920 viewport에서 주요 route의 overflow와 modal/dropdown/chart 위치 확인
2. 200% zoom에서 focus ring과 콘텐츠 clipping 확인
3. guest, email-unverified, onboarding-incomplete, onboarding-complete 세션별 guard redirect 확인
4. Expense Input/History/Pots/Report/Calculator/Settings/Memo의 API 상태 및 retry 확인
5. Expense Input/Report calendar와 listbox/dialog의 실제 DOM focus 확인
6. `/report/memos` Network request 및 Dashboard query 비교
7. Offline/Slow 3G에서 loading/error/retry/mutation 상태 확인
8. Console, Network, failed asset, duplicate request 수집

## Remaining Backend / Deployment Checks

- 유효한 테스트 계정과 각 onboarding 상태의 세션 준비
- API 인증/권한 및 각 핵심 endpoint의 fixture 또는 staging 데이터 준비
- `/reports/email/send`, `/reports/monthly/email`의 SES/provider 성공·실패 계약 확인
- CORS, CSP, Google Identity script allowlist 및 production security headers 확인
- production lazy chunk cache/redeploy와 route fallback 확인
- 실제 API 실패 시 status code와 사용자용 오류 문구 확인

## Release Recommendation

**NOT READY** (브라우저 QA 게이트 기준)

코드 기준선은 전체 테스트 102/102, TypeScript, ESLint, production build 모두 통과했고 정적 HTTP/asset smoke도 통과했다. 그러나 이번 요청의 핵심인 실제 브라우저 viewport·키보드·Network·Console·인증 사용자 흐름을 실행할 브라우저 세션이 연결되지 않아 릴리스 적합성을 확정할 수 없다. 이는 재현된 제품 결함 판정이 아니라, 브라우저 QA 미완료에 따른 검증 차단이다. 브라우저/테스트 계정이 준비되면 위 수동 QA 항목을 완료한 뒤 READY 여부를 다시 판정해야 한다.
