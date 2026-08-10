# Uniconvert 성능 최적화 & 협업 가이드

> 상태: Draft  
> 최종 수정: 2026-07-16  
> 대상: Uniconvert Web Frontend  
> 목적: 성능 개선 기준을 통일하고, 개선 결과를 PR과 측정값으로 증명한다.

---

## 1. 문서 목적

이 문서는 Uniconvert 프론트엔드의 중복 API 요청, 불필요한 렌더링, 초기 번들 크기를 줄이고 팀원이 동일한 구조로 기능을 추가할 수 있도록 기준을 정의한다.

최적화는 라이브러리나 Hook을 많이 사용하는 것이 아니라 아래 네 가지 질문에 답할 수 있어야 한다.

1. 어떤 문제가 있었는가?
2. 왜 이 방법을 선택했는가?
3. 변경 전후에 무엇이 달라졌는가?
4. 다른 팀원이 같은 결과를 어떻게 검증하는가?

---

## 2. 평가 기준 연결

| 평가 항목 | 문서에서 남길 증거 |
|---|---|
| 중복 요청 방지·캐싱 | Network 요청 횟수, Query 설정, 변경 전후 표 |
| 렌더링 최적화 | React Profiler 결과, `useMemo`·`memo` 적용 근거 |
| 전역 상태 관리 | 전역/서버/지역 상태 분류표와 선택 이유 |
| 반복 API 코드 분리 | 공통 Hook 구조 및 사용 예시 |
| 협업·버전 관리 | Issue, 기능 브랜치, PR, 구체적인 리뷰 기록 |

---

## 3. 현재 구조와 개선 대상

### 3.1 현재 잘된 점

- 페이지가 Mock JSON을 직접 읽지 않고 `src/api` 계층을 사용한다.
- `api`, `mocks`, `types`, `pages`, `components`가 역할별로 분리되어 있다.
- 지출 Mock CRUD는 `localStorage`에 저장되어 생성·조회·수정·삭제 흐름을 검증할 수 있다.
- 로딩·실패 상태가 일부 페이지에 구현되어 있다.
- 공통 Button, TextField, FileUploadModal과 스타일 토큰이 존재한다.

### 3.2 우선 개선 대상

| 문제 | 사용자/개발 영향 | 개선 방향 | 우선순위 |
|---|---|---|---|
| 페이지마다 `useEffect + loading + error` 반복 | 코드 중복, 에러 처리 불일치 | Query Hook 또는 공통 데이터 Hook | P0 |
| Mock 응답과 백엔드 예상 응답 구조 불일치 | 실제 API 전환 시 `undefined` 위험 | Swagger 기준 응답 Adapter | P0 |
| `/report` 데이터가 컴포넌트 상수 | API 전환 및 테스트 어려움 | `types → mocks → api → hook` 분리 | P0 |
| API 캐시·중복 요청 방지 없음 | 재방문 시 불필요한 요청 | TanStack Query 또는 요청 캐시 | P1 |
| 모든 페이지가 초기 번들에 포함 | 첫 화면 로딩 비용 증가 | Route Lazy Loading | P1 |
| 사용자 정보가 여러 위치에서 개별 관리 | Header·Settings 동기화 어려움 | AuthContext | P1 |
| 성능 측정 기록 없음 | 개선 효과를 증명할 수 없음 | Lighthouse·Profiler·Network 기록 | P1 |

---

## 4. 상태 관리 기준

상태는 소유권과 수명에 따라 나눈다.

| 상태 종류 | 예시 | 권장 관리 위치 |
|---|---|---|
| 서버 상태 | 지출 목록, Pots, 리포트 | TanStack Query 또는 API Hook |
| 전역 클라이언트 상태 | 로그인 사용자, 인증 여부, 기본 통화 | AuthContext/UserContext |
| 페이지 지역 상태 | 모달 열림, 탭, 입력 폼 | 해당 페이지 `useState` |
| 파생 상태 | 카테고리 합계, 환산 금액 | 계산식 또는 필요 시 `useMemo` |

### 적용 원칙

- 여러 화면에서 공유되지 않는 상태를 전역에 올리지 않는다.
- 서버에서 온 데이터는 Context에 복사하지 않고 Query 캐시에서 관리한다.
- 계산 가능한 값을 별도의 state로 중복 저장하지 않는다.
- 로그인 사용자 정보 변경은 Header와 Settings에 즉시 반영되어야 한다.

