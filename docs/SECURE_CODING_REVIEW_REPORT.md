# Secure Coding Review Report

## Executive Summary

이번 검토는 현재 프론트엔드 코드와 실제 호출 흐름만 대상으로 진행했다. 확인 결과, 프론트엔드에서 즉시 확인되는 Critical XSS, open redirect, 하드코딩된 서버 credential, 토큰의 URL 노출은 발견되지 않았다.

다만 다음 두 가지는 실제 코드 수준에서 확인했다.

1. access/refresh token이 `sessionStorage`에 저장되어 있어 동일 출처 JavaScript가 읽을 수 있다. 현재 XSS sink는 발견되지 않았지만, HttpOnly cookie 전환 없이는 이 노출면을 제거할 수 없다.
2. 파일 업로드 실패 시 예상 밖의 `Error` 원문을 모달에 표시할 수 있었다. 이 경로는 공통 업로드 오류 문구로 제한하고, API의 사용자용 검증 오류만 유지하도록 수정했다.

배포 보안 헤더와 백엔드의 인증·권한·파일 검증·CORS 정책은 이 저장소만으로 확정하거나 수정할 수 없으므로 별도 요구사항으로 분리했다.

## Threat Surface

| 영역 | 실제 구현 | 잠재 위험 | 실제 악용 가능성 | FE에서 수정 가능 | Priority |
| --- | --- | --- | --- | --- | --- |
| Authentication | `apiRequest`의 Bearer Authorization, 로그인/Google 로그인 API | 토큰 탈취 시 세션 사용 | 현재 XSS 경로는 확인되지 않음 | 부분적 | Medium hardening |
| Session / Token | access/refresh token을 `sessionStorage`에 저장 | 동일 출처 스크립트가 토큰 읽기 가능 | XSS가 선행되어야 함 | cookie 계약 변경 없이는 불가 | Medium |
| API client | 401 단일 재발급 Promise, 원 요청 1회 재시도 | 재발급 실패·비멱등 요청 재실행 의미 | 재발급 실패 정리는 확인됨; 서버의 401 처리 순서는 미확인 | 제한적 | Review observation |
| User input | React controlled input, 일부 길이·수·통화 검증 | 우회 가능한 클라이언트 검증 | 백엔드 검증 필요; FE 우회만으로 권한 상승 없음 | UX 범위만 가능 | Backend requirement |
| File upload | CSV 단일 파일, 확장자/MIME hint, 30MiB UI 제한 | 브라우저 제한 우회, 악성/대용량 파일 | 백엔드 검증 여부는 미확인 | 제한적 | Backend requirement |
| XSS / DOM | React JSX 렌더링, unsafe DOM sink 없음 | 서버 문구가 HTML로 해석될 위험 | 검색상 unsafe sink 없음 | 해당 없음 | None |
| External script | 고정된 Google Identity Services URL, async/defer | CSP 미비 시 외부 스크립트 정책 의존 | 현재 URL은 상수이며 중복 로드는 dedupe됨 | CSP는 배포 영역 | Medium |
| URLs / redirects | React Router의 상수 route path | 사용자 지정 open redirect | 사용자 URL을 `navigate`/`window.open`에 전달하지 않음 | 해당 없음 | None |
| Storage | `sessionStorage`에 세션·온보딩 값, `localStorage` 미사용 | 탭 내 JS 접근, 민감값 잔존 | logout/refresh 실패 시 clear 확인 | 저장 방식 변경은 백엔드 협의 | Medium |
| Email report | 백엔드 `/reports/email/send`, `/reports/monthly/email` 호출 | provider secret 노출, 수신자 검증 | FE provider secret 없음 | 백엔드 영역 | Backend requirement |

## Authentication / Session

- `src/auth/session.ts:11-52`에서 사용자, access token, refresh token을 `sessionStorage`에 저장한다.
- `src/api/client.ts:97-132`는 refresh token을 사용한 단일 재발급 Promise를 공유해 동시 401 요청의 재발급 폭주를 줄인다.
- `src/api/client.ts:148-166`에서 재발급 실패 또는 재시도 후 401이면 `clearSession()`을 호출한다.
- `src/layouts/DashboardLayout/DashboardLayout.tsx:141-153`은 서버 logout 성공 여부와 관계없이 `finally`에서 세션을 지우고 로그인 화면으로 이동한다.
- `src/routes/RouteGuards.tsx`의 guard는 `sessionStorage`의 사용자 상태를 이용한 화면 라우팅 제어다. 이는 UX 경계일 뿐 백엔드 authorization 경계가 아니다.
- 백엔드는 모든 데이터 조회·변경에서 authentication, 사용자 ownership, authorization을 반드시 재검증해야 한다.

