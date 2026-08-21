# Uniconvert Security Validation — Final Report

## 1. Executive Summary

Uniconvert의 보안 검증은 “보안 기능을 많이 적용했다”는 나열보다 실제 공격 흐름을 재현하고 결과를 확인하는 데 초점을 맞췄다.

> 공격자 관점에서 실제 HTTP 요청을 분석하고, 공격을 재현한 뒤 방어 코드를 적용하고 다시 검증했다.

세 가지 핵심 사례를 깊게 검증했다.

1. Burp Suite로 인증 제거와 API 요청값 변조
2. Stored XSS와 `sessionStorage` 토큰의 잠재 영향 분석 및 CSP 적용
3. PWA Cache Storage의 개인 금융 데이터 잔존 여부 검증

## 2. 프로젝트 및 검증 범위

| 항목 | 내용 |
|---|---|
| 서비스 | 지출 관리 및 환율 변환 웹 앱 |
| 프론트엔드 | React, TypeScript, Vite |
| 배포 | AWS EC2 |
| 인증 | Access/Refresh Token을 `sessionStorage`에 저장 |
| 검증 도구 | Burp Suite Community, Chrome DevTools, 코드 검색, 자동 테스트·빌드 |
| 제약 | 프론트엔드 담당자 기준 Nginx/EC2 서버 설정 권한 없음 |

모든 공격 테스트는 소유한 테스트 계정과 허가된 범위에서 진행했으며, 토큰이나 개인정보를 외부로 전송하지 않았다.

## 3. 핵심 결과

| Case | 문제·위협 | 수행한 검증 | 개선 | 재검증 결과 |
|---|---|---|---|---|
| API Security | 인증 우회, 입력값 변조, 수치 범위 초과 | 인증 헤더 제거 및 JSON 값 직접 변조 | 금액 상한·자릿수 Validation 추가 | 초대형 금액 `500 → 400`, RETEST PASS |
| Session Security | Stored XSS와 토큰 접근, CSP 부재 | UI·Burp XSS 입력, sink 검색, CSP 실행 테스트 | meta 기반 최소 CSP 적용 | XSS 미실행, 인라인·외부 스크립트 차단 |
| PWA Cache | 인증·개인 금융 응답의 오프라인 잔존 | 서비스워커 코드, Cache Storage, Offline 모드 확인 | 기존 안전한 구조 유지 | API·인증 JSON 캐시 없음, PASS |

## 4. Case 1 — Burp Suite API 보안 검증

### 문제

UI에서 제한된 값도 HTTP 요청을 직접 수정하면 우회할 수 있다. 서버가 인증과 데이터 유효성을 독립적으로 검증하는지 확인할 필요가 있었다.

### 공격

- `GET /expenses/recent`의 Authorization 헤더 제거
- `POST /expenses`의 금액·통화·날짜·카테고리 변조
- 초대형 금액 `999999999999999` 전송
- CSV Import 인증 제거와 계정 간 데이터 격리 확인

### 발견과 수정

일반적인 잘못된 값은 400으로 차단됐고 인증 제거 요청은 401로 차단됐다. 다만 초대형 금액은 DB 숫자 범위 초과로 500을 발생시켰다. 서버 요청 모델에 금액 범위와 자릿수 검증을 추가했다.

### 재검증

같은 초대형 금액을 다시 전송한 결과 500이 아닌 400으로 차단됐다.

**FOUND → FIXED → RETEST PASS**

## 5. Case 2 — Session Security와 CSP

### 문제

토큰이 JavaScript 접근 가능한 `sessionStorage`에 저장되므로, XSS가 발생할 경우 인증정보에 영향을 줄 수 있다. 또한 HTML 문서에 CSP가 없었다.

### 공격

- 상호명·메모에 HTML 및 이벤트 핸들러 payload 저장
- Burp로 UI 검증을 우회한 동일 payload 전송
- 위험한 HTML/JavaScript sink 전수 검색
- 인라인 및 미허용 외부 스크립트 동적 삽입

### 결과와 개선

확인한 모든 출력 화면에서 payload는 문자열로 표시됐고 JavaScript는 실행되지 않았다. 사용자 입력을 HTML로 직접 삽입하는 sink도 발견되지 않았다. 방어 심층화를 위해 외부 리소스 사용처를 조사하고 meta 기반 CSP를 적용했다.

### 재검증