---

## 5. API 요청·캐시 전략

### 5.1 기본 규칙

- 페이지 컴포넌트에서 직접 `fetch()`하지 않는다.
- 페이지에서 Mock JSON을 직접 import하지 않는다.
- API 요청은 `src/api`, 응답 타입은 `src/types`에 둔다.
- 화면은 `data`, `isLoading`, `error`, `refetch` 형태로 사용한다.
- Loading, Error, Empty, Success 네 상태를 모두 구현한다.
- Mutation 성공 후 영향을 받는 Query만 무효화한다.

### 5.2 기능별 권장 정책

| 데이터 | Query Key 예시 | 권장 정책 | 갱신 시점 |
|---|---|---|---|
| 사용자 프로필 | `['user', 'me']` | 세션 동안 공유 | 프로필 저장 성공 |
| 지출 목록 | `['expenses', yearMonth, range]` | 짧은 캐시 | 지출 CRUD 성공 |
| Pots | `['pots']` | 조회 캐시 | Pot 생성·수정·삭제 성공 |
| 월별 리포트 | `['report', yearMonth]` | 월 단위 캐시 | 지출 변경 또는 월 변경 |
| 통화 목록 | `['currencies']` | 장시간 캐시 | 서버 기준 변경 시 |
| 환율 | `['exchangeRates', base]` | 시간 제한 캐시 | 갱신 주기 도달 |

### 5.3 Query 사용 예시

```ts
export function useExpenseHistory(yearMonth: string, range: string) {
  return useQuery({
    queryKey: ['expenses', yearMonth, range],
    queryFn: () => getExpenseHistory(yearMonth, range),
    staleTime: 60_000,
  })
}
```

```ts
export function useCreateExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['report'] })
    },
  })
}
```

> TanStack Query 도입 전에는 동일한 반환 계약을 갖는 커스텀 Hook을 먼저 만들고, 이후 내부 구현만 교체한다.

---

## 6. 렌더링 최적화 기준

### `useMemo` 적용 후보

- 긴 지출 목록 필터링·정렬
- 카테고리별 합계 계산
- 월별 그래프 데이터 변환
- 동일 입력으로 반복되는 환율 환산 계산

### `useCallback` 적용 후보

- `memo`가 적용된 자식에게 이벤트 함수를 전달할 때
- 함수 참조 안정성이 실제로 필요한 Hook 의존성이 있을 때

### `React.memo` 적용 후보

- 지출 목록 Row
- 여러 개가 반복되는 PotCard
- 부모의 다른 상태 변화와 무관한 차트·카테고리 Item

### 적용하지 않는 기준

- 단순 문자열 출력처럼 렌더링 비용이 작은 컴포넌트
- props가 매번 새 객체로 변경되어 메모 효과가 없는 컴포넌트
- Profiler에서 병목이 확인되지 않은 작은 화면

최적화 Hook은 개수보다 적용 근거와 측정 결과를 PR에 남긴다.

---

## 7. 코드 분할

### 즉시 로드

- Router와 최상위 Provider
- 인증·대시보드 Layout
- Button, ErrorState, PageLoading 등 공통 UI

### Lazy Loading 후보

- OCR
- Report
- Settings
- Calculator
- Pots

```tsx
const ReportPage = lazy(() => import('@/pages/ReportPage/ReportPage'))

<Suspense fallback={<PageLoading />}>
  <AppRouter />
</Suspense>
```

라우트 전환 로딩 UI는 레이아웃 전체를 없애지 않고 콘텐츠 영역에 표시한다.

---

## 8. 성능 측정 및 기록

### 측정 도구

- Chrome DevTools Network: 요청 수, 전송 크기, 캐시 여부
- React DevTools Profiler: 렌더링 횟수와 소요 시간
- Lighthouse: Performance, Accessibility
- Vite Build 결과: 초기 JS/CSS 및 Chunk 크기

### 변경 전후 기록표

> 측정하지 않은 값은 추정해서 작성하지 않는다.

| 측정 항목 | 변경 전 | 변경 후 | 결과 | 측정 환경 |
|---|---:|---:|---:|---|
| 초기 JS 크기 | 측정 예정 | 측정 예정 | - | Production build |
| 리포트 재진입 요청 수 | 측정 예정 | 측정 예정 | - | Chrome Network |
| 지출 목록 렌더링 횟수 | 측정 예정 | 측정 예정 | - | React Profiler |
| Lighthouse Performance | 측정 예정 | 측정 예정 | - | Desktop/Mobile |

