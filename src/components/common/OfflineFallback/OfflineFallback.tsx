import { Link } from 'react-router'
import { ROUTE_PATHS } from '@/routes/routePaths'
import { useI18n } from '@/i18n/I18nContext'
import styles from './OfflineFallback.module.css'

function OfflineFallback() {
  const { t } = useI18n()

  return (
    <main className={styles.page} role="status">
      <span className={styles.icon} aria-hidden="true">⌁</span>
      <h1>{t('offline.title')}</h1>
      <p>{t('offline.description')}</p>
      <Link className={styles.action} to={ROUTE_PATHS.offlineCalculator}>{t('offline.calculator')}</Link>
    </main>
  )
}

export default OfflineFallback
