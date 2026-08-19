import { useEffect, useId, useRef } from 'react'
import type { CSSProperties, KeyboardEvent, ReactNode, Ref } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '@/i18n/I18nContext'
import { focusInitialElement, handleDialogKeyDown } from './dialogBehavior'
import styles from './ModalShell.module.css'

export interface ModalShellProps {
  title: ReactNode
  onClose: () => void
  children: ReactNode
  titleId?: string
  description?: ReactNode
  closeLabel?: string
  width?: string
  minHeight?: string
  bodyClassName?: string
  dialogClassName?: string
  backdropClassName?: string
  shellClassName?: string
  shellRef?: Ref<HTMLElement>
  headerSupplement?: ReactNode
  headerActions?: ReactNode
  showCloseButton?: boolean
  showBookmark?: boolean
  showHeader?: boolean
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
  description,
  closeLabel,
  width = '44rem',
  minHeight,
  bodyClassName = '',
  dialogClassName = '',
  backdropClassName = '',
  shellClassName = '',
  shellRef,
  headerSupplement,
  headerActions,
  showCloseButton = true,
  showBookmark = true,
  showHeader = true,
}: ModalShellProps) {
  const { t } = useI18n()
  const generatedTitleId = useId()
  const resolvedTitleId = titleId ?? generatedTitleId
  const descriptionId = useId()
  const dialogRef = useRef<HTMLElement>(null)
  const onCloseRef = useRef(onClose)
  const previousActiveElementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return undefined

    previousActiveElementRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    focusInitialElement(dialog)

    return () => {
      document.body.style.overflow = previousOverflow
      const previousActiveElement = previousActiveElementRef.current
      if (previousActiveElement?.isConnected) previousActiveElement.focus()
    }
  }, [])

  const onDialogKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const dialog = dialogRef.current
    if (dialog) handleDialogKeyDown(dialog, event, onCloseRef.current)
  }

  const shellStyle: ModalShellStyle = {
    '--modal-width': width,
    ...(minHeight ? { '--modal-min-height': minHeight } : {}),
  }

  return createPortal(
    <div
      className={`${styles.backdrop} ${backdropClassName}`}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div ref={shellRef as Ref<HTMLDivElement> | undefined} className={`${styles.shell} ${shellClassName}`} style={shellStyle}>
        {showBookmark && <span className={styles.bookmark} aria-hidden="true" />}
        <section
          ref={dialogRef}
          className={`${styles.dialog} ${dialogClassName}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={resolvedTitleId}
          aria-describedby={description ? descriptionId : undefined}
          tabIndex={-1}
          onKeyDown={onDialogKeyDown}
        >
          {showHeader && (
            <header className={styles.header}>
              <div className={styles.heading}>
                <h2 id={resolvedTitleId}>{title}</h2>
                {description && <p id={descriptionId} className={styles.description}>{description}</p>}
                {headerSupplement}
              </div>
              <div className={styles.headerActions}>
                {headerActions}
                {showCloseButton && (
                  <button
                    className={styles.closeButton}
                    type="button"
                    aria-label={closeLabel ?? t('common.close')}
                    onClick={onClose}
                  >
                    ×
                  </button>
                )}
              </div>
            </header>
          )}
          {!showHeader && <h2 id={resolvedTitleId} className={styles.visuallyHidden}>{title}</h2>}
          <div className={`${styles.body} ${bodyClassName}`}>{children}</div>
        </section>
      </div>
    </div>,
    document.body,
  )
}

export default ModalShell
