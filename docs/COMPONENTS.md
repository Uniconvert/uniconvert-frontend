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