## Token Storage

현재 `localStorage`는 사용하지 않고 access/refresh token 모두 `sessionStorage`에 저장한다. `sessionStorage`는 영구 저장보다 수명이 짧지만 JavaScript에서 읽을 수 있으므로 XSS가 발생하면 두 토큰 모두 노출될 수 있다. 현재 코드에는 토큰을 console, DOM, URL/query에 출력하는 경로가 없다.

HttpOnly/Secure/SameSite cookie 전환은 refresh/login API 계약과 백엔드 CORS/CSRF 정책을 함께 바꾸는 작업이므로 이번 프론트엔드 단계에서 임의 적용하지 않았다.

## XSS

다음 sink를 소스 전체에서 검색했으며 결과는 0건이다.

- `dangerouslySetInnerHTML`
- `innerHTML`, `outerHTML`, `insertAdjacentHTML`
- `document.write`
- `eval`, `new Function`
- 문자열 기반 `setTimeout`/`setInterval`

사용자·서버 텍스트는 JSX의 기본 escaping을 거쳐 렌더링된다. `memo`, merchant, category name, report message를 HTML로 해석하는 코드도 확인되지 않았다. 따라서 현재 확인 가능한 DOM 기반 XSS finding은 등록하지 않는다.

## Redirect / URL Safety

- `navigate`와 `<Navigate>`에는 `ROUTE_PATHS` 상수 또는 현재 pathname만 전달된다.
- `window.location`, `location.href`, `window.open`, `target="_blank"` 사용은 확인되지 않았다.
- `VITE_GOOGLE_AUTH_PATH`는 API client에 path로 결합되며 임의 외부 URL로 직접 이동시키는 redirect sink가 아니다.
- 현재 open redirect 또는 `javascript:` URL 경로는 확인되지 않았다.

## Google Identity / External Scripts

`src/components/common/GoogleIdentityButton/GoogleIdentityButton.tsx:6-80`은 `https://accounts.google.com/gsi/client`를 고정 URL로 삽입하고 `async`/`defer`를 사용한다. script id와 module-level Promise로 중복 삽입을 방지하며, 컴포넌트 해제 시 버튼 host를 비운다. credential은 callback에서 API body로 전달되고 console/DOM에 저장하지 않는다.

`VITE_GOOGLE_CLIENT_ID`는 OAuth 공개 식별자이며 secret으로 취급하지 않는다. client secret, AWS credential, private key, Email provider secret은 번들 소스·환경 예시에서 발견되지 않았다. Google script 허용은 CSP의 `script-src` deployment 설정에 포함되어야 한다.

## Environment Variables / Secrets

확인된 `VITE_*` 이름은 다음 세 가지다.

- `VITE_API_BASE_URL`
- `VITE_GOOGLE_CLIENT_ID`
- `VITE_GOOGLE_AUTH_PATH`

`VITE_*`는 브라우저 번들에 노출될 수 있으므로 secret이 아니다. 현재 값의 종류는 API URL, Google client ID, API path이며 private credential은 아니다. `.env.local`은 `.gitignore`의 `*.local` 규칙으로 추적하지 않고, `.env.example`에는 공개 가능한 예시 설정만 있다.

## API Client

- Authorization header는 access token이 있을 때만 `Bearer` 형식으로 추가된다(`src/api/client.ts:69-74`).
- `credentials: 'include'`는 사용하지 않으므로 현재 FE 인증 흐름은 cookie 자동 전송 기반이 아니다.
- JSON 응답 형식을 확인하고, network error는 `NETWORK_ERROR` `ApiError`로 변환한다.
- refresh 실패 시 세션을 비우고 원 요청을 실패시킨다.
- 현재 구현은 `retryOnUnauthorized`가 켜진 모든 HTTP method를 401 이후 한 번 재전송한다(`src/api/client.ts:141-156`). 서버가 처리 후 401을 반환하는 계약이라면 POST/PATCH 중복 실행 가능성을 검토해야 하지만, 현재 코드만으로 서버가 그런 순서를 사용하는지는 확인할 수 없다. 따라서 이번 단계에서 동작을 임의 변경하지 않고 백엔드 계약 확인 항목으로 남겼다.

