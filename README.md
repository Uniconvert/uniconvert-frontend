# Uniconvert FE

해외 생활 중 발생하는 현지 통화 지출을 기준 통화로 환산해 월 예산, 지출 내역, 목적별 예산(Pots), 환율 리포트를 관리하는 프론트엔드 프로젝트입니다.

현재 버전은 백엔드 API 연동 전 단계입니다. 주요 사용자 흐름과 화면을 구현했으며 인증, 지출, Pots, 이메일 리포트 데이터는 JSON과 `localStorage` 기반 Mock으로 동작합니다.

## 기술 스택

- React 19
- TypeScript 6
- Vite 8
- React Router 7
- CSS Modules
- ESLint

## 실행 방법

Node.js와 npm이 설치된 환경에서 실행합니다.

```bash
npm install
npm run dev
```

기본 개발 서버 주소는 `http://localhost:5173`입니다.

### 검증 명령

```bash
npm run lint
npm run build
npm run preview
```

## 테스트 계정

Mock 로그인 화면에서 다음 계정을 사용할 수 있습니다.

| 상태 | 이메일 | 비밀번호 | 로그인 후 이동 |
| --- | --- | --- | --- |
| 온보딩 완료 | `test@uniconvert.com` | `test1234` | 홈 |
| 온보딩 미완료 | `onboarding@uniconvert.com` | `test1234` | 기본 통화 설정 |
| 이메일 미인증 | `unverified@uniconvert.com` | `test1234` | 이메일 인증 |

`test@uniconvert.com` 계정은 닉네임 `hamster`와 테스트 프로필 이미지를 사용합니다.

## 구현된 화면과 경로

| 경로 | 화면 | 현재 상태 |
| --- | --- | --- |
| `/` | 랜딩 | UI 구현 |
| `/login` | 로그인 | Mock 인증 연동 |
| `/signup` | 회원가입 | 기본 화면 |
| `/signup/terms` | 약관 동의 | 필수 약관 검증 구현 |
| `/signup/verify-email` | 이메일 인증 | 기본 화면 |
| `/onboarding/base-currency` | 기준 통화 선택 | 선택 전 초기 상태 구현 |
| `/onboarding/local-currencies` | 현지 통화 선택 | 복수 선택 구현 |
| `/onboarding/budget` | 월 예산 설정 | 기준 통화별 입력 구현 |
| `/onboarding/profile` | 프로필 설정 | 입력 화면 구현 |
| `/home` | 지출 입력 | 추가 및 환산 미리보기 구현 |
| `/home/expenses` | 지출 내역 | 월별 합계·카테고리 통계 구현 |
| `/home/expenses/:expenseId` | 지출 상세 | 조회·수정·삭제 구현 |
| `/home/pots` | Pots | 목록 및 새 Pot 추가 구현 |
| `/report` | 리포트 | Mock 리포트 연동 |
| `/calculator` | 환율 계산기 | 기본 화면 |
| `/ocr` | 지출 파일 업로드 | 업로드 UI 구현, 실제 OCR 미연동 |
| `/settings` | 설정 | 로그인 사용자 프로필 및 이메일 리포트 UI 연동 |

## 주요 구현 범위

### 지출 관리

- 외화 또는 기준 통화로 지출 입력
- 통화, 금액, 날짜, 상점, 카테고리, 메모 저장
- 지출 목록과 상세 화면 연결
- 지출 수정 및 삭제
- 월 지출 합계, 남은 예산, 예산 사용률 자동 계산
- 카테고리별 지출 합계 자동 계산
- 새로고침 후에도 변경 사항 유지

### Pots

- JSON 초기 데이터 표시
- 새 Pot 생성
- 목적별 금액과 진행률 표시

### 인증과 설정

- 사용자 상태에 따른 로그인 후 이동 경로 분기
- 로그인 사용자 정보를 대시보드와 설정 화면에 반영
- 이메일 리포트 Mock 설정 표시

## Mock 데이터 동작 방식

Mock 데이터는 `src/mocks`에서 관리합니다.

```text
src/mocks
├── auth-users.json
├── email-report.json
├── expense-details.json
├── expense-history.json
├── expenseStore.ts
└── pots.json
```

지출 JSON은 최초 실행 데이터를 제공합니다. 사용자가 추가·수정·삭제한 지출은 브라우저 `localStorage`의 `uniconvert.mockExpenses.v1` 키에 저장됩니다. 따라서 JSON을 수정했는데 기존 브라우저 화면에 반영되지 않는 경우 해당 키를 삭제하고 새로고침해야 합니다.

Mock 데이터는 개발용이며 실제 사용자 데이터나 비밀번호를 추가하지 않습니다.

## 폴더 구조

```text
src
├── api          # API 호출 인터페이스와 Mock 전환 지점
├── auth         # 로그인 세션 관리
├── components   # 공통·도메인 컴포넌트
├── layouts      # 인증·대시보드 레이아웃
├── mocks        # 개발용 JSON과 Mock 저장소
├── pages        # 라우트 단위 화면
├── routes       # 라우터와 경로 상수
├── styles       # 전역 스타일과 디자인 토큰
├── types        # 도메인 타입
└── utils        # 공통 유틸리티
```

## 백엔드 연동 지점

화면에서 JSON을 직접 읽지 않고 `src/api`를 통해 데이터를 가져오도록 구성했습니다. 백엔드 API가 준비되면 다음 파일의 Mock 분기를 실제 요청으로 교체합니다.

- `src/api/auth.ts`
- `src/api/expenses.ts`
- `src/api/pots.ts`
- `src/api/emailReports.ts`
- `src/api/client.ts`

백엔드와 합의가 필요한 항목은 다음과 같습니다.

- 인증 토큰 전달·저장·재발급 방식
- 로그인 실패 코드와 사용자 메시지
- 환율 조회 시점과 적용 환율 정책
- 지출·Pots·리포트 API 요청 및 응답 형식
- 시간대 저장 여부와 날짜 경계 처리

## 협업 규칙

- `main`: 배포 가능한 안정 브랜치
- `dev`: 개발 통합 브랜치
- `feature/*`: 기능 개발 브랜치
- `fix/*`: 버그 수정 브랜치

기능 작업은 브랜치에서 진행하고 PR을 통해 `dev`에 병합합니다. 커밋은 `feat`, `fix`, `style`, `refactor`, `docs`, `chore`, `test` 타입을 사용합니다.

세부 프론트엔드 규칙은 [`docs/FRONTEND_CONVENTIONS.md`](docs/FRONTEND_CONVENTIONS.md), 컴포넌트 현황은 [`docs/COMPONENTS.md`](docs/COMPONENTS.md)를 참고합니다.

## 향후 작업

- 실제 백엔드 인증 및 도메인 API 연동
- 환율 API 연동과 기준 환율 정책 적용
- OCR 및 CSV 일괄 등록 기능
- 오프라인 환율 데이터 캐싱
- 반응형 모바일 내비게이션
- 자동화 테스트와 배포 환경 구성
