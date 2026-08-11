import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { googleLogin, login } from '@/api/auth'
import AuthPanelShell from '@/components/auth/AuthPanelShell/AuthPanelShell'
import Button from '@/components/common/Button/Button'
import GoogleIdentityButton from '@/components/common/GoogleIdentityButton/GoogleIdentityButton'
import TextField from '@/components/common/TextField/TextField'
import Toast from '@/components/common/Toast/Toast'
import { useToastQueue } from '@/components/common/Toast/useToastQueue'
import { ROUTE_PATHS } from '@/routes/routePaths'
import { getApiErrorNotice } from '@/utils/apiError'
import styles from './LoginPage.module.css'
import { useI18n } from '@/i18n/I18nContext'

function LoginPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const { toast, showToast, closeToast } = useToastQueue()
  const googleClientId = String(import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '').trim()
  const canSubmit = email.trim().length > 0 && password.length > 0

  const navigateAfterLogin = (sessionUser: Awaited<ReturnType<typeof login>>) => {
    if (!sessionUser.isEmailVerified) {
      navigate(ROUTE_PATHS.verifyEmail)
    } else if (!sessionUser.isOnboardingCompleted) {
      navigate(ROUTE_PATHS.onboardingBaseCurrency)
    } else {
      navigate(ROUTE_PATHS.home)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit || isLoading) return

    setIsLoading(true)
    try {
      const sessionUser = await login({ email, password })

      navigateAfterLogin(sessionUser)
    } catch (error) {
      showToast({
        variant: 'error',
        ...getApiErrorNotice(error, '로그인에 실패했습니다.'),
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleCredential = async (credential: string) => {
    if (isGoogleLoading) return

    setIsGoogleLoading(true)
    try {
      const sessionUser = await googleLogin(credential)
      navigateAfterLogin(sessionUser)
    } catch (error) {
      showToast({
        variant: 'error',
        ...getApiErrorNotice(error, 'Google 로그인에 실패했습니다.'),
      })
    } finally {
      setIsGoogleLoading(false)
    }
  }

  return (
    <section className={styles.page} aria-labelledby="login-title">
      {toast && <Toast key={toast.id} {...toast} onClose={closeToast} />}
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

      <AuthPanelShell width="42.25rem" minHeight="48.875rem" className={styles.card}>
        <h1 id="login-title" className={styles.visuallyHidden}>
          Uniconvert {t('login.title')}
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
          {t('login.tagline')}
        </p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.fields}>
            <TextField
              label={t('signup.email')}
              type="email"
              name="email"
              value={email}
              placeholder={t('signup.email')}
              leadingIconSrc="/assets/icons/email.png"
              autoComplete="email"
              visuallyHideLabel
              required
              onChange={(event) => setEmail(event.target.value)}
            />
            <TextField
              label={t('signup.password')}
              type="password"
              name="password"
              value={password}
              placeholder={t('signup.password')}
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
            isLoading={isLoading}
          >
            {t('login.submit')}
          </Button>
          <GoogleIdentityButton
            clientId={googleClientId}
            disabled={isLoading || isGoogleLoading}
            onCredential={handleGoogleCredential}
            onError={(message) => showToast({ variant: 'error', title: message })}
          />
          <p className={styles.signUpPrompt}>
            {t('login.noAccount')}
            <Link className={styles.signUpLink} to={ROUTE_PATHS.signUp}>
              {t('login.signup')}
            </Link>
          </p>
        </form>
      </AuthPanelShell>
    </section>
  )
}

export default LoginPage