## CSRF / CORS

현재 요청은 cookie credentials가 아니라 명시적 Authorization Bearer header를 사용하므로 전통적인 cookie 자동전송 CSRF와 동일한 구조는 아니다. CORS 허용 origin, Authorization 허용 header, preflight, rate limit은 백엔드/배포 정책이며 이 저장소에는 설정이 없다. cookie 기반 인증으로 전환할 경우 SameSite와 CSRF 방어를 함께 설계해야 한다.

## Input Validation

- 회원가입은 이메일 형식, 비밀번호 8–100자, 확인값 일치를 클라이언트에서 검사한다.
- 지출 금액은 숫자 이외 문자를 제거하고 저장 handler에서 양수·유한 환율·예산 준비 상태를 다시 확인한다.
- memo는 200자, Pot 이름은 30자 UI 제한이 있다.
- 통화 선택은 `CurrencyCode` allowlist를 사용한다.
- merchant 및 일부 onboarding 값은 UI 길이 제한이 없거나 제한이 충분한지 백엔드 계약 확인이 필요하다.

클라이언트 검증은 UX 방어일 뿐 우회 가능하므로, 백엔드는 길이·범위·enum·소유권·날짜·금액·CSV 내용을 독립적으로 검증해야 한다.

## File Upload

`FileUploadModal`은 `.csv,text/csv` 단일 파일과 30MiB UI 제한을 사용한다(`src/components/common/FileUploadModal/FileUploadModal.tsx:15,104`). 이 값은 브라우저에서 우회 가능하므로 백엔드가 파일 크기, 실제 MIME/signature, CSV 구조, 인코딩, 행/열 제한을 검증해야 한다. CSV를 다시 내보내거나 이메일로 전달하는 서버 흐름이 있다면 formula injection 처리도 백엔드에서 확인해야 한다.

업로드 실패 시 원문 `Error.message`가 모달에 표시되던 경로는 수정했다. 자세한 내용은 `## Error Exposure`와 `SEC-03`을 참고한다.

## Error Exposure

대부분의 API 실패 화면은 `getApiErrorNotice`를 사용해 network/401/403/404/429/5xx 메시지를 사용자용 문구로 변환한다. 기존 `FileUploadModal`만 예외적으로 모든 `Error.message`를 모달에 직접 넣고 `onError`로 전달했다.

수정 후 `src/components/common/FileUploadModal/uploadError.ts`는 `ApiError`의 사용자용 4xx 검증 메시지만 유지하고, 5xx·network·예상 밖의 `Error`는 일반 업로드 실패 문구로 제한한다. 부모 callback에도 제한된 메시지만 전달한다.

## Asset Path Safety

`src/utils/categoryIcon.ts:15-23`은 서버의 `iconKey`를 정규화한 뒤 고정된 `/assets/icons/categories/category-${normalized}.png` prefix에 붙인다. prefix 때문에 값 자체가 외부 protocol URL이 되지는 않으며 결과는 `<img>` source다. 다만 서버 enum 계약이 이 저장소에서 확정되지 않아 `../` 또는 예상 밖 slash를 허용하지 않는다는 보장은 없다.

현재는 정상 서버 key를 임의 차단하지 않기 위해 allowlist를 추가하지 않았다. 백엔드가 icon key enum을 보장하고, FE에서 허용 목록을 공유할 수 있게 되면 해당 계약을 기준으로 보강할 수 있다. 현재 코드만으로 별도 XSS finding으로 확정하지 않는다.

## Storage Review

`localStorage` 사용은 없다. `sessionStorage`에는 다음 값이 저장된다.

- access token, refresh token, serialized user profile
- onboarding base/local currency, monthly budget, timezone, profile goals

지출 목록·메모·리포트 본문을 storage에 캐시하지 않는다. logout과 refresh 실패 시 세션 및 onboarding key를 함께 삭제한다. onboarding 입력은 API 전송 전까지 브라우저 탭 세션에 남으므로 공용 PC 사용 시 탭 종료가 필요하며, 장기 보관이 필요한 값은 아니다.

