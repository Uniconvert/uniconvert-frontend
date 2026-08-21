# Burp Suite 기반 API 요청 변조 및 인증 검증

## 1. 목적

프론트엔드 입력 제한을 신뢰하지 않고 실제 HTTP 요청을 가로채 인증 헤더와 요청 본문을 변경했다. 서버가 인증·입력값·사용자 소유권을 독립적으로 검증하는지 확인하고, 발견된 문제는 수정 후 같은 요청으로 재검증했다.

> 테스트는 본인 소유 계정과 허가된 운영 범위에서 진행했다. 캡처에 포함된 Bearer Token은 공개 문서에 게시하기 전에 반드시 폐기하고 마스킹해야 한다.

## 2. 테스트 절차

```text
정상 요청 캡처
→ Burp Repeater로 전송
→ 인증 헤더 또는 JSON 값 변경
→ 응답 코드와 본문 확인
→ 취약 여부 판정
→ 수정
→ 동일 요청 재전송
→ 차단 확인
```

## A. 인증 우회 테스트

### 문제

보호 API가 프론트엔드의 로그인 상태만 신뢰하면 공격자가 직접 요청을 만들어 다른 사용자의 데이터에 접근할 수 있다.

### 공격 시나리오

`GET /expenses/recent` 요청에서 `Authorization: Bearer ...` 헤더를 제거하고 재전송한다.

### 재현 방법

```http
GET /expenses/recent HTTP/1.1
Host: api.uniconvert.dev
Accept: application/json
Origin: https://uniconvert.dev
```

### 결과

- 정상 인증 요청: `200 OK`
- `Authorization` 제거 요청: `401 Unauthorized`
- 응답 코드: `UNAUTHORIZED`

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json;charset=UTF-8
Cache-Control: no-cache, no-store, max-age=0, must-revalidate
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY

{
  "success": false,
  "code": "UNAUTHORIZED",
  "message": "[캡처 인코딩으로 정확한 한글 판독 불가]",
  "data": null
}
```

### 판정

**PASS** — 서버가 보호 API에서 인증을 독립적으로 검증한다.

## B. 지출 생성 요청값 변조

### 테스트 대상

```http
POST /expenses HTTP/1.1
Host: api.uniconvert.dev
Content-Type: application/json
Authorization: Bearer [REDACTED]
```

### 일반 입력 검증

| 변조값 | 기대 결과 | 실제 결과 | 판정 |
|---|---:|---:|---|
| 음수 금액 `-600` | 400 | 400 | PASS |
| 금액 `0` | 400 | 400 | PASS |
| 통화 `INVALID` | 400 | 400 | PASS |
| 날짜 `abc` | 400 | 400 | PASS |
| 카테고리 `999999` | 400 | 400 | PASS |

존재하지 않는 카테고리 요청은 다음과 같이 `400 Bad Request`로 차단됐다.

```http
POST /expenses HTTP/1.1
Host: api.uniconvert.dev
Authorization: Bearer [REDACTED]
Content-Type: application/json

{
  "originalAmount": 600,
  "originalCurrency": "JPY",
  "spentAt": "abc",
  "categoryId": 999999
}
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "success": false,
  "code": "INVALID_REQUEST",
  "message": "[캡처 인코딩으로 정확한 한글 판독 불가]",
  "data": null
}
```

## Finding API-01 — 초대형 금액의 서버 내부 오류

### 문제

초대형 금액을 전송했을 때 유효성 검증 오류가 아닌 `500 Internal Server Error`가 발생했다.

### 공격 시나리오

공격자가 정상 UI 범위를 우회해 반복적으로 매우 큰 금액을 제출하면 환율 계산과 DB 저장 과정에서 예외를 유발할 수 있다.

### 재현 방법

```json
{
  "originalAmount": 999999999999999,
  "originalCurrency": "JPY",
  "spentAt": "2026-08-21T08:55:39",
  "categoryId": 1
}
```

### 위험

- 비정상 입력이 내부 예외와 500 응답으로 이어짐
- 반복 요청 시 API 안정성과 가용성 저하 가능
- 입력 오류와 서버 장애를 구분하기 어려워짐

### 원인

`ExpenseCreateRequest`에 `@NotNull`, `@Positive` 검증만 있고 상한 또는 자릿수 제한이 없었다. 환율 계산 후 `convertedAmountHome`이 DB `DECIMAL(19,4)` 범위를 초과했다.

### 수정

백엔드 요청 DTO에 허용 가능한 금액 범위와 자릿수 Validation을 추가해 DB 연산 전에 거부하도록 변경했다.

### 재검증

수정 전과 동일한 초대형 금액 요청을 Burp Repeater로 다시 전송했다.

- 수정 전: `500 Internal Server Error`
- 수정 후: `400 Bad Request`

수정 전 응답:

```http
HTTP/1.1 500 Internal Server Error
Content-Type: application/json

{
  "success": false,
  "code": "INTERNAL_SERVER_ERROR",
  "message": "[캡처 인코딩으로 정확한 한글 판독 불가]",
  "data": null
}
```

수정 후 응답:

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "success": false,
  "code": "INVALID_REQUEST",
  "message": "[제공된 검증 기록에 정확한 응답 문구 없음]",
  "data": null
}
```

### 결과

**FOUND → FIXED → RETEST PASS**

## C. CSV Import 인증 및 데이터 격리

### 인증 검증

`POST /expenses/import` 요청에서 인증 헤더를 제거했을 때 `401 Unauthorized`가 반환됐다.

### 사용자 데이터 격리

테스트 계정 A에서 생성한 데이터를 계정 B로 조회했을 때 A의 데이터가 노출되지 않았다.

### 응답 민감정보 확인

응답에서 다음 정보가 노출되지 않음을 확인했다.

- 원본 CSV 내용
- 서버 내부 파일 경로
- 불필요한 `fileId` 또는 `importId`

### 판정

**PASS** — CSV Import는 인증을 요구하며 테스트 범위에서 사용자 데이터가 분리돼 있었다.

## 3. 최종 결과

| 검증 항목 | 결과 |
|---|---|
| Authentication Bypass | PASS |
| Request Tampering | PASS |
| Numeric Range Validation | FOUND → FIXED → RETEST PASS |
| CSV Import Authentication | PASS |
| User Data Isolation | PASS |

## 4. 결론

서버는 인증 제거와 일반적인 요청값 변조를 정상적으로 차단했다. 초대형 금액에서만 입력 검증 누락으로 500이 재현됐고, 서버 측 범위 검증을 추가한 뒤 동일 요청이 400으로 바뀌는 것을 확인했다. 이 사례는 단순 설정 점검이 아니라 실제 공격 요청의 재현, 원인 분석, 수정, 재검증까지 완료한 보안 개선이다.