### 개선 기록 템플릿

```md
## 문제

## 원인

## 적용 내용

## 변경 전후 수치

## 검증 방법

## 관련 Issue / PR

## 남은 작업
```

---

## 9. 협업 구조

### 폴더 책임

```text
src/
├─ api/          API 요청 함수
├─ auth/         인증 세션·Provider
├─ components/   재사용 UI
├─ hooks/        재사용 상태·Query Hook
├─ layouts/      공통 화면 구조
├─ mocks/        실제 응답과 동일한 Mock
├─ pages/        라우트 단위 화면
├─ routes/       경로와 접근 제어
├─ styles/       전역 스타일과 토큰
├─ types/        API·도메인 타입
└─ utils/        순수 유틸리티 함수
```

### 기능 추가 순서

1. 기능명세·Swagger 확인
2. Request/Response 타입 정의
3. 실제 응답과 같은 Mock 작성
4. API 함수 작성
5. Query/Mutation Hook 작성
6. Loading/Error/Empty 상태 작성
7. 페이지 UI 연결
8. 테스트와 반응형 확인
9. 기능 단위 PR 작성

### 권장 파일 흐름

```text
src/types/report.ts
→ src/mocks/report.json
→ src/api/reports.ts
→ src/hooks/useReport.ts
→ src/pages/ReportPage/ReportPage.tsx
```

---

## 10. Git·PR·리뷰 규칙

### 브랜치

```text
main          배포 가능한 안정 버전
dev           개발 통합
feature/*     기능 개발
fix/*         버그 수정
refactor/*    구조 개선
```

### 성능 관련 커밋 예시

```text
refactor: 지출 조회 상태를 공통 훅으로 분리
perf: 지출 목록 캐싱 및 중복 요청 방지
perf: 라우트 단위 코드 스플리팅 적용
refactor: 인증 상태를 AuthContext로 통합
test: 지출 계산과 API 분기 테스트 추가
```

### PR 본문 필수 항목

- 문제와 재현 방법
- 선택한 해결책과 이유
- 변경 범위
- 성능 변경 전후 수치
- 테스트 방법과 결과
- 반응형·브라우저 확인 결과
- 후속 작업

### 리뷰 기준

- 페이지가 API나 Mock을 직접 참조하지 않는가?
- Query Key가 일관적인가?
- Mutation 후 필요한 캐시만 갱신하는가?
- Loading/Error/Empty 상태가 있는가?
- 불필요한 전역 상태와 메모이제이션이 없는가?
- 모바일과 키보드에서도 동작하는가?
- 환경변수나 개인정보가 포함되지 않았는가?

`LGTM`, `좋습니다`만 작성하지 않고 판단 근거 또는 확인한 동작을 남긴다.

---

## 11. 보안 및 환경변수

```gitignore
.env
.env.*
!.env.example
```

```env
# .env.example
VITE_API_BASE_URL=https://api.uniconvert.dev
VITE_GOOGLE_CLIENT_ID=
VITE_GOOGLE_AUTH_PATH=/auth/social/google
```

- 토큰, OAuth Secret, API Key는 커밋하지 않는다.
- 브라우저에 포함되는 `VITE_*` 값에는 서버 Secret을 넣지 않는다.
- 평가용 API 주소와 계정 제공 방법은 README에 별도로 작성한다.

---

## 12. 완료 체크리스트

- [ ] Swagger 응답 구조와 프론트 타입이 일치한다.
- [ ] 실제 API와 Mock이 동일한 반환 계약을 사용한다.
- [ ] 반복 API 로직이 Hook으로 분리되었다.
- [ ] 동일 요청 캐시와 중복 방지가 적용되었다.
- [ ] Mutation 후 관련 Query가 갱신된다.
- [ ] 주요 라우트가 Lazy Loading 된다.
- [ ] 로그인 사용자 상태가 전역에서 동기화된다.
- [ ] 변경 전후 성능 수치를 기록했다.
- [ ] 기능 단위 Issue·PR·리뷰가 연결되어 있다.
- [ ] 환경변수와 민감정보가 Git에서 제외되었다.

