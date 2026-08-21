# Uniconvert 프론트엔드 현황 보고서

## 1. 기준 정보

- 기준일: 2026-08-21
- 저장소: `Uniconvert/uniconvert-frontend`
- 최근 반영: PR [#34](https://github.com/Uniconvert/uniconvert-frontend/pull/34)
- PR #34 병합 커밋: `4358ba7`
- 기능 브랜치 기준 커밋: `2c703ba`
- PR #34 내용: CSP 적용, 계산기 최근 내역 긴 값 말줄임 및 전체 값 툴팁 제공
- 테스트용 CSV(`sample_japanese_student_expenses_2026-08-20.csv`)는 저장소 변경에 포함하지 않는다.

## 2. 종합 상태

**상태: READY WITH ISSUES**

프론트엔드 코드와 자동 검증은 정상이며, CSP와 계산기 긴 텍스트 처리까지 `main`에 반영되었다. 다만 실제 운영 전에는 브라우저/배포 환경 검증과 일부 데이터 무결성·백엔드 계약 확인이 남아 있다.

## 3. 기술 환경

| 항목 | 현재 버전/구성 |
| --- | --- |
| React | 19.2.7 |
| TypeScript | ~6.0.2 |
| Vite | 8.1.0 |
| React Router | 7.18.1 |
| TanStack Query | 5.101.4 |
| Vitest | 4.1.10 |
| ESLint | 10.5.0 |
| 스타일 | CSS Modules + `src/styles/tokens.css` |
| 신규 라이브러리 | 이번 반영에서 추가 없음 |

실행 스크립트는 `dev`, `build`, `lint`, `test`, `test:watch`, `preview`를 제공한다.

## 4. 현재 주요 라우트

| 영역 | 경로 |
| --- | --- |
| 랜딩 | `/` |
| 인증 | `/login`, `/signup`, `/verify-email` |
| 온보딩 | `/onboarding/base-currency`, `/onboarding/local-currencies`, `/onboarding/budget`, `/onboarding/timezone`, `/onboarding/profile` |
| 지출 | `/home`, `/home/expenses` |
| Pots | `/home/pots` |
| 리포트/메모 | `/report`, `/report/memos` |
| 계산기 | `/calculator` |
| 오프라인 계산기 | `/offline` |
| OCR | `/ocr` |
| 설정 | `/settings` |

주요 보호 라우트에는 인증·온보딩 가드와 공통 `RouteErrorFallback`이 연결되어 있다.

## 5. 최근 완료된 작업

- 환율 `loading/error/not-ready` 상태에서 지출 저장을 차단하고 submit handler에도 동일한 guard 적용
- 지출 내역 핵심 API 전체 실패를 Empty가 아닌 Error 상태로 구분
- 공통 Loading/Empty/Error/Skeleton 상태 및 Retry UX 적용
- Expense History range 전환 시 이전 데이터를 유지하는 background fetching UX 적용
- Dialog/Listbox 접근성 및 상태 UI 보강
- Report 차트 텍스트 접근성, 계산기 입력 label, 달력 키보드 이동 및 route 오류 복구 추가
- QHD 환경 Auth/Dashboard 배경·콘텐츠 폭 보정
- Expense History 전환 시 레이아웃 깜빡임 완화
- Pots 기준으로 FloatingMascot 위치를 통일하고 계산기·리포트·메모에 반영
- `/offline` 공개 오프라인 계산기와 PWA manifest/service worker 구성
- 설정 및 리포트의 수동 이메일 리포트 미리보기/전송 UI 정리
- `index.html`에 API·Google 로그인·Google Apps Script origin을 제한하는 CSP 적용
- 계산기 최근 계산 내역의 긴 금액·환산 결과를 한 줄 말줄임으로 표시하고 전체 값은 `title`로 제공

## 6. 이메일 리포트 현재 상태

- 사용자 버튼 클릭 시에만 전송한다.
- 현재 화면의 리포트 미리보기 PNG와 로그인 사용자 이메일·기간을 전송한다.
- Google Apps Script Web App URL은 `VITE_REPORT_MAIL_SCRIPT_URL` 환경변수로 주입한다.
- access token, refresh token, 비밀번호, API key, sessionStorage 전체 데이터는 전송하지 않는다.
- 전송 중 중복 클릭을 막고, 성공/실패 Toast를 표시한다.
- 실제 Gmail 수신과 inline 이미지 표시는 운영 계정으로 수동 QA가 필요하다.

## 7. PWA/오프라인 상태

- `public/manifest.webmanifest`와 `public/sw.js`가 존재한다.
- 앱 셸·정적 자산은 캐시하고 `/api`와 `/auth` 요청은 캐시하지 않는다.
- `/offline`은 최초 온라인 접속에서 확보한 환율 캐시를 사용해 네트워크 없이 계산한다.
- 오프라인 계산기에는 홈 이동과 온라인 재요청 흐름이 제공된다.
- 실제 설치 가능 여부, 아이콘 표시, 브라우저별 오프라인 재진입은 배포 환경에서 확인해야 한다.

## 8. 자동 검증 결과

| 검증 | 결과 |
| --- | --- |
| TypeScript | PASS, 오류 0개 |
| ESLint | PASS, 오류/경고 0개 |
| Vitest | PASS, 39개 파일 / 135개 테스트 |
| Production build | PASS |
| GitHub Actions PR 검사 | PASS |

핵심 회귀 범위에는 환율 저장 guard, 지출 내역 전체 실패 처리, API 매핑, 공통 상태 컴포넌트, 라우트 오류 복구, 오프라인 계산기, 접근성 계약이 포함되어 있다.

## 9. 보안 상태

- 상세 검증 결과는 `docs/security/`의 위협 모델·Burp API·세션/CSP·PWA 캐시·최종 보안 보고서에 정리되어 있다.
- 저장소에서 즉시 확인되는 Critical XSS, open redirect, 번들 내 private credential은 발견되지 않았다.
- 파일 업로드 오류 원문 노출은 공통 사용자 문구로 제한되도록 수정되었다.
- access/refresh token은 현재 `sessionStorage`에 저장된다. HttpOnly cookie 전환은 백엔드 인증 계약과 함께 검토해야 한다.
- CSP, HSTS, `frame-ancestors`, `Referrer-Policy`, `Permissions-Policy` 등은 배포 헤더 설정에서 적용·검증해야 한다.
- API의 인증, ownership, 권한, 업로드 파일 검증, 이메일 수신자 검증은 백엔드 책임이다.

## 10. 남은 이슈 및 운영 전 확인

### 코드/계약 확인 필요

1. 지출 생성 성공 후 budget 재조회 실패가 저장 실패로 오인되지 않는지 확인
2. 예산 query가 준비되기 전 기본 통화/예산값으로 지출 저장이 계산되지 않는지 확인
3. Report의 일부 의존성 실패가 유효한 0원 데이터처럼 보이지 않는지 확인
4. 온보딩 후속 단계 deep link의 prerequisite 정책 확정
5. 프로필·온보딩 순차 mutation 부분 실패 복구 UX 확정
6. 통화 목록 API 실패 시 fallback과 Error/Retry 정책 확정
7. 세션 토큰의 HttpOnly cookie 전환 가능성 검토

### 브라우저/배포 QA 필요

- 1366×768, 1440×900, 1920×1080, 2560×1440 실제 화면 확인
- 모바일 및 200% 확대에서 카드·차트·입력·focus ring 확인
- lazy chunk 실패 시 route fallback과 재진입 확인
- `/offline` 설치, 아이콘, 새로고침, 완전 오프라인 재진입 확인
- Google Apps Script를 통한 실제 Gmail 수신 및 PNG inline 표시 확인
- CSP 및 보안 응답 헤더가 실제 배포 응답에 포함되는지 확인

## 11. 다음 권장 단계

1. 위 브라우저/배포 QA를 수행해 시각적 회귀와 PWA·이메일 실사용 여부를 확인한다.
2. 데이터 무결성 이슈 1~3번에 대한 최소 회귀 테스트를 먼저 보강한다.
3. 백엔드와 인증 cookie, 이메일 수신자 검증, 보안 헤더 계약을 확정한다.
4. 운영 배포 후 모니터링과 실제 사용자 흐름을 점검한다.

현재 상태는 자동화된 코드 검증과 PR #34의 `main` 반영까지 완료된 상태이며, 운영 출시 전에는 위 수동 QA와 백엔드/배포 계약 확인이 필요하다.
