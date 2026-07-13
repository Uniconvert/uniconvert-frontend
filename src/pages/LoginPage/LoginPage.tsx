import { useState } from 'react'
import Button from '@/components/common/Button/Button'
import GoogleLoginButton from '@/components/common/GoogleLoginButton/GoogleLoginButton'
import TextField from '@/components/common/TextField/TextField'
import styles from './LoginPage.module.css'

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const canSubmit = email.trim().length > 0 && password.length > 0

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    // TODO: Swagger 수신 후 자체 로그인 API 요청으로 교체한다.
    setStatusMessage('로그인 API 연결 전입니다.')
  }

  const handleGoogleLogin = () => {
    // TODO: 백엔드 OAuth 지원 여부 확정 후 Google 로그인을 연결한다.
    setStatusMessage('구글 로그인은 백엔드 연동 후 제공됩니다.')
  }

  return (
    <section className={styles.page} aria-labelledby="login-title">
      <img
        className={styles.coinDecoration}
        src="/assets/icons/login_coin.png"
        alt=""
        aria-hidden="true"
      />
      <img
        className={styles.exchangeDecoration}
        src="/assets/icons/login_exchange.png"
        alt=""
        aria-hidden="true"
      />

      <div className={styles.card}>
        <h1 id="login-title" className={styles.visuallyHidden}>
          Uniconvert 로그인
        </h1>

        <div className={styles.brand} role="img" aria-label="Uniconvert">
          <span className={styles.logoMarkFrame} aria-hidden="true">
            <img
              className={styles.logoMarkSource}
              src="/assets/brand/uniconvert-logo-stacked.png"
              alt=""
            />
          </span>
          <img
            className={styles.wordmark}
            src="/assets/brand/uniconvert-wordmark.png"
            alt=""
            aria-hidden="true"
          />
        </div>
        <p className={styles.tagline}>
          해외 지출을 추적하고, 전환하고, 현명하게 관리하세요
        </p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.fields}>
            <TextField
              label="이메일"
              type="email"
              name="email"
              value={email}
              placeholder="이메일"
              leadingIconSrc="/assets/icons/email.png"
              autoComplete="email"
              visuallyHideLabel
              required
              onChange={(event) => setEmail(event.target.value)}
            />
            <TextField
              label="비밀번호"
              type="password"
              name="password"
              value={password}
              placeholder="비밀번호"
              leadingIconSrc="/assets/icons/password.png"
              autoComplete="current-password"
              visuallyHideLabel
              required
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <Button
            className={styles.submitButton}
            type="submit"
            fullWidth
            disabled={!canSubmit}
          >
            로그인
          </Button>
          <GoogleLoginButton fullWidth onClick={handleGoogleLogin} />

          {statusMessage && (
            <p className={styles.status} role="status" aria-live="polite">
              {statusMessage}
            </p>
          )}
        </form>
      </div>
    </section>
  )
}

export default LoginPage
