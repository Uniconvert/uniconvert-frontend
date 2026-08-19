import { useRef, useState } from 'react'
import type { ExpenseHistoryData, SavedExpense } from '@/types/expense'
import { formatCurrencyAmount } from '@/utils/currency'
import { getCategoryIconPath } from '@/utils/categoryIcon'
import { useI18n } from '@/i18n/I18nContext'
import EmptyState from '@/components/common/EmptyState/EmptyState'
import ErrorState from '@/components/common/ErrorState/ErrorState'
import { useListboxKeyboard } from '@/hooks/useListboxKeyboard'
import styles from '@/features/expense/expenseHistory.module.css'

const recentRangeOptions = [
  { value: 'day', labelKey: 'expenseHistory.day' },
  { value: 'week', labelKey: 'expenseHistory.week' },
  { value: 'month', labelKey: 'expenseHistory.month' },
] as const

interface ExpenseHistorySummaryProps {
  data: ExpenseHistoryData
  recentExpenses: ExpenseHistoryData['recentExpenses']
  recentRange: string
  recentExpensesError: string
  filteredSavedExpenses: SavedExpense[]
  getCategoryLabel: (iconKey: string, fallback: string) => string
  onRecentRangeChange: (value: string) => void
  onRetry: () => void
  onOpenSavedExpenses: () => void
}

