import styles from './ErrorState.module.css'

export type ErrorStateVariant = 'default' | 'compact'

export interface ErrorStateProps {
  title?: string
  description?: string
  retryLabel?: string
  onRetry?: () => void
  variant?: ErrorStateVariant
}

function ErrorState({
  title = '문제가 발생했습니다.',
  description,
  retryLabel = '다시 시도',
  onRetry,
  variant = 'default',
}: ErrorStateProps) {
  return (
    <div className={`${styles.state} ${styles[variant]}`} role="alert">
      <strong>{title}</strong>
      {description && <p>{description}</p>}
      {onRetry && (
        <button type="button" className={styles.action} onClick={onRetry}>
          {retryLabel}
        </button>
      )}
    </div>
  )
}

export default ErrorState
