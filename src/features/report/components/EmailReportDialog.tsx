import type { RefObject } from 'react'
import Button from '@/components/common/Button/Button'
import ModalShell from '@/components/common/ModalShell/ModalShell'
import { convertCurrencyAmount } from '@/utils/exchangeRate'
import { useI18n } from '@/i18n/I18nContext'
import type { ExpenseListItem } from '@/types/expense'
import styles from '@/features/report/report.module.css'
import ReportTransactionList from '@/features/report/components/ReportTransactionList'

export interface ReportTimeDataPoint {
  dateStr: string
  label: string
  amount: number
}

export interface EmailReportDialogProps {
  captureRef: RefObject<HTMLElement | null>
  targetDate: string
  targetAmount: number
  remainingBudgetHome: number | null
  remainingBudgetError?: string
  localSymbol: string
  homeSymbol: string
  userLocalCurrency: string
  userHomeCurrency: string
  transactions: ExpenseListItem[]
  isLoadingTransactions: boolean
  timeData: ReportTimeDataPoint[]
  isSending: boolean
  onClose: () => void
  onSend: () => void | Promise<void>
}

function EmailReportDialog({
  captureRef,
  targetDate,
  targetAmount,
  remainingBudgetHome,
  remainingBudgetError = '',
  localSymbol,
  homeSymbol,
  userLocalCurrency,
  userHomeCurrency,
  transactions,
  isLoadingTransactions,
  timeData,
  isSending,
  onClose,
  onSend,
}: EmailReportDialogProps) {
  const { locale, t } = useI18n()
  const [, month, day] = targetDate.split('-')
  const maxTimeAmount = timeData.length > 0 ? Math.max(...timeData.map((item) => item.amount)) : 0

  return (
    <ModalShell
      title={t('report.todayReport', { month: Number(month), day: Number(day) })}
      titleId="report-email-modal-title"
      onClose={onClose}
      closeLabel={t('common.close')}
      width="32.5rem"
      showBookmark={false}
      showHeader={false}
      backdropClassName={styles.emailModalBackdrop}
      shellClassName={styles.emailModalWrapper}
      shellRef={captureRef}
      dialogClassName={styles.emailModalDialog}
      bodyClassName={styles.emailModalBody}
    >
      <img className={styles.emailIllustration} src="/assets/illustrations/email-report.png" alt="" aria-hidden="true" />
      <div className={styles.emailModalInner}>
          <header className={styles.emailHeader}>
            <h2>{t('report.todayReport', { month: Number(month), day: Number(day) })}</h2>
            <p>{t('report.todayDescription')}</p>
            <p className={styles.emailMvpNotice}>{t('report.mvpNotice')}</p>
          </header>

          <section className={styles.emailListSection}>
            <div className={styles.emailSummary}>
              <div className={styles.summaryBox}>
                <span>{t('report.totalExpense')}</span>
                <strong className={styles.textBlue}>{localSymbol} {targetAmount.toLocaleString(locale)}</strong>
                <small>({userHomeCurrency} {Number(convertCurrencyAmount(targetAmount, userLocalCurrency, userHomeCurrency)).toFixed(2)})</small>
              </div>
              <div className={styles.summaryArrow}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M13 5L20 12L13 19M5 5L12 12L5 19" stroke="#90b6d9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className={styles.summaryBox}>
                <span>{t('report.remainingBudget')}</span>
                {remainingBudgetHome === null ? (
                  <>
                    <strong>—</strong>
                    <small>{remainingBudgetError || t('report.loadingTransactions')}</small>
                  </>
                ) : (
                  <>
                    <strong>{homeSymbol} {remainingBudgetHome.toLocaleString(locale)}</strong>
                    <small>(USD {Number(convertCurrencyAmount(remainingBudgetHome, userHomeCurrency, 'USD')).toFixed(2)})</small>
                  </>
                )}
              </div>
            </div>
          </section>

          <section className={styles.emailListSection}>
            <h3>{t('report.todayExpenses')}</h3>
            <ReportTransactionList
              transactions={transactions}
              isLoading={isLoadingTransactions}
              localSymbol={localSymbol}
              userHomeCurrency={userHomeCurrency}
            />
          </section>

          <section className={styles.emailChartSection}>
            <h3>{t('report.weeklyTrend')}</h3>
            <div className={styles.emailChart}>
              {timeData.map((item) => {
                const isToday = item.dateStr === targetDate
                return (
                  <div className={styles.chartCol} key={item.dateStr}>
                    <div
                      className={`${styles.chartBar} ${isToday ? styles.barToday : ''} ${item.amount === maxTimeAmount && maxTimeAmount > 0 ? styles.barMax : ''}`}
                      style={{ height: item.amount > 0 ? `${(item.amount / maxTimeAmount) * 100}%` : '0%' }}
                    >
                      {isToday && item.amount > 0 && <div className={styles.chartTooltip}>{localSymbol} {item.amount.toLocaleString(locale)}</div>}
                    </div>
                    <span>{item.label}</span>
                  </div>
                )
              })}
            </div>
          </section>
        <Button
          className={styles.emailSendBtn}
          fullWidth
          data-report-capture-ignore="true"
          disabled={isSending}
          isLoading={isSending}
          onClick={() => { void onSend() }}
        >
          <img src="/assets/icons/email.png" alt="" aria-hidden="true" />
          {isSending ? t('report.sending') : t('report.send')}
        </Button>
      </div>
    </ModalShell>
  )
}

export default EmailReportDialog
