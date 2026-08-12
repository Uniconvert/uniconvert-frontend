import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '@/i18n/I18nContext'
import styles from './Toast.module.css'

export type ToastVariant = 'success' | 'error' | 'info'

interface ToastProps {
  variant: ToastVariant
  title: string
  description?: string
  duration?: number
  onClose: () => void
}

const variantSymbol: Record<ToastVariant, string> = {
  success: '✓',
  error: '×',
  info: 'i',
}

function Toast({
  variant,
  title,
  description,
  duration = 3000,
  onClose,
}: ToastProps) {
  const { t } = useI18n()
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const timer = window.setTimeout(() => onCloseRef.current(), duration)
    return () => window.clearTimeout(timer)
  }, [duration, title, description, variant])

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className={`${styles.toast} ${styles[variant]} ${description ? '' : styles.compact}`}
      role={variant === 'error' ? 'alert' : 'status'}
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
    >
      <span className={styles.icon} aria-hidden="true">{variantSymbol[variant]}</span>
      <div className={styles.copy}>
        <strong>{title}</strong>
        {description && <span>{description}</span>}
      </div>
      <button type="button" aria-label={t('common.notificationClose')} onClick={onClose}>×</button>
    </div>,
    document.body,
  )
}

export default Toast
