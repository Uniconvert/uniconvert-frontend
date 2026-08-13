# Uniconvert

해외 지출을 기록하고 환율을 적용해 예산·카테고리·Pots를 관리하는 React 웹 애플리케이션입니다.

- 배포: https://uniconvert.dev
- API Swagger: https://api.uniconvert.dev/swagger-ui/index.html

## 주요 기능

- 이메일 및 Google 로그인
- 온보딩: 기준 통화, 현지 통화, 예산, 시간대, 프로필 설정
- 지출 입력·수정·삭제 및 CSV 업로드
- 지출 내역과 메모 모아보기(`/report/memos`)
- 월별·기간별 리포트와 이메일 리포트 발송
- Pots 생성·수정·보관·삭제 및 예산 배정
- 환율 계산기와 최근 계산 내역
- 한국어·영어·일본어·중국어 UI
- 로딩·빈 상태·API 오류·재시도 상태 표시

## 기술 스택

- React 19, TypeScript, Vite
- React Router 7
- TanStack Query
- Fetch API 기반 공통 API 클라이언트
- CSS Modules
- Vitest, ESLint

## 시작하기

```bash
git clone https://github.com/Uniconvert/uniconvert-frontend.git
cd uniconvert-frontend
npm install
copy .env.example .env.local
npm run dev
```

macOS/Linux에서는 `copy` 대신 `cp .env.example .env.local`을 사용합니다.

개발 서버: http://localhost:5173

`.env.local` 예시:

```env
VITE_API_BASE_URL=https://api.uniconvert.dev
VITE_GOOGLE_CLIENT_ID=your-google-client-id
VITE_GOOGLE_AUTH_PATH=/auth/social/google
```

## 검증 명령

```bash
npm run lint
npm run build
npm run test
npm run preview
```

## API 연동 원칙

- 모든 요청은 `src/api/client.ts`의 공통 클라이언트를 사용합니다.
- Access Token은 요청에 자동으로 포함되며 401 응답 시 토큰 재발급을 시도합니다.
- 서버 오류는 빈 상태와 구분해 화면에 표시하고 재시도할 수 있어야 합니다.
- 환율을 불러오지 못한 경우 임시 환율임을 화면에 명확히 표시합니다.
- 메모 조회는 Swagger의 `GET /expenses/memos` 응답(`data.memos.content`)을 기준으로 처리합니다.
- 리포트 화면은 `/reports/summary`, `/reports/categories`, `/reports/monthly` API를 사용하며 월별 summary를 불필요하게 반복 호출하지 않도록 캐시합니다.

## 주요 경로

| 화면 | 경로 |
| --- | --- |
| 지출 입력 | `/home` |
| 지출 내역 | `/home/expenses` |
| Pots | `/home/pots` |
| 리포트 | `/report` |
| 메모 모아보기 | `/report/memos` |
| 계산기 | `/calculator` |
| 설정 | `/settings` |
| OCR 업로드 | `/ocr` |

## 프로젝트 구조

```text
src/
├─ api/           API 요청과 응답 변환
├─ components/    공통·도메인 UI 컴포넌트
├─ hooks/         Query 및 화면 데이터 훅
├─ i18n/          언어 리소스와 번역 컨텍스트
├─ layouts/       인증·대시보드 레이아웃
├─ pages/         라우트별 화면
├─ routes/        라우팅과 접근 제어
├─ types/         API·화면 타입
└─ utils/         포맷·카테고리·오류 유틸리티
```
