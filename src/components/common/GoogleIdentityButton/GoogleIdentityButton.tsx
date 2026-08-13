import { useEffect, useRef } from 'react'
import { useI18n } from '@/i18n/I18nContext'
import styles from './GoogleIdentityButton.module.css'

const GOOGLE_IDENTITY_SCRIPT_ID = 'google-identity-services'
const GOOGLE_IDENTITY_SCRIPT_URL = 'https://accounts.google.com/gsi/client'

interface GoogleCredentialResponse {
  credential?: string
}

interface GoogleIdentityServices {
  initialize: (options: {
    client_id: string
    callback: (response: GoogleCredentialResponse) => void
  }) => void
  renderButton: (
    parent: HTMLElement,
    options: {
      type: 'standard'
      theme: 'outline'
      size: 'large'
      text: 'signin_with' | 'continue_with' | 'signup_with' | 'signin'
      shape: 'rectangular'
      logo_alignment: 'left' | 'center'
      width?: string
      locale?: string
    },
  ) => void
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GoogleIdentityServices
      }
    }
  }
}

let googleScriptPromise: Promise<void> | null = null
function loadGoogleIdentityServices() {
  if (window.google?.accounts?.id) return Promise.resolve()
  if (googleScriptPromise) return googleScriptPromise

  googleScriptPromise = new Promise<void>((resolve, reject) => {
    const handleLoad = () => {
      if (window.google?.accounts?.id) {
        resolve()
        return
      }

      googleScriptPromise = null
      reject(new Error('Google 로그인 서비스를 초기화하지 못했습니다.'))
    }

    const handleError = () => {
      googleScriptPromise = null
      reject(new Error('Google 로그인 스크립트를 불러오지 못했습니다.'))
    }

    const existingScript = document.getElementById(
      GOOGLE_IDENTITY_SCRIPT_ID,
    ) as HTMLScriptElement | null

    if (existingScript) {
      existingScript.addEventListener('load', handleLoad, { once: true })
      existingScript.addEventListener('error', handleError, { once: true })
      return
    }

    const script = document.createElement('script')
    script.id = GOOGLE_IDENTITY_SCRIPT_ID
    script.src = GOOGLE_IDENTITY_SCRIPT_URL
    script.async = true
    script.defer = true
    script.addEventListener('load', handleLoad, { once: true })
    script.addEventListener('error', handleError, { once: true })
    document.head.appendChild(script)
  })

  return googleScriptPromise
}

interface GoogleIdentityButtonProps {
  clientId: string
  disabled?: boolean
  onCredential: (credential: string) => void
  onError: (message: string) => void
}

function GoogleIdentityButton({
  clientId,
  disabled = false,
  onCredential,
  onError,
}: GoogleIdentityButtonProps) {
  const { language, t } = useI18n()
  const buttonRef = useRef<HTMLDivElement>(null)
  const onCredentialRef = useRef(onCredential)
  const onErrorRef = useRef(onError)

  useEffect(() => {
    onCredentialRef.current = onCredential
    onErrorRef.current = onError
  }, [onCredential, onError])

  useEffect(() => {
    const container = buttonRef.current
    if (!container || !clientId) return

    let isCancelled = false

    loadGoogleIdentityServices()
      .then(() => {
        if (isCancelled || !buttonRef.current) return

        const googleIdentity = window.google?.accounts?.id
        if (!googleIdentity) {
          throw new Error(t('google.initializationError'))
        }

        googleIdentity.initialize({
          client_id: clientId,
          callback: ({ credential }) => {
            if (!credential) {
              onErrorRef.current(t('google.credentialError'))
              return
            }

            onCredentialRef.current(credential)
          },
        })

        const renderButton = () => {
          const buttonHost = buttonRef.current
          if (!buttonHost || isCancelled) return

          const width = Math.min(
            Math.round(buttonHost.parentElement?.getBoundingClientRect().width ?? 0),
            400,
          )
          if (width <= 0) {
            requestAnimationFrame(renderButton)
            return
          }

          buttonHost.replaceChildren()
          googleIdentity.renderButton(buttonHost, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: String(width),
          })

        }

        renderButton()
      })
      .catch(() => {
        if (isCancelled) return
        onErrorRef.current(t('google.prepareError'))
      })

    return () => {
      isCancelled = true
      container.replaceChildren()
    }
  }, [clientId, language, t])

  if (!clientId) {
    return (
      <button
        className={styles.fallbackButton}
        type="button"
        title={t('google.clientIdRequired')}
        onClick={() =>
          onError(t('google.clientIdRequired'))
        }
      >
        {t('login.google')}
      </button>
    )
  }

  return (
    <div
      className={`${styles.root} ${disabled ? styles.disabled : ''}`}
      aria-busy={disabled}
    >
      <div ref={buttonRef} className={styles.buttonHost} />
    </div>
  )
}

export default GoogleIdentityButton