function ExpenseHistorySummary({
  data,
  recentExpenses,
  recentRange,
  recentExpensesError,
  filteredSavedExpenses,
  getCategoryLabel,
  onRecentRangeChange,
  onRetry,
  onOpenSavedExpenses,
}: ExpenseHistorySummaryProps) {
  const { locale, t } = useI18n()
  const [isRangeMenuOpen, setIsRangeMenuOpen] = useState(false)
  const rangePickerRef = useRef<HTMLDivElement>(null)
  const selectedRangeIndex = Math.max(0, recentRangeOptions.findIndex((option) => option.value === recentRange))
  const selectedRange = recentRangeOptions[selectedRangeIndex]
  const rangeListbox = useListboxKeyboard({
    open: isRangeMenuOpen,
    optionCount: recentRangeOptions.length,
    selectedIndex: selectedRangeIndex,
    id: 'expense-history-range-listbox',
    onOpen: () => setIsRangeMenuOpen(true),
    onClose: () => setIsRangeMenuOpen(false),
    onSelect: (index) => {
      onRecentRangeChange(recentRangeOptions[index].value)
      setIsRangeMenuOpen(false)
    },
    rootRef: rangePickerRef,
  })
  const categorySummary = data.categories
  const donutSegments = categorySummary.map((category, index) => {
    const percentage = data.monthlyExpenseHome > 0
      ? (category.amountHome / data.monthlyExpenseHome) * 100
      : 0
    const start = data.monthlyExpenseHome > 0
      ? categorySummary.slice(0, index).reduce((sum, item) => sum + (item.amountHome / data.monthlyExpenseHome) * 100, 0)
      : 0
    const angle = (-90 + (start + percentage / 2) * 3.6) * (Math.PI / 180)
    const labelRadius = percentage < 5 ? 91 : 94
    return {
      ...category,
      percentage,
      start,
      labelX: 136 + Math.cos(angle) * labelRadius,
      labelY: 136 + Math.sin(angle) * labelRadius,
    }
  })

  return (
    <>
      <div className={styles.leftColumn}>
        <section className={styles.assetCard} aria-labelledby="total-assets-title">
          <img className={styles.assetRing} src="/assets/illustrations/asset-ring.png" alt="" aria-hidden="true" />
          <div className={styles.assetCenter}>
            <h2 id="total-assets-title">{t('expenseHistory.totalAssets')}</h2>
            <strong>{formatCurrencyAmount(data.remainingBudgetHome, data.homeCurrency)}</strong>
            <span>{data.yearMonth.replace('-', '.')}</span>
          </div>
          <div className={styles.budgetSummary}>
            <div className={styles.budgetHeader}>
              <span>{t('expenseHistory.budgetUsage')}</span>
              <strong>{data.budgetUsagePercent}%</strong>
            </div>
            <div className={styles.progressTrack}><span style={{ width: `${Math.min(data.budgetUsagePercent, 100)}%` }} /></div>
            <div className={styles.remainingBudget}>
              <span>{t('expenseHistory.monthlyBudget')}</span>
              <strong>{formatCurrencyAmount(data.monthlyBudgetHome, data.homeCurrency)}</strong>
            </div>
          </div>
        </section>

        <section className={styles.recentCard} aria-labelledby="recent-expenses-title">
          <header className={styles.cardHeader}>
            <div>
              <h2 id="recent-expenses-title">{t('expenseHistory.byCategory')}</h2>
              <span>{t('expenseHistory.categoryCount', { count: recentExpenses.length })}</span>
            </div>
            <div className={styles.rangePicker} ref={rangePickerRef}>
              <button
                type="button"
                aria-label={t('expenseHistory.period')}
                aria-haspopup="listbox"
                aria-expanded={isRangeMenuOpen}
                aria-controls={rangeListbox.listboxId}
                aria-activedescendant={rangeListbox.activeDescendantId}
                onKeyDown={rangeListbox.onTriggerKeyDown}
                onClick={rangeListbox.onTriggerClick}
              >
                <span>{t(selectedRange.labelKey)}</span>
                <span className={styles.pickerChevron} aria-hidden="true" />
              </button>
              {isRangeMenuOpen && (
                <div id={rangeListbox.listboxId} className={styles.rangeMenu} role="listbox" aria-label={t('expenseHistory.period')}>
                  {recentRangeOptions.map((option, index) => (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      id={rangeListbox.getOptionId(index)}
                      tabIndex={-1}
                      aria-selected={recentRange === option.value}
                      onMouseEnter={() => rangeListbox.onOptionPointerMove(index)}
                      onClick={() => rangeListbox.onOptionClick(index)}
                    >
                      {t(option.labelKey)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </header>
          <ul className={styles.recentList}>
            {recentExpenses.map((expense) => (
              <li key={expense.expenseId}>
                <div className={styles.recentExpenseRow}>
                  <span className={styles.expenseIcon}><img src={getCategoryIconPath(expense.iconKey)} alt="" aria-hidden="true" /></span>
                  <span>{getCategoryLabel(expense.iconKey, expense.categoryName)}</span>
                  <strong>{formatCurrencyAmount(expense.convertedAmountHome, data.homeCurrency)}</strong>
                </div>
              </li>
            ))}
            {recentExpenses.length === 0 && <li>{t('expenseHistory.noCategorySpending')}</li>}
          </ul>
        </section>
      </div>

      <div className={styles.rightColumn}>
        <section className={styles.monthlyCard} aria-labelledby="monthly-expenses-title">
          <header className={styles.monthlyHeader}>
            <h2 id="monthly-expenses-title">{t('expenseHistory.monthlySpending')}</h2>
          </header>
          {data.monthlyExpenseHome > 0 ? (
            <div className={styles.monthlyBody}>
              <div className={styles.donutWrap} aria-label={`${t('expenseHistory.totalSpending')} ${data.monthlyExpenseHome.toLocaleString(locale)}`}>
                <svg className={styles.donut} viewBox="0 0 272 272" aria-hidden="true">
                  {donutSegments.map((segment) => (
                    <g key={segment.categoryId}>
                      <circle cx="136" cy="136" r="96" pathLength="100" fill="none" stroke={segment.color} strokeWidth="70" strokeDasharray={`${segment.percentage} ${100 - segment.percentage}`} strokeDashoffset={-segment.start} transform="rotate(-90 136 136)" />
                      {segment.percentage >= 2 && <text x={segment.labelX} y={segment.labelY} textAnchor="middle" dominantBaseline="middle" fill={segment.color === '#e2efff' || segment.color === '#a9cbfa' ? '#366894' : '#fff'}>{Math.round(segment.percentage)}%</text>}
                    </g>
                  ))}
                </svg>
                <div className={styles.donutCenter}>
                  <span>{t('expenseHistory.totalSpending')}</span>
                  <strong>{formatCurrencyAmount(data.monthlyExpenseHome, data.homeCurrency)}</strong>
                </div>
              </div>
              <ul className={styles.categorySummary}>
                {categorySummary.map((category) => (
                  <li key={category.categoryId}>
                    <span className={styles.categoryName}><i style={{ backgroundColor: category.color }} />{getCategoryLabel(category.iconKey, category.categoryName)}</span>
                    <span className={styles.categoryPercentage}>{Math.round(category.percentage)}%</span>
                    <strong>{formatCurrencyAmount(category.amountHome, data.homeCurrency)}</strong>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className={styles.monthlyEmptyState}>
              <EmptyState
                icon={<img src="/assets/illustrations/mascot-checklist.png" alt="" />}
                title={t('expenseHistory.noMonthlyExpensesTitle')}
                description={t('expenseHistory.noMonthlyExpensesDescription')}
                variant="compact"
              />
            </div>
          )}
        </section>

        <section className={styles.savedCard} aria-labelledby="saved-expenses-title">
          <header>
            <h2 id="saved-expenses-title">{t('expenseHistory.recentExpenses')}</h2>
            <span>{data.yearMonth.replace('-', '.')}</span>
          </header>
          <ul>
            {recentExpensesError && (
              <li className={styles.emptySaved}>
                <ErrorState title={recentExpensesError} retryLabel={t('common.retry')} onRetry={onRetry} variant="compact" />
              </li>
            )}
            {filteredSavedExpenses.slice(0, 2).map((expense) => (
              <li key={expense.expenseId}>
                <span className={styles.expenseIcon}><img src={getCategoryIconPath(expense.iconKey)} alt="" aria-hidden="true" /></span>
                <span><b>{expense.merchantName}</b><small>{expense.spentAt.slice(0, 10).replaceAll('-', '.')}</small></span>
                <strong>{formatCurrencyAmount(expense.convertedAmountHome, data.homeCurrency)}</strong>
              </li>
            ))}
            {!recentExpensesError && filteredSavedExpenses.length === 0 && (
              <li className={styles.emptySaved}><EmptyState title={t('expenseHistory.noRecentExpenses')} variant="compact" /></li>
            )}
          </ul>
          <button type="button" onClick={onOpenSavedExpenses}>{t('expenseHistory.more')}</button>
        </section>
      </div>
    </>
  )
}

export default ExpenseHistorySummary
