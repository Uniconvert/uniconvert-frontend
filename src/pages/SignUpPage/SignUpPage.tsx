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
import { useI18n } from '@/i18n/I18nContext'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function SignUpPage() {
  const { t } = useI18n()
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
      setStatusMessage(t('signup.checkInput'))
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

        <h1 id="signup-title">{t('signup.title')}</h1>
        <p className={styles.description}>{t('signup.description')}</p>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.fields}>
            <TextField
              label={t('signup.email')}
              type="email"
              name="email"
              value={email}
              placeholder={t('signup.email')}
              leadingIconSrc="/assets/icons/email.png"
              autoComplete="email"
              required
              errorMessage={email.length > 0 && !isEmailValid ? t('signup.invalidEmail') : undefined}
              onChange={(event) => { setEmail(event.target.value); setStatusMessage('') }}
            />
            <TextField
              label={t('signup.password')}
              type="password"
              name="password"
              value={password}
              placeholder={t('signup.passwordPlaceholder')}
              leadingIconSrc="/assets/icons/password.png"
              autoComplete="new-password"
              required
              errorMessage={password.length > 0 && !isPasswordValid ? t('signup.invalidPassword') : undefined}
              onChange={(event) => { setPassword(event.target.value); setStatusMessage('') }}
            />
            <TextField
              className={styles.passwordConfirmField}
              label={t('signup.passwordConfirm')}
              type="password"
              name="passwordConfirm"
              value={passwordConfirm}
              placeholder={t('signup.passwordConfirmPlaceholder')}
              leadingIconSrc="/assets/icons/password.png"
              autoComplete="new-password"
              required
              errorMessage={passwordConfirm.length > 0 && !isPasswordConfirmed ? t('signup.passwordMismatch') : undefined}
              onChange={(event) => { setPasswordConfirm(event.target.value); setStatusMessage('') }}
            />
          </div>

          <Button type="submit" fullWidth disabled={!canSubmit || isLoading} isLoading={isLoading}>{t('signup.submit')}</Button>
          <div className={styles.divider}><span>{t('signup.or')}</span></div>
          <GoogleLoginButton fullWidth onClick={handleGoogleSignup}>{t('signup.google')}</GoogleLoginButton>

          {statusMessage && <p className={styles.status} role="status" aria-live="polite">{statusMessage}</p>}
        </form>

        <p className={styles.loginPrompt}>{t('signup.haveAccount')} <Link to={ROUTE_PATHS.login}>{t('signup.login')}</Link></p>
      </div>
    </section>
  )
}

export default SignUpPage
