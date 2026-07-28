import { useEffect, useId, useRef } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import styles from './ModalShell.module.css'

interface ModalShellProps {
  title: ReactNode
  onClose: () => void
  children: ReactNode
  titleId?: string
  closeLabel?: string
  width?: string
  minHeight?: string
  bodyClassName?: string
  dialogClassName?: string
  headerSupplement?: ReactNode
  headerActions?: ReactNode
  showCloseButton?: boolean
  showBookmark?: boolean
}

type ModalShellStyle = CSSProperties & {
  '--modal-width'?: string
  '--modal-min-height'?: string
}

function ModalShell({
  title,
  onClose,
  children,
  titleId,
  closeLabel,
  width = '44rem',
  minHeight,
  bodyClassName = '',
  dialogClassName = '',
  headerSupplement,
  headerActions,
  showCloseButton = true,
  showBookmark = true,
}: ModalShellProps) {
  const generatedTitleId = useId()
  const resolvedTitleId = titleId ?? generatedTitleId
  const dialogRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    dialogRef.current?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const shellStyle: ModalShellStyle = {
    '--modal-width': width,
    ...(minHeight ? { '--modal-min-height': minHeight } : {}),
  }

  return createPortal(
    <div
      className={styles.backdrop}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className={styles.shell} style={shellStyle}>
        {showBookmark && <span className={styles.bookmark} aria-hidden="true" />}
        <section
          ref={dialogRef}
          className={`${styles.dialog} ${dialogClassName}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={resolvedTitleId}
          tabIndex={-1}
        >
          <header className={styles.header}>
            <div className={styles.heading}>
              <h2 id={resolvedTitleId}>{title}</h2>
              {headerSupplement}
            </div>
            <div className={styles.headerActions}>
              {headerActions}
              {showCloseButton && (
                <button
                  className={styles.closeButton}
                  type="button"
                  aria-label={closeLabel ?? `${String(title)} 닫기`}
                  onClick={onClose}
                >
                  ×
                </button>
              )}
            </div>
          </header>
          <div className={`${styles.body} ${bodyClassName}`}>{children}</div>
        </section>
      </div>
    </div>,
    document.body,
  )
}

export default ModalShell