## Sensitive Data in URL

`URLSearchParams`로 날짜 범위, 통화, 페이지 정보가 전달된다. `getExchangeQuote`는 실제 입력 금액을 `/exchange-rates/quote` query parameter로 전송한다(`src/api/exchangeRates.ts:82-90`). token, password, email, memo, OAuth credential은 URL에 넣지 않는다.

금액 query는 현재 API 계약상 동작이며 브라우저 주소창 history에 직접 남는 navigation URL은 아니다. 다만 API gateway/proxy access log에 기록될 수 있으므로 운영 환경에서 로그 마스킹·보존 정책을 확인해야 한다. 이번 단계에서 endpoint 계약은 변경하지 않았다.

## Email Report

프론트엔드는 `/reports/email/send`와 `/reports/monthly/email` API를 호출하며, 외부 EmailJS/SMTP/AWS credential을 번들에 포함하지 않는다. preview는 `/reports/summary`와 `/reports/categories`를 조회하고, 발송 요청 body는 비어 있거나 언어 header만 포함한다.

recipient 검증, report 데이터 접근 권한, SES/provider secret, 발송 rate limit, 메일 HTML escaping은 백엔드 책임이다. SES가 거부된 상태를 프론트에서 provider secret으로 우회해서는 안 된다.

## Security Headers / CSP

