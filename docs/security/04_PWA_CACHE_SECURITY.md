# PWA Cache Security 검증

## 1. 목적

PWA 오프라인 기능이 개인 금융 데이터나 인증 응답을 Cache Storage에 남기지 않는지 확인했다. 코드 분석, 실제 Cache Storage 점검, 오프라인 동작 재현의 세 단계로 검증했다.

## 2. 서비스워커 구조 분석

Uniconvert는 Workbox나 `vite-plugin-pwa`를 사용하지 않고 `public/sw.js`를 직접 구현한다.

| 요청 유형 | 처리 방식 | 캐시 여부 |
|---|---|---|
| JS, CSS, 이미지, 폰트, manifest | 사전 캐시 및 Cache First | 캐시함 |
| 페이지 이동 | Network First, 실패 시 `/index.html` | 앱 셸만 fallback |
| `/api`, `/auth` | 서비스워커가 `respondWith()`하지 않음 | 캐시하지 않음 |
| GET 이외 요청 | 서비스워커가 개입하지 않음 | 캐시하지 않음 |
| 다른 출처 요청 | 서비스워커가 개입하지 않음 | 캐시하지 않음 |

`/api`와 `/auth`는 Workbox의 명시적인 `NetworkOnly` 객체를 사용하는 것은 아니지만, 서비스워커가 요청을 가로채지 않으므로 실질적으로 네트워크 전용으로 동작한다.

## 3. Cache Storage 실측

### `/api` 검색

DevTools의 Cache Storage에서 `/api`를 검색했을 때 항목이 없었다.

```text
검색 Origin: https://uniconvert.dev
검색어: /api
검색 결과: 0건
```

### `/auth` 검색

`/auth` 검색 결과 다음 두 항목만 확인됐다.

```text
/assets/AuthPanelShell-FQgVXtKP.js
/assets/AuthPanelShell-YOwaNqdf.css
```

```text
AuthPanelShell-FQgVXtKP.js   Content-Type: text/javascript   816 bytes
AuthPanelShell-YOwaNqdf.css  Content-Type: text/css          710 bytes
```

두 파일의 본문을 확인한 결과 각각 React 컴포넌트용 JavaScript와 CSS 코드였다.

- JSON 응답 없음
- `JSON.parse` 또는 `JSON.stringify` 사용 없음
- Access Token 또는 Refresh Token 없음
- 사용자 프로필·지출·리포트 데이터 없음

파일명에 `Auth`가 포함돼 있을 뿐 인증 API 응답이 아니라 로그인 화면을 구성하는 정적 번들이다.

## 4. 오프라인 검증

### 재현 방법

1. 앱을 정상적으로 실행하고 주요 화면을 방문한다.
2. DevTools Network 상태를 `Offline`으로 변경한다.
3. 페이지를 새로고침한다.
4. 앱 셸과 API 기반 데이터 화면의 동작을 비교한다.

### 결과

- HTML·JS·CSS 기반 앱 셸은 정상 표시됨
- 지출·리포트 등 API 데이터가 필요한 화면은 로딩 실패
- 저장된 개인 금융 응답이 오프라인에서 복원되지 않음

### 판정

**PASS** — 오프라인 UI 제공과 민감 데이터 비캐싱이 분리돼 있다.

## 5. 공격 시나리오별 판단

| 시나리오 | 확인 내용 | 결과 |
|---|---|---|
| 공유 기기에서 이전 사용자의 지출 응답 조회 | Cache Storage에 API 응답 존재 여부 | 없음 |
| 인증 응답 또는 토큰 잔존 | `/auth` 검색 및 파일 본문 확인 | 정적 JS/CSS만 존재 |
| 오프라인에서 개인 리포트 복구 | 네트워크 차단 후 화면 확인 | 데이터 로딩 실패 |
| 서비스워커가 POST 응답 저장 | GET 이외 처리 분기 확인 | 개입하지 않음 |

## 6. 결과

별도 수정 없이 기존 구조가 설계 의도대로 동작했다.

```text
정적 앱 셸          → 캐시됨 ✅
API·인증 응답       → 캐시되지 않음 ✅
Access/Refresh Token → Cache Storage에 없음 ✅
개인 금융 데이터     → 오프라인 복원되지 않음 ✅
```

**최종 판정: PASS**

서비스워커 수정 시에는 `/api`, `/auth`, 다른 출처, GET 이외 요청의 제외 정책을 자동 또는 수동 회귀검증해야 한다.
