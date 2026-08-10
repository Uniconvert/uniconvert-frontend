import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { signUp } from '@/api/auth'
import Button from '@/components/common/Button/Button'
import GoogleLoginButton from '@/components/common/GoogleLoginButton/GoogleLoginButton'
import TextField from '@/components/common/TextField/TextField'
import Toast from '@/components/common/Toast/Toast'
import { useToastQueue } from '@/components/common/Toast/useToastQueue'
import { ROUTE_PATHS } from '@/routes/routePaths'
import { getApiErrorNotice } from '@/utils/apiError'
import styles from './SignUpPage.module.css'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function SignUpPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { toast, showToast, closeToast } = useToastQueue()

  const normalizedEmail = email.trim().toLowerCase()
  const isEmailValid = EMAIL_PATTERN.test(normalizedEmail)
  const isPasswordValid = password.length >= 8 && password.length <= 100
  const isPasswordConfirmed = password === passwordConfirm
  const canSubmit = isEmailValid && isPasswordValid && isPasswordConfirmed

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!canSubmit || isLoading) {
      setStatusMessage('입력 내용을 다시 확인해 주세요.')
      return
    }

    setIsLoading(true)
    setStatusMessage('')

    try {
      await signUp({
        email: normalizedEmail,
        password,
      })
      navigate(ROUTE_PATHS.onboardingBaseCurrency)
    } catch (error) {
      showToast({
        variant: 'error',
        ...getApiErrorNotice(error, '회원가입에 실패했습니다.'),
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignup = () => {
    setStatusMessage('Google 회원가입은 백엔드 OAuth 연동 후 제공됩니다.')
  }

  return (
    <section className={styles.page} aria-labelledby="signup-title">
      {toast && <Toast key={toast.id} {...toast} onClose={closeToast} />}
      <img className={styles.coinDecoration} src="/assets/icons/login_coin.png" alt="" aria-hidden="true" />
      <img className={styles.exchangeDecoration} src="/assets/icons/login_exchange.png" alt="" aria-hidden="true" />

      <div className={styles.card}>
        <div className={styles.brand} role="img" aria-label="Uniconvert">
          <span className={styles.logoMarkFrame} aria-hidden="true">
            <img className={styles.logoMarkSource} src="/assets/brand/uniconvert-logo-stacked.png" alt="" />
          </span>
          <img className={styles.wordmark} src="/assets/brand/uniconvert-wordmark.png" alt="" aria-hidden="true" />
        </div>

        <h1 id="signup-title">회원가입</h1>
        <p className={styles.description}>계정에 사용할 이메일과 비밀번호를 입력해 주세요.</p>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.fields}>
            <TextField
              label="이메일"
              type="email"
              name="email"
              value={email}
              placeholder="이메일"
              leadingIconSrc="/assets/icons/email.png"
              autoComplete="email"
              required
              errorMessage={email.length > 0 && !isEmailValid ? '올바른 이메일 형식을 입력해 주세요.' : undefined}
              onChange={(event) => { setEmail(event.target.value); setStatusMessage('') }}
            />
            <TextField
              label="비밀번호"
              type="password"
              name="password"
              value={password}
              placeholder="8자 이상 입력"
              leadingIconSrc="/assets/icons/password.png"
              autoComplete="new-password"
              required
              helperText="영문, 숫자 조합은 백엔드 정책 확정 후 적용됩니다."
              errorMessage={password.length > 0 && !isPasswordValid ? '비밀번호는 8자 이상 100자 이하여야 합니다.' : undefined}
              onChange={(event) => { setPassword(event.target.value); setStatusMessage('') }}
            />
            <TextField
              className={styles.passwordConfirmField}
              label="비밀번호 확인"
              type="password"
              name="passwordConfirm"
              value={passwordConfirm}
              placeholder="비밀번호 다시 입력"
              leadingIconSrc="/assets/icons/password.png"
              autoComplete="new-password"
              required
              errorMessage={passwordConfirm.length > 0 && !isPasswordConfirmed ? '비밀번호가 일치하지 않습니다.' : undefined}
              onChange={(event) => { setPasswordConfirm(event.target.value); setStatusMessage('') }}
            />
          </div>

          <Button type="submit" fullWidth disabled={!canSubmit || isLoading} isLoading={isLoading}>이메일로 회원가입</Button>
          <div className={styles.divider}><span>또는</span></div>
          <GoogleLoginButton fullWidth onClick={handleGoogleSignup}>Google 계정으로 회원가입</GoogleLoginButton>

          {statusMessage && <p className={styles.status} role="status" aria-live="polite">{statusMessage}</p>}
        </form>

        <p className={styles.loginPrompt}>이미 계정이 있나요? <Link to={ROUTE_PATHS.login}>로그인</Link></p>
      </div>
    </section>
  )
}

export default SignUpPage
