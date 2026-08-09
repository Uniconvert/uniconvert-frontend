import { useEffect, useRef } from 'react'
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
      text: 'signin_with'
      shape: 'rectangular'
      logo_alignment: 'left'
      width: string
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
    let animationFrameId: number | null = null
    let renderedWidth = 0

    loadGoogleIdentityServices()
      .then(() => {
        if (isCancelled || !buttonRef.current) return

        const googleIdentity = window.google?.accounts?.id
        if (!googleIdentity) {
          throw new Error('Google 로그인 서비스를 초기화하지 못했습니다.')
        }

        googleIdentity.initialize({
          client_id: clientId,
          callback: ({ credential }) => {
            if (!credential) {
              onErrorRef.current('Google 인증 정보를 받지 못했습니다.')
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
            text: 'signin_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: String(nextWidth),
          })
        }

        renderButton()
        resizeObserver = new ResizeObserver(() => {
          if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId)
          }
          animationFrameId = requestAnimationFrame(renderButton)
        })
        resizeObserver.observe(buttonRef.current)
      })
      .catch((error: unknown) => {
        if (isCancelled) return
        onErrorRef.current(
          error instanceof Error
            ? error.message
            : 'Google 로그인을 준비하지 못했습니다.',
        )
      })

    return () => {
      isCancelled = true
      resizeObserver?.disconnect()
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId)
      }
      container.replaceChildren()
    }
  }, [clientId])

  if (!clientId) {
    return (
      <button
        className={styles.fallbackButton}
        type="button"
        title="VITE_GOOGLE_CLIENT_ID를 설정해주세요."
        onClick={() =>
          onError('Google 로그인을 사용하려면 VITE_GOOGLE_CLIENT_ID를 설정해주세요.')
        }
      >
        Google 계정으로 로그인
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
