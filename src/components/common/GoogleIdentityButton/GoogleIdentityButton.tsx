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
      width: string
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
const GOOGLE_BUTTON_SURFACE_SELECTOR =
  '.nsm7Bb-HzV7m-LgbsSe, .hJDwNd-SxQuSe, .nsm7Bb-HzV7m-LgbsSe-bN97Pc-sM5MNb'

function normalizeGoogleButtonSurfaces(buttonHost: HTMLElement) {
  buttonHost.querySelectorAll<HTMLElement>(GOOGLE_BUTTON_SURFACE_SELECTOR).forEach((surface) => {
    surface.style.width = '100%'
    surface.style.maxWidth = 'none'
    surface.style.height = '100%'
    surface.style.minHeight = '100%'
    surface.style.boxSizing = 'border-box'
    surface.style.display = 'flex'
    surface.style.alignItems = 'center'
    surface.style.justifyContent = 'center'
  })
}

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
    let resizeObserver: ResizeObserver | null = null
    let renderedButtonObserver: MutationObserver | null = null
    let animationFrameId: number | null = null
    let renderedWidth = 0

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

          const nextWidth = Math.round(buttonHost.getBoundingClientRect().width)
          if (nextWidth <= 0 || nextWidth === renderedWidth) return

          renderedWidth = nextWidth
          buttonHost.replaceChildren()
          googleIdentity.renderButton(buttonHost, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'rectangular',
            logo_alignment: 'center',
            // GIS standard buttons are capped at 400px. Render at the capped
            // width and let the host center it instead of inheriting a stale
            // right-aligned iframe width on production.
            width: String(Math.min(nextWidth, 400)),
            // Google Identity Services expects a language code such as `ko` or `en`.
            locale: language,
          })

          // GIS creates the clickable surface asynchronously. Its default
          // width can be narrower than the host, so normalize the generated
          // surface after every render as well as in CSS.
          normalizeGoogleButtonSurfaces(buttonHost)
        }

        renderedButtonObserver = new MutationObserver(() => {
          if (buttonRef.current) normalizeGoogleButtonSurfaces(buttonRef.current)
        })
        renderedButtonObserver.observe(container, { childList: true, subtree: true })
        renderButton()
        resizeObserver = new ResizeObserver(() => {
          if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId)
          }
          animationFrameId = requestAnimationFrame(renderButton)
        })
        resizeObserver.observe(buttonRef.current)
      })
      .catch(() => {
        if (isCancelled) return
        onErrorRef.current(t('google.prepareError'))
      })

    return () => {
      isCancelled = true
      resizeObserver?.disconnect()
      renderedButtonObserver?.disconnect()
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId)
      }
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
