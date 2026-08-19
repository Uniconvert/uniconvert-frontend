import type { ExpenseListItem } from '@/types/expense'
import { getCategoryIconPath } from '@/utils/categoryIcon'
import { convertCurrencyAmount } from '@/utils/exchangeRate'
import { useI18n } from '@/i18n/I18nContext'
import styles from '@/features/report/report.module.css'

interface ReportTransactionListProps {
  transactions: ExpenseListItem[]
  isLoading: boolean
  localSymbol: string
  userHomeCurrency: string
}

function ReportTransactionList({
  transactions,
  isLoading,
  localSymbol,
  userHomeCurrency,
}: ReportTransactionListProps) {
  const { locale, t } = useI18n()

  return (
    <ul className={styles.emailTxList}>
      {isLoading ? (
        <li style={{ padding: '1rem', color: '#999', textAlign: 'center' }}>
          {t('report.loadingTransactions')}
        </li>
      ) : transactions.length === 0 ? (
        <li style={{ padding: '1rem', color: '#999', textAlign: 'center' }}>
          {t('report.noTodayExpenses')}
        </li>
      ) : transactions.map((transaction) => {
        const timeStr = transaction.spentAt.includes('T')
          ? transaction.spentAt.split('T')[1].slice(0, 5)
          : ''
        return (
          <li key={transaction.expenseId || `${transaction.merchantName}-${transaction.spentAt}`}>
            <div className={styles.txIcon}>
              <img src={getCategoryIconPath(transaction.iconKey)} alt={transaction.categoryName} width="18" height="18" />
            </div>
            <div className={styles.txInfo}>
              <strong>{transaction.merchantName}</strong>
              <span>{transaction.categoryName} {timeStr ? `• ${timeStr}` : ''}</span>
            </div>
            <div className={styles.txAmount}>
              <strong>{localSymbol} {transaction.convertedAmountHome.toLocaleString(locale)}</strong>
              <span>USD {Number(convertCurrencyAmount(transaction.convertedAmountHome, userHomeCurrency, 'USD')).toFixed(2)}</span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export default ReportTransactionList