- 인라인 스크립트: CSP로 차단
- 미허용 외부 스크립트: CSP로 차단
- 주요 화면: 정상 동작
- Vitest: `135/135` 통과
- ESLint, TypeScript, Production build: 통과

**CSP 부재 FOUND → FIXED → RETEST PASS**

## 6. Case 3 — PWA Cache Security

### 문제

오프라인 기능을 위해 서비스워커를 사용할 때 인증 응답이나 지출·리포트 데이터까지 저장하면 공유 기기에서 민감정보가 잔존할 수 있다.

### 검증

- `public/sw.js`의 요청 분기 분석
- Cache Storage에서 `/api`, `/auth` 검색
- 캐시된 AuthPanelShell JS/CSS 본문 확인
- Offline 상태에서 앱 셸과 API 데이터 동작 비교

### 결과

정적 JS·CSS·이미지·폰트만 캐시됐고 `/api`, `/auth`, GET 이외 요청은 서비스워커가 처리하지 않았다. `/auth` 검색 결과는 인증 응답이 아닌 AuthPanelShell 정적 번들이었다. 오프라인에서는 UI만 표시되고 개인 금융 데이터는 불러오지 못했다.

**PASS — 수정 없이 기존 캐시 설계의 안전성을 확인했다.**

## 7. Evidence Map

보안상 원본 화면 캡처는 저장소에 게시하지 않고 각 상세 문서에 텍스트 증적으로 옮겼다. 요청의 인증 토큰만 `[REDACTED]` 처리하고 테스트 입력값, HTTP 상태, 응답 코드와 검증 결과는 유지했다.

| 텍스트 증적 | 확인 결과 | 상세 문서 |
|---|---|---|
| 인증 헤더 제거 요청과 응답 | `401 Unauthorized` | `02_BURP_API_SECURITY_TEST.md` |
| 잘못된 카테고리·날짜 요청과 응답 | `400 INVALID_REQUEST` | `02_BURP_API_SECURITY_TEST.md` |
| 초대형 금액 수정 전·후 응답 | `500 → 400` | `02_BURP_API_SECURITY_TEST.md` |
| CSP 인라인 스크립트 실행 시도 | 정책 위반으로 차단 | `03_SESSION_SECURITY.md` |
| Cache Storage `/api` 검색 | 결과 0건 | `04_PWA_CACHE_SECURITY.md` |
| Cache Storage `/auth` 검색 | 정적 JS/CSS 2건 | `04_PWA_CACHE_SECURITY.md` |

## 8. 한계와 후속 과제

### HttpOnly Cookie 전환

`sessionStorage` 토큰을 HttpOnly Cookie로 이전하는 작업은 프론트엔드 단독 변경으로 끝나지 않는다. 다음 사항을 백엔드 계약과 함께 설계해야 한다.

- `HttpOnly`, `Secure`, `SameSite` 속성
- CSRF 방어
- Access/Refresh Token 수명과 회전
- 탈취·재사용 탐지 및 로그아웃 처리

따라서 이번 범위에서는 잠재 위험을 분석하고 XSS 방어를 강화했으며, 쿠키 전환은 장기 과제로 남겼다.

### CSP 적용 수준

현재 CSP는 서버 헤더가 아니라 `index.html`의 meta 태그로 적용한 1차 단계다. 서버 설정 권한이 확보되면 응답 헤더 기반 CSP와 Report-Only 운영, nonce/hash 기반 스타일·스크립트 정책을 검토할 수 있다.

### 테스트 범위

이번 결과는 수행한 엔드포인트와 화면 경로에 한정된다. 향후 신규 API·HTML 렌더링·서비스워커 캐시 규칙이 추가되면 동일 시나리오를 회귀 테스트해야 한다.

## 9. 최종 결론

이 프로젝트에서는 취약점이 없다고 선언하는 대신, 현실적인 공격 요청을 직접 만들고 방어가 어디에서 작동하는지 확인했다. 인증 제거와 일반 요청 변조는 서버에서 차단됐고, 실제로 발견된 수치 범위 문제는 수정 후 동일 요청으로 해결을 입증했다. Stored XSS는 재현되지 않았지만 토큰 저장 구조의 잠재 영향을 분석하고 CSP의 실행 차단 효과를 검증했다. PWA는 개인 데이터가 아닌 정적 앱 셸만 캐시한다는 사실을 코드·저장소·오프라인 동작으로 교차 확인했다.
