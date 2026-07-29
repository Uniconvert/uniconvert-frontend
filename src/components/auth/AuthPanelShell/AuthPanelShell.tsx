import type { CSSProperties, FormEventHandler, ReactNode } from 'react'
import styles from './AuthPanelShell.module.css'

interface AuthPanelShellProps {
  children: ReactNode
  width?: string
  height?: string
  minHeight?: string
  className?: string
  showBookmark?: boolean
  as?: 'div' | 'form'
  onSubmit?: FormEventHandler<HTMLFormElement>
  ariaLabelledBy?: string
}

type AuthPanelShellStyle = CSSProperties & {
  '--auth-panel-width'?: string
  '--auth-panel-height'?: string
  '--auth-panel-min-height'?: string
}

function AuthPanelShell({
  children,
  width = '47.5rem',
  height,
  minHeight,
  className = '',
  showBookmark = true,
  as = 'div',
  onSubmit,
  ariaLabelledBy,
}: AuthPanelShellProps) {
  const shellStyle: AuthPanelShellStyle = {
    '--auth-panel-width': width,
    ...(height ? { '--auth-panel-height': height } : {}),
    ...(minHeight ? { '--auth-panel-min-height': minHeight } : {}),
  }

  const panelClassName = `${styles.panel} ${className}`
  const panel = as === 'form'
    ? (
      <form className={panelClassName} aria-labelledby={ariaLabelledBy} onSubmit={onSubmit}>
        {children}
      </form>
    )
    : (
      <div className={panelClassName} aria-labelledby={ariaLabelledBy}>
        {children}
      </div>
    )

  return (
    <div
      className={`${styles.shell} ${height ? styles.fixedHeight : ''} ${minHeight ? styles.minimumHeight : ''}`}
      style={shellStyle}
    >
      {showBookmark && <span className={styles.bookmark} aria-hidden="true" />}
      {panel}
    </div>
  )
}

export default AuthPanelShell
