# Session Storage 기반 인증 구조의 XSS 위협 분석과 CSP 적용

## 1. 목적

Uniconvert는 Access Token과 Refresh Token을 `sessionStorage`에 저장한다. 이 저장소는 동일 출처 JavaScript가 접근할 수 있으므로, XSS가 발생하면 인증 토큰이 영향을 받을 수 있다. 실제 토큰을 외부로 전송하지 않고 다음 연결 고리가 성립하는지 검증했다.

```text
사용자 입력
→ 서버 저장
→ 화면 재출력
→ JavaScript 실행 가능성
→ sessionStorage 접근 가능성
```

## 2. 토큰 저장 구조

DevTools Application 탭과 `Object.keys(sessionStorage)`를 사용해 다음 항목이 저장되는 구조임을 확인했다.

- Access Token
- Refresh Token
- 사용자 상태 데이터

### 위험

`sessionStorage` 사용 자체가 XSS 취약점은 아니다. 그러나 동일 출처에서 악성 JavaScript가 실행되면 저장된 토큰에 접근할 수 있으므로 XSS 발생 시 피해 범위가 커질 수 있다.

## 3. Stored XSS 테스트

### UI 입력 테스트

상호명과 메모에 다음 값을 입력했다.

```html
<b>SECURITY_TEST</b>
<img src=x onerror=alert(1)>
```

지출내역, 대시보드, 리포트, 메모 화면에서 값을 다시 확인했다.

### 결과

- `<b>` 태그가 굵은 글씨로 해석되지 않고 문자 그대로 출력됨
- 이미지 오류 이벤트의 `alert`가 실행되지 않음
- React의 기본 escaping이 유지됨

**PASS — 확인한 출력 경로에서 Stored XSS가 재현되지 않았다.**

### Burp를 통한 프론트엔드 검증 우회

UI 제약을 우회하기 위해 `POST /expenses`의 `merchantName`과 `memo`에 같은 payload를 직접 넣었다.

```json
{
  "originalAmount": 600,
  "originalCurrency": "JPY",
  "spentAt": "2026-08-21T08:11:31",
  "categoryId": 1,
  "merchantName": "<img src=x onerror=alert(1)>",
  "memo": "XSS_TEST"
}
```

서버는 문자열을 저장했지만 화면에서는 실행 가능한 HTML이 아니라 문자로 출력됐다. 서버가 HTML 문자열을 저장하는 것만으로 취약한 것은 아니며, 출력 시 실행 가능한 코드로 해석되는지가 핵심이다.

**PASS — 클라이언트 검증 우회 후에도 JavaScript 실행 없음.**

## 4. 코드 레벨 XSS Sink 검색

프로젝트 전체에서 다음 API를 검색했다.

```text
dangerouslySetInnerHTML
innerHTML
outerHTML
insertAdjacentHTML
document.write
eval(
new Function(
```

사용자 또는 API 입력을 실행 가능한 HTML로 직접 삽입하는 코드는 확인되지 않았다. 검색 문자열이 문서나 설명에 존재하는 경우는 실행 코드와 구분했다.

**PASS — 확인한 코드 범위에서 직접적인 XSS sink가 발견되지 않았다.**

## Finding WEB-01 — Content Security Policy 부재

### 문제

HTML 문서 응답에서 `Content-Security-Policy`가 확인되지 않았다.

### 공격 시나리오

향후 DOM 조작이나 서드파티 코드에서 XSS 결함이 유입될 경우, CSP가 없으면 브라우저 수준의 추가 제한 없이 인라인 또는 외부 스크립트가 실행될 수 있다.

### 위험

- XSS 결함 발생 시 공격 코드 실행 범위 확대
- 미허용 외부 Origin의 스크립트 로드 제한 부재
- `sessionStorage`의 인증 토큰에 대한 잠재적 접근

### 원인

운영 HTML 문서에 CSP 응답 헤더 또는 meta 정책이 적용되지 않았다. 프론트엔드 담당자는 Nginx/EC2 설정 권한이 없어 서버 응답 헤더를 직접 구성할 수 없었다.

## 5. CSP 설계 및 적용

외부 리소스 사용처를 조사한 뒤 `index.html`에 meta 기반 최소 허용 정책을 적용했다.

```text
default-src 'self';
script-src 'self' https://accounts.google.com;
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:;
font-src 'self';
connect-src 'self' https://api.uniconvert.dev https://accounts.google.com https://script.google.com https://script.googleusercontent.com;
frame-src https://accounts.google.com;
object-src 'none';
base-uri 'self';
```

### 허용 근거

| 지시문 | 허용 대상 | 근거 |
|---|---|---|
| `script-src` | 자체 번들, Google Identity | 앱 번들과 Google 로그인 |
| `style-src` | 자체 스타일, `'unsafe-inline'` | React 인라인 스타일 호환을 위한 1차 완화 |
| `img-src` | 자체, `data:`, `blob:` | 로컬 이미지와 브라우저 생성 이미지 |
| `connect-src` | 자체 API, Google, Apps Script | API·로그인·이메일 발송 흐름 |
| `frame-src` | Google Identity | Google 로그인 프레임 |
| `object-src` | 없음 | 플러그인 콘텐츠 차단 |

`style-src 'unsafe-inline'`은 호환성을 위한 의도적인 1차 적용이다. 추후 서버 권한과 배포 구조가 준비되면 nonce 또는 hash 기반 정책으로 강화할 수 있다.

## 6. 재검증

### 기능 회귀

- 지출내역, 리포트, Pots, 메모, 계산기, 설정 화면 정상 동작
- CSP 관련 콘솔 오류 0건
- ESLint, TypeScript, Production build 통과
- Vitest `135/135` 통과

### CSP 실효성

인라인 스크립트 삽입을 시도했을 때 브라우저가 `script-src` 정책 위반으로 실행을 거부했다.

```javascript
const script = document.createElement('script')
script.innerHTML = 'alert("XSS_TEST")'
document.body.appendChild(script)
```

브라우저 확인 결과:

```text
Executing inline script violates the following Content Security Policy
directive: "script-src 'self' https://accounts.google.com".
The action has been blocked.
```

미허용 외부 스크립트 `https://evil.example.com/malicious.js` 로드도 차단됨을 확인했다.

Google 로그인에서 확인된 `origin not allowed`와 COOP `postMessage` 경고는 로컬 OAuth Origin 미등록 및 COOP 설정 문제이며 CSP 위반과 구분했다.

## 7. 결과

**FOUND → FIXED → RETEST PASS**

- Stored XSS: 재현되지 않음
- 위험 sink: 발견되지 않음
- CSP 부재: 발견 및 meta 정책 적용
- 인라인·미허용 외부 스크립트: 차단 확인
- 기존 기능: 회귀 없음

## 8. 장기 개선

`HttpOnly`, `Secure`, 적절한 `SameSite` 속성을 가진 쿠키 기반 인증은 백엔드 계약, CSRF 정책, Refresh Token 회전 정책과 함께 설계해야 한다. 현재 프론트엔드 단독 변경 범위를 넘어서는 장기 과제로 관리한다.
