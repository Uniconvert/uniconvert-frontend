# 공통 컴포넌트 사용법

공통 컴포넌트는 전역 `index.ts`를 거치지 않고 실제 파일에서 가져옵니다.

## Button

```tsx
import Button from '@/components/common/Button/Button'

<Button>다음</Button>
<Button variant="secondary">이전</Button>
<Button variant="outline">취소</Button>
<Button fullWidth isLoading>저장 중</Button>
```

- `variant`: `primary`, `secondary`, `outline`
- `fullWidth`: 부모 너비를 모두 사용한다.
- `isLoading`: 중복 클릭을 막고 로딩 표시를 보여준다.
- 기본 `type`은 폼 제출을 방지하기 위해 `button`이다. 제출 버튼은 `type="submit"`을 명시한다.

## TextField

```tsx
import TextField from '@/components/common/TextField/TextField'

<TextField
  label="이메일"
  type="email"
  name="email"
  placeholder="example@email.com"
  leadingIconSrc="/assets/icons/email.png"
  autoComplete="email"
  required
/>

<TextField
  label="비밀번호"
  type="password"
  name="password"
  leadingIconSrc="/assets/icons/password.png"
  errorMessage="비밀번호를 다시 확인해 주세요."
  autoComplete="current-password"
/>
```

- 모든 입력에는 접근성을 위해 `label`을 전달한다.
- 화면에 라벨을 표시하지 않는 디자인에서는 `visuallyHideLabel`을 사용한다.
- 오류가 있으면 `errorMessage`, 일반 안내는 `helperText`를 사용한다.
- 비밀번호 입력은 표시·숨김 버튼을 자동으로 제공한다.

## 비동기 상태 컴포넌트

서버 데이터를 사용하는 화면은 초기 로딩, 성공·빈 데이터, 오류, 재시도 상태를 구분합니다.

```tsx
import LoadingState from '@/components/common/LoadingState/LoadingState'
import EmptyState from '@/components/common/EmptyState/EmptyState'
import ErrorState from '@/components/common/ErrorState/ErrorState'
import Skeleton from '@/components/common/Skeleton/Skeleton'
```

- `LoadingState`: 초기 로딩에는 `panel`, 기존 데이터 유지 중인 재조회에는 `inline` 변형을 사용한다. `role="status"`, `aria-live`, `aria-busy`를 제공한다.
- `EmptyState`: API가 성공했지만 데이터가 없을 때 사용한다. 도메인별 제목·설명·선택적 액션은 페이지에서 전달한다.
- `ErrorState`: API 실패를 빈 상태와 구분해 표시한다. 재시도 가능한 경우에만 `onRetry`를 전달한다.
- `Skeleton`: 실제 콘텐츠 레이아웃을 유지할 필요가 있는 초기 로딩에 사용한다. `text`, `rect`, `circle` 변형을 제공한다.

화면에 이미 정상 데이터가 있으면 전체 화면을 `LoadingState`로 교체하지 않습니다. TanStack Query의 `placeholderData` 또는 기존 데이터 유지 정책을 우선하고, `isFetching`은 필요한 경우 작은 인라인 표시로만 노출합니다.

## 보안·외부 전송

- CSP는 `index.html`에서 허용된 API·Google 로그인·Google Apps Script origin만 사용한다.
- 이메일 리포트는 사용자의 명시적인 버튼 클릭에서만 전송하고, 토큰·비밀번호·API key·전체 저장소 데이터는 전송하지 않는다.
- 사용자 입력과 API 값은 HTML로 직접 주입하지 않으며 `dangerouslySetInnerHTML`, `innerHTML`, `eval` 사용을 추가하지 않는다.

## 검증

변경 전후에 다음을 실행한다.

```text
npm run lint
npm run test -- --run
npm run build
```

PR에는 변경 범위와 위 검증 결과를 함께 기록한다.