`index.html`에는 CSP, `frame-ancestors`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Content-Type-Options`, HSTS 설정이 없고, 저장소에 nginx/CloudFront/S3/Vercel header 설정 파일도 없다. meta CSP를 임의 추가하면 Google Identity script와 API connect 정책을 잘못 막을 수 있으므로 코드 수정 대신 배포 설정 요구사항으로 남겼다.

## Dependency Review

- `npm audit --omit=dev`: production dependency 9개, 취약점 0개
- `npm audit`: 전체 dependency 214개, info/low/moderate/high/critical 모두 0개
- 이번 단계에서 package update나 신규 라이브러리 설치는 하지 않았다.

## Findings

### SEC-01 — Medium — Session tokens readable by same-origin JavaScript

- **Evidence**: `src/auth/session.ts:11-52` stores both access and refresh tokens in `sessionStorage`.
- **Attack Scenario**: 현재 확인된 XSS sink는 없지만, 향후 동일 출처 script injection이 생기면 JavaScript가 두 토큰을 읽을 수 있다.
- **User Impact**: 공격자가 활성 탭의 세션을 탈취할 수 있다.
- **Frontend Fix**: 이번 단계에서 cookie 계약을 임의 변경하지 않았다. DOM sink 제거와 raw error sanitization을 적용해 현재 FE 공격면을 줄였다.
- **Backend / Deployment Requirement**: 가능하면 HttpOnly, Secure, SameSite cookie 기반 session으로 백엔드와 FE 계약을 함께 전환하고, CORS/CSRF 정책을 재검토해야 한다.

### SEC-02 — Medium — Deployment security headers are not represented in the repository

- **Evidence**: `index.html`과 Vite config에 CSP 및 주요 response header 설정이 없고, 배포 header 파일도 없다.
- **Attack Scenario**: 별도 injection 또는 framing 조건이 있을 때 CSP·frame 정책·MIME sniffing 방어가 제공되지 않을 수 있다. 헤더 부재만으로 현재 코드에서 즉시 실행되는 공격을 확인한 것은 아니다.
- **User Impact**: 배포 환경에 따라 clickjacking, script injection 영향 범위, referrer 정보 노출 방어가 약해질 수 있다.
- **Frontend Fix**: API/외부 script 계약과 충돌할 수 있어 프론트 소스에 임의 meta CSP를 추가하지 않았다.
- **Backend / Deployment Requirement**: 배포 응답에 CSP(`accounts.google.com` script 허용 및 실제 API `connect-src` 포함), `frame-ancestors`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS를 적용하고 실제 헤더를 검증해야 한다.

### SEC-03 — Medium — Upload error could expose unexpected exception text (fixed)

- **Evidence**: 기존 `FileUploadModal`은 `error.message`를 그대로 `errorMessage` 상태와 `onError` callback에 전달했다. 이 저장소의 API 오류 경로에는 `ApiError` 외의 예외도 전달될 수 있다.
- **Attack Scenario**: 업로드 adapter/parser가 내부 경로, exception class, connection detail을 포함한 일반 `Error`를 던지면 모달과 toast에 원문이 표시될 수 있었다.
- **User Impact**: 내부 구현 정보가 사용자에게 노출되고, 오류 문자열이 다른 화면으로 전파될 수 있다.
- **Frontend Fix**: `uploadError.ts`의 `getUploadErrorMessage`를 도입했다. API 4xx 사용자용 검증 메시지만 유지하고, 5xx/network/예상 밖 오류는 일반 문구로 대체하며 부모 callback에도 sanitized `Error`만 전달한다.
- **Backend / Deployment Requirement**: 백엔드도 4xx에는 사용자용 메시지만, 5xx에는 내부 stack/path/DB 정보를 포함하지 않는 응답을 반환해야 한다.

### Review observations (not confirmed vulnerabilities)

- `apiRequest`는 401 후 POST/PATCH/DELETE를 포함한 원 요청을 한 번 재시도한다. 서버가 처리 후 401을 반환하는지 확인되지 않았으므로 중복 실행 취약점으로 확정하지 않았다. 서버는 인증 실패가 작업 처리 전에 발생하는지, 필요 시 idempotency 정책을 제공하는지 확인해야 한다.
- category icon key와 profile image는 서버 데이터에서 파생되지만, 현재는 `<img>` source이며 외부 script 실행 sink가 확인되지 않았다. 백엔드 enum/URL 검증 요구사항으로 남겼다.

## Fixes Applied

- 파일 업로드 오류 원문 노출 경로를 공통 안전 문구 처리로 변경했다.
- API의 사용자용 4xx 검증 메시지는 기존 UX를 유지하고, 내부 오류만 숨겼다.
- API endpoint, request/response 계약, UI 레이아웃, 인증 정책은 변경하지 않았다.

## Security Tests Added

`src/components/common/FileUploadModal/FileUploadModal.security.test.ts`에 다음 3개 테스트를 추가했다.

- 5xx 내부 오류 메시지가 일반 업로드 오류로 대체되는지
- 4xx 사용자용 검증 메시지가 유지되는지
- 예상 밖 일반 `Error`가 fallback 문구로 제한되는지

## TypeScript / ESLint / Vitest / Build

- TypeScript: `npx tsc -b` — 0 errors
- ESLint: `npm run lint` — 0 errors, 0 warnings
- Security test: 3/3 passed
- Full Vitest: 26 files, 92/92 tests passed
- Production build: `npm run build` — PASS
- npm audit: production 및 전체 dependency 모두 취약점 0개

## Remaining Backend Requirements

- HttpOnly/Secure/SameSite cookie 전환을 auth API와 함께 검토
- 모든 API에서 authentication, ownership, authorization 재검증
- CORS allowlist, Authorization preflight, rate limit 및 refresh endpoint 보호
- CSV 실제 MIME/내용/크기/행 제한과 formula injection 방어
- 4xx/5xx 오류 응답에서 내부 stack/path/DB 정보 제거
- 401 처리 순서와 POST/PATCH/DELETE retry의 idempotency 보장
- email recipient/report ownership, SES/provider secret, 발송 rate limit 및 메일 콘텐츠 escaping
- 서버가 category icon key와 profile image 값을 enum/허용 URL로 검증

## Remaining Deployment Requirements

- CSP와 Google Identity Services/API origin allowlist 검증
- `frame-ancestors` 또는 `X-Frame-Options`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy`, `Permissions-Policy`
- HTTPS 전용 HSTS
- 실제 production response header와 CORS 정책을 배포 환경에서 점검

## Release Recommendation

**READY WITH ISSUES**

현재 프론트엔드에서 확인된 파일 업로드 오류 원문 노출은 수정했고, Critical/High 수준의 확정된 XSS·open redirect·credential 하드코딩은 발견되지 않았다. 다만 sessionStorage token hardening과 보안 헤더는 백엔드/배포 협업이 필요한 미해결 요구사항이며, production release 전에 해당 정책과 401 retry/upload/email/CORS 계약을 확인해야 한다.
