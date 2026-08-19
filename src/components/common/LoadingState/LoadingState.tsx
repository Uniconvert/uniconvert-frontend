import styles from './LoadingState.module.css'

export type LoadingStateSize = 'sm' | 'md' | 'lg'
export type LoadingStateVariant = 'panel' | 'inline'

export interface LoadingStateProps {
  message?: string
  size?: LoadingStateSize
  variant?: LoadingStateVariant
}

function LoadingState({
  message = '불러오는 중이에요.',
  size = 'md',
  variant = 'panel',
}: LoadingStateProps) {
  return (
    <div
      className={`${styles.state} ${styles[size]} ${styles[variant]}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className={styles.spinner} aria-hidden="true" />
      {message && <p>{message}</p>}
    </div>
  )
}

export default LoadingState
