import type { RefObject } from 'react'
import Button from '@/components/common/Button/Button'
import EmptyState from '@/components/common/EmptyState/EmptyState'
import ErrorState from '@/components/common/ErrorState/ErrorState'
import LoadingState from '@/components/common/LoadingState/LoadingState'
import type { EmailReportData } from '@/features/settings/types/emailReport'
import { getCategoryIconPath } from '@/utils/categoryIcon'
import { formatCurrencyAmount } from '@/utils/currency'
import { useI18n } from '@/i18n/I18nContext'
import styles from '@/features/settings/settings.module.css'

interface EmailReportPreviewProps {
  captureRef: RefObject<HTMLElement | null>
  emailReport: EmailReportData | null
  isLoading: boolean
  errorMessage: string
  isSending: boolean
  onRetry: () => void
  onSend: () => void | Promise<void>
}

function EmailReportPreview({ captureRef, emailReport, isLoading, errorMessage, isSending, onRetry, onSend }: EmailReportPreviewProps) {
  const { t } = useI18n()

  return (
    <aside ref={captureRef} className={styles.reportPanel} aria-label={t('settings.preview')}>
      <img className={styles.emailIllustration} src="/assets/illustrations/email-report.png" alt="" aria-hidden="true" />
      <section className={styles.reportCard}>
        <h2>{t('settings.preview')}</h2>
          {isLoading ? (
            <LoadingState message={t('report.loading')} />
          ) : errorMessage ? (
            <ErrorState title={errorMessage} retryLabel={t('common.retry')} onRetry={onRetry} />
          ) : !emailReport ? (
            <EmptyState title={t('settings.preview')} variant="compact" />
          ) : (
            <>
              <p className={styles.reportMonth}>{emailReport.yearMonth.replace('-', '.')}</p>
              <div className={styles.reportTotal}><span>{t('report.totalExpense')}</span><strong>{formatCurrencyAmount(emailReport.totalExpenseHome, emailReport.homeCurrency)}</strong></div>
              <hr />
              <h3>{t('settings.categorySpending')}</h3>
              <ul className={styles.reportList}>{emailReport.categories.map((category) => <li key={category.categoryId}><span className={styles.reportCategoryIcon}><img src={getCategoryIconPath(category.iconKey)} alt="" aria-hidden="true" /></span><span className={styles.reportCategoryInfo}><span><b>{category.categoryName}</b><strong>{formatCurrencyAmount(category.amountHome, emailReport.homeCurrency)}</strong></span><span className={styles.reportProgress}><i style={{ width: `${category.ratio}%` }} /></span></span></li>)}</ul>
              <p className={styles.mvpNotice}>{t('report.mvpNotice')}</p>
            </>
          )}
        {emailReport && !isLoading && !errorMessage && (
          <Button data-report-capture-ignore="true" className={styles.sendReportButton} fullWidth disabled={isSending} isLoading={isSending} onClick={onSend}><img src="/assets/icons/email.png" alt="" aria-hidden="true" />{isSending ? t('report.sending') : t('report.send')}</Button>
        )}
      </section>
    </aside>
  )
}

export default EmailReportPreview
