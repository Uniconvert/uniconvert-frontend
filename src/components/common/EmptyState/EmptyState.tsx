import type { ReactNode } from 'react'
import styles from './EmptyState.module.css'

export type EmptyStateVariant = 'default' | 'compact'

export interface EmptyStateProps {
  title: string
  description?: string
  icon?: ReactNode
  actionLabel?: string
  onAction?: () => void
  variant?: EmptyStateVariant
}

function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  variant = 'default',
}: EmptyStateProps) {
  return (
    <div className={`${styles.state} ${styles[variant]}`}>
      {icon && <div className={styles.icon} aria-hidden="true">{icon}</div>}
      <strong>{title}</strong>
      {description && <p>{description}</p>}
      {actionLabel && onAction && (
        <button type="button" className={styles.action} onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}

export default EmptyState
