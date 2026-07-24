# Uniconvert

<p align="center">
  <img src="./public/assets/brand/uniconvert-logo-stacked.png" width="120" alt="Uniconvert 로고" />
</p>

<p align="center">
  해외 유학생을 위한 다중 통화 지출·예산 관리 서비스
</p>

## 📌 프로젝트 소개

**Uniconvert**는 모국 통화로 예산을 관리하면서 현지 통화로 생활하는 해외 유학생을 위한 가계부 서비스입니다.

현지 통화로 입력한 지출을 기준 통화로 환산하고, 월 예산과 카테고리별 소비 현황, 목적별 저축 공간인 Pots를 한 화면에서 관리할 수 있도록 구성했습니다.

### 해결하려는 문제

- 예산 통화와 실제 지출 통화가 달라 매번 환율을 계산해야 하는 불편
- 여러 통화로 발생한 지출을 하나의 기준으로 파악하기 어려운 문제
- 월 예산, 남은 금액, 카테고리별 소비를 한눈에 확인하기 어려운 문제
- 여행·학비·주거비 등 목적별로 예산을 분리해 관리하기 어려운 문제

### 주요 기능

| 기능 | 설명 | 현재 상태 |
| --- | --- | --- |
| 회원가입·로그인 | 이메일 기반 가입·로그인 및 Google 로그인 UI | Mock 인증 적용 |
| 온보딩 | 약관, 기준 통화, 현지 통화, 월 예산, 시간대, 프로필 설정 | 구현 완료 |
| 지출 입력 | 통화, 금액, 날짜, 상점, 카테고리, 메모 입력 | 구현 완료 |
| 지출 내역 | 월 지출, 남은 예산, 카테고리 통계, 기간별 합계 확인 | 구현 완료 |
| Pots | 목적별 Pot 생성, 수정, 삭제 및 금액 배정 | 구현 완료 |
| 리포트 | 월별 지출 추이와 소비 분석 | Mock 데이터 적용 |
| 환율 계산기 | 통화 간 환율 계산 | UI 구현 완료 |
| 설정 | 프로필 및 이메일 리포트 설정 | Mock 데이터 적용 |
| OCR 업로드 | 카드 내역 이미지 업로드 | UI 구현, 실제 OCR 연동 필요 |

## 👥 팀원 및 프론트엔드 역할 분담

