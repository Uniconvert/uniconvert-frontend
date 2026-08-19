import ModalShell from '@/components/common/ModalShell/ModalShell'
import { useI18n } from '@/i18n/I18nContext'
import styles from './DashboardLayout.module.css'

interface LogoutDialogProps {
  isLoggingOut: boolean
  onClose: () => void
  onConfirm: () => void
}

function LogoutDialog({ isLoggingOut, onClose, onConfirm }: LogoutDialogProps) {
  const { t } = useI18n()

  return (
    <ModalShell
      title={t('dashboard.logoutTitle')}
      titleId="logout-modal-title"
      closeLabel={t('dashboard.logoutClose')}
      width="31rem"
      bodyClassName={styles.logoutModalBody}
      onClose={onClose}
    >
      <img className={styles.logoutMascot} src="/assets/illustrations/mascot-warning.png" alt="" aria-hidden="true" />
      <p>{t('dashboard.logoutDescription')}</p>
      <div className={styles.logoutModalActions}>
        <button type="button" disabled={isLoggingOut} onClick={onClose}>{t('common.cancel')}</button>
        <button type="button" disabled={isLoggingOut} onClick={onConfirm}>{isLoggingOut ? t('dashboard.loggingOut') : t('nav.logout')}</button>
      </div>
    </ModalShell>
  )
}

export default LogoutDialog