| 팀원 | 담당 화면 및 기능 |
| --- | --- |
| [오레오](https://github.com/oreore051) | 프로젝트 초기 설정, 랜딩, 로그인·회원가입, 온보딩, 지출 입력, 지출 내역, Pots, OCR 업로드, 공통 레이아웃 및 Mock/API 연동 구조 |
| [김서현](https://github.com/seohyunnii) | 리포트, 설정, 환율 계산기, 공통 Button·TextField·GoogleLoginButton, 반응형 UI 개선 |

## 🛠 기술 스택

### Frontend

![React](https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript_6-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite_8-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router_7-CA4245?style=for-the-badge&logo=reactrouter&logoColor=white)
![CSS Modules](https://img.shields.io/badge/CSS_Modules-000000?style=for-the-badge&logo=cssmodules&logoColor=white)

### API·상태 관리

- 브라우저 Fetch API 기반 공통 API 요청 모듈
- React `useState`, `useEffect`, `useMemo`
- `sessionStorage`, `localStorage`
- Zustand 사용 안 함
- Context API 사용 안 함
- TanStack Query 사용 안 함

### CI·배포

![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)
![Amazon S3](https://img.shields.io/badge/Amazon_S3-569A31?style=for-the-badge&logo=amazons3&logoColor=white)
![CloudFront](https://img.shields.io/badge/AWS_CloudFront-8C4FFF?style=for-the-badge&logo=amazonwebservices&logoColor=white)

- PR 생성 시 ESLint 및 TypeScript/Vite 빌드 자동 검사
- `main` 반영 시 AWS S3 업로드 및 CloudFront 캐시 갱신

## 💾 데이터 및 상태 관리

### 상태 관리

| 구분 | 사용 여부 | 용도 |
| --- | --- | --- |
| `useState` | 사용 | 폼 입력, 선택값, 모달, 드롭다운, 조회 결과 |
| `useEffect` | 사용 | 화면 진입 및 조건 변경 시 데이터 조회 |
| `useMemo` | 일부 사용 | 선택 항목과 계산 결과 재사용 |
| Zustand | 사용 안 함 | 별도 전역 Store 없음 |
| Context API | 사용 안 함 | 별도 전역 Context 없음 |
| TanStack Query | 사용 안 함 | 서버 상태 캐싱·무효화 미적용 |
| `sessionStorage` | 사용 | 로그인 사용자, 토큰, 온보딩 임시 상태 |
| `localStorage` | 사용 | 사용자별 Mock 지출, Pots, 프로필 및 설정 |

현재는 페이지별 로컬 상태와 브라우저 저장소를 중심으로 관리합니다. 백엔드 연동 범위가 확대되면 서버 데이터 캐싱과 Mutation 관리를 위해 TanStack Query 도입을 검토할 수 있습니다.

### Mock Data 및 API 연동

- 기본 실행 모드는 Mock API입니다.
- `src/mocks`의 JSON은 데모 데이터와 최초 데이터로 사용합니다.
- 화면에서 추가·수정·삭제한 Mock 데이터는 사용자 ID별 `localStorage`에 저장합니다.
- 공통 API 클라이언트는 Access Token을 `Authorization: Bearer` 헤더에 자동 적용합니다.
- 환경변수로 Mock API와 실제 API를 전환할 수 있습니다.

```env
VITE_USE_MOCK_API=true
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

`VITE_USE_MOCK_API=false`로 설정하면 `VITE_API_BASE_URL`을 기준으로 실제 서버에 요청합니다. 요청 코드는 준비되어 있으나 백엔드 Swagger 명세와 실제 응답을 기준으로 최종 검증이 필요합니다.

### 주요 Mock 파일

| 파일 | 용도 |
| --- | --- |
| `auth-users.json` | 로그인 테스트 사용자 |
| `expense-details.json` | 지출 기본 데이터 |
| `expense-history.json` | 월 지출 및 카테고리 통계 |
| `saved-expenses.json` | 저장된 지출 |
| `pots.json` | Pots 기본 데이터 |
| `report.json` | 월간 리포트 |
| `email-report.json` | 이메일 리포트 미리보기 |

## 📁 폴더 구조

```text
src/
├── api/                    # 공통 API 클라이언트 및 도메인별 요청
├── assets/                 # 소스에서 import하는 정적 리소스
├── auth/                   # 로그인 세션 및 사용자 설정
├── components/
│   ├── common/             # Button, TextField, Modal 등 공통 컴포넌트
│   ├── onboarding/         # 온보딩 공통 컴포넌트
│   └── pots/               # Pots 관련 컴포넌트
├── constants/              # 공통 상수
├── data/                   # 화면용 데이터
├── hooks/                  # 커스텀 훅
├── layouts/
│   ├── AuthLayout/         # 인증·온보딩 레이아웃
│   └── DashboardLayout/    # 로그인 이후 공통 레이아웃
├── mocks/                  # Mock JSON 및 브라우저 저장소 처리
├── pages/                  # 라우트별 페이지
├── routes/                 # 라우터, 경로 상수, 접근 제어
├── services/               # 외부 서비스 처리
├── styles/                 # 전역 스타일과 디자인 토큰
├── types/                  # TypeScript 타입
└── utils/                  # 통화, 날짜, 시간대 등 공통 함수

public/
└── assets/                 # 브라우저에서 직접 사용하는 이미지·아이콘
```

### 설계 원칙

- 페이지·컴포넌트·API·타입의 역할 분리
- 페이지 전용 스타일은 CSS Modules 사용
- 라우트 문자열은 `routePaths.ts`에서 통합 관리
- 인증, 이메일 인증, 온보딩 완료 여부에 따른 Route Guard 적용
- Mock과 실제 API가 동일한 페이지 호출 구조를 사용하도록 분리

## 🖥 화면 목록 및 플로우

### 화면 목록

| 화면 | 경로 | 담당 | 주요 기능 |
| --- | --- | --- | --- |
| Landing | `/` | 오레오 | 서비스 소개 |
| Login | `/login` | 오레오 | 로그인 |
| SignUp | `/signup` | 오레오 | 이메일·Google 회원가입 |
| Terms | `/signup/terms` | 오레오 | 약관 동의 |
| VerifyEmail | `/verify-email` | 오레오 | 이메일 인증 안내 |
| BaseCurrency | `/onboarding/base-currency` | 오레오 | 기준 통화 선택 |
| LocalCurrencies | `/onboarding/local-currencies` | 오레오 | 현지 통화 선택 |
| BudgetSetup | `/onboarding/budget` | 오레오 | 월 예산 설정 |
| TimezoneSetup | `/onboarding/timezone` | 오레오 | 브라우저 시간대 감지·설정 |
| ProfileSetup | `/onboarding/profile` | 오레오 | 프로필 및 목표 설정 |
| ExpenseInput | `/home` | 오레오 | 지출 입력 |
| ExpenseHistory | `/home/expenses` | 오레오 | 지출·카테고리 통계 |
| Pots | `/home/pots` | 오레오 | 목적별 예산 관리 |
| Report | `/report` | 김서현 | 월별 지출 리포트 |
| Calculator | `/calculator` | 김서현 | 환율 계산 |
| OCR Upload | `/ocr` | 오레오 | 카드 내역 이미지 업로드 |
| Settings | `/settings` | 김서현 | 프로필·이메일 리포트 설정 |
| NotFound | `*` | 오레오 | 잘못된 경로 안내 |

### 기본 사용자 플로우

```text
랜딩
→ 로그인 또는 회원가입
→ 이메일 인증
→ 약관 동의
→ 기준 통화 선택
→ 현지 통화 선택
→ 월 예산 설정
→ 시간대 확인
→ 프로필 설정
→ 지출 입력 / 지출 내역 / Pots
→ 리포트·계산기·설정
```

## ▶️ 실행 방법

### 요구 환경

- Node.js 22 권장
- npm

### 설치 및 실행

```bash
git clone https://github.com/oreore051/Uniconvert-FE.git
cd Uniconvert-FE
npm install
copy .env.example .env
npm run dev
```

개발 서버 접속 주소:

```text
http://127.0.0.1:5173
```

실제 포트가 다르게 실행된 경우에는 터미널에 표시된 `Local` 주소로 접속합니다.

### 검사 및 빌드

```bash
npm run lint
npm run build
npm run preview
```

## 🌿 브랜치·커밋·PR 컨벤션

### Branch

작업 브랜치에서 기능을 구현한 뒤 `main`을 대상으로 Pull Request를 생성합니다.
`dev` 브랜치는 통합 검증이 필요한 경우에만 사용합니다.

| 브랜치 | 용도 |
| --- | --- |
| `main` | 배포 가능한 안정 버전 |
| `dev` | 개발 통합 브랜치 |
| `feature/기능명` | 기능 개발 |
| `fix/버그명` | 버그 수정 |
| `refactor/대상명` | 기능 변경 없는 구조 개선 |
| `docs/문서명` | 문서 수정 |

```text
feature/expense-history
fix/pots-modal-layout
refactor/css-tech-debt
docs/readme
```

### Commit

```text
type: message
```

| 타입 | 설명 |
| --- | --- |
| `feat` | 기능 추가 |
| `fix` | 버그 수정 |
| `refactor` | 기능 변경 없는 코드 개선 |
| `style` | UI·스타일 수정 |
| `docs` | 문서 수정 |
| `chore` | 설정, 파일 정리 |
| `ci` | CI·배포 설정 |
| `test` | 테스트 추가·수정 |

```text
feat: 지출 입력 기능 구현
fix: Pots 모달 레이아웃 수정
docs: README 구현 현황 업데이트
```

### Pull Request

- `feature/*`, `fix/*`, `refactor/*`, `docs/*` 등 작업 목적에 맞는 브랜치에서 작성
- `main`, `dev` 직접 Push 지양
- 작업 내용과 변경 이유, 영향 범위를 구체적으로 작성
- UI 변경이 있는 경우에만 스크린샷 첨부
- `npm run lint`, `npm run build`, `git diff --check` 통과 확인
- 미완료된 API 연동과 후속 작업을 별도로 명시
- 리뷰와 검증 완료 후 대상 브랜치에 병합

```md
## 작업 내용
- 구현하거나 수정한 내용을 기능 단위로 작성

## 변경 이유
- 작업이 필요한 배경과 해결하려는 문제 작성

## 영향
- 변경으로 달라지는 화면, 기능, 데이터 또는 경로 작성

## 검증
- [ ] `npm run lint` 통과
- [ ] `npm run build` 통과
- [ ] `git diff --check` 통과
- [ ] 주요 기능 동작 및 기존 기능 영향 확인

## 스크린샷
<!-- UI 변경이 있는 경우에만 첨부 -->

## 백엔드 연동 대기
<!-- Swagger, API 경로, 응답 구조 등 미확정 사항이 있는 경우 작성 -->

## 후속 작업
<!-- 이번 PR 범위에서 제외한 작업이 있는 경우 작성 -->
```

## 🔌 백엔드 협업 시 확인 사항

- Swagger 요청·응답 필드와 `src/types` 타입 대조
- 인증·회원가입·이메일 인증 API 연결
- 온보딩 설정 저장 API 연결
- 지출 및 Pots의 `localStorage` 저장을 서버 DB 요청으로 교체
- 환율 조회와 변환 정책 확정
- OCR 업로드 형식 및 결과 확인 API 확정
- API 오류 코드와 사용자 안내 문구 매핑
- 필요 시 TanStack Query 도입 및 Query Key 정책 수립

## 📍 현재 개발 상태

- 주요 화면 및 반응형 UI 구현
- 사용자별 Mock 데이터 저장 구조 구현
- 인증·온보딩 Route Guard 구현
- Mock/실제 API 환경변수 분기 구현
- GitHub Actions Lint·Build 검사 구현
- AWS S3·CloudFront 배포 워크플로 구현
- 실제 백엔드 API 통합 검증 진행 필요
- 실제 OCR 처리 연동 필요
