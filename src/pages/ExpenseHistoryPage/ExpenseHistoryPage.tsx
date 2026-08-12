import { useState, useMemo } from 'react'
import {
  deleteSavedExpense,
  updateSavedExpenseName,
} from '@/api/expenses'
import ModalShell from '@/components/common/ModalShell/ModalShell'
import Toast from '@/components/common/Toast/Toast'
import { useToastQueue } from '@/components/common/Toast/useToastQueue'
import { useExpenseHistoryData } from '@/hooks/useExpenseHistoryData'
import type { SavedExpense } from '@/types/expense'
import { formatCurrencyAmount, getCurrentYearMonth } from '@/utils/currency'
import { getCategoryIconPath } from '@/utils/categoryIcon'
import { getApiErrorNotice } from '@/utils/apiError'
import styles from './ExpenseHistoryPage.module.css'
import FloatingMascot from '@/components/common/FloatingMascot/FloatingMascot'
import { useI18n } from '@/i18n/I18nContext'

const recentRangeOptions = [
  { value: 'day', labelKey: 'expenseHistory.day' },
  { value: 'week', labelKey: 'expenseHistory.week' },
  { value: 'month', labelKey: 'expenseHistory.month' },
]

function ExpenseHistoryPage() {
  const { locale, t } = useI18n()
  const getCategoryLabel = (iconKey: string, fallback: string) => {
    const key = `category.${iconKey}`
    const translated = t(key)
    return translated === key ? fallback : translated
  }
  const currentYear = getCurrentYearMonth().slice(0, 4)
  const selectedMonth = String(Number(getCurrentYearMonth().slice(5)))
  const [recentRange, setRecentRange] = useState('day')
  const [isRecentRangeOpen, setIsRecentRangeOpen] = useState(false)
  const [isSavedExpensesOpen, setIsSavedExpensesOpen] = useState(false)
  const [isManagingExpenses, setIsManagingExpenses] = useState(false)
  const [isMonthMenuOpen, setIsMonthMenuOpen] = useState(false)
  const [recentModalMonth, setRecentModalMonth] = useState(() => String(Number(getCurrentYearMonth().slice(5))))
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null)
  const [editingExpenseName, setEditingExpenseName] = useState('')
  const { toast, showToast, closeToast } = useToastQueue()
  const {
    data,
    errorMessage,
    recentExpenses: savedExpenses,
    setRecentExpenses: setSavedExpenses,
    recentExpensesError,
    modalExpenses,
    isModalExpensesLoading,
    modalExpensesError,
    retry,
  } = useExpenseHistoryData({
    yearMonth: `${currentYear}-${selectedMonth.padStart(2, '0')}`,
    range: recentRange,
    isRecentModalOpen: isSavedExpensesOpen,
    recentModalYearMonth: `${currentYear}-${recentModalMonth.padStart(2, '0')}`,
  })

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      const deleted = await deleteSavedExpense(expenseId)
      if (!deleted) return
      setSavedExpenses((current) => current.filter((expense) => expense.expenseId !== expenseId))
      showToast({ variant: 'success', title: t('expenseHistory.deleteSuccess') })
      retry()
    } catch (error) {
      showToast({
        variant: 'error',
        ...getApiErrorNotice(error, t('expenseHistory.deleteError')),
      })
    }
  }

  const filteredSavedExpenses = savedExpenses.filter((expense) => expense.spentAt.startsWith(`${currentYear}-${selectedMonth.padStart(2, '0')}`))
  const filteredModalExpenses = modalExpenses

  const openSavedExpenses = () => {
    setRecentModalMonth(selectedMonth)
    setIsMonthMenuOpen(false)
    setIsSavedExpensesOpen(true)
  }

  const closeSavedExpenses = () => {
    setIsMonthMenuOpen(false)
    setIsManagingExpenses(false)
    setEditingExpenseId(null)
    setEditingExpenseName('')
    setIsSavedExpensesOpen(false)
  }

  const startEditingExpenseName = (expense: SavedExpense) => {
    setEditingExpenseId(expense.expenseId)
    setEditingExpenseName(expense.merchantName)
  }

  const cancelEditingExpenseName = () => {
    setEditingExpenseId(null)
    setEditingExpenseName('')
  }

  const handleSaveExpenseName = async (expense: SavedExpense) => {
    const nextName = editingExpenseName.trim()
    if (!nextName) return

    try {
      const updated = await updateSavedExpenseName(expense, nextName)
      setSavedExpenses((current) => current.map((item) => (
        item.expenseId === updated.expenseId ? updated : item
      )))
      cancelEditingExpenseName()
      retry()
      showToast({ variant: 'success', title: t('expenseHistory.updateSuccess') })
    } catch (error) {
      showToast({
        variant: 'error',
        ...getApiErrorNotice(error, t('expenseHistory.updateError')),
      })
    }
  }

  const mascotMessages = useMemo(() => {
    if (!data) return ["이번 달 예산에 맞게 잘 쓰고 있어요!"]

    const apiMessages = data?.mascotMessages
      .map((item) => item.message)
      .filter(Boolean) ?? []
    if (apiMessages.length > 0) return apiMessages

    const todayStr = new Date().toISOString().slice(0, 10)
    const todaySpentTotal = savedExpenses
      .filter((expense) => expense.spentAt.startsWith(todayStr))
      .reduce((sum, expense) => sum + (expense.convertedAmountHome ?? 0), 0)

    const formattedTodaySpent = formatCurrencyAmount(todaySpentTotal, data.homeCurrency)
    
    const dynamicTodayMsg: React.ReactNode = todaySpentTotal >= 50000
      ? (
        <>
          오늘{' '}
          <span style={{ color: '#6AADEA' }}>{formattedTodaySpent}</span>
          {' '}썼어요. 꽤 알차게 쓴 하루네요!
        </>
      )
      : (
        <>
          오늘{' '}
          <span style={{ color: '#6AADEA' }}>{formattedTodaySpent}</span>
          {' '}썼어요. 지출이 아주 알뜰한 하루네요!
        </>
      )

    let dynamicTopCategoryMsg: React.ReactNode = "이번달 지출 내역을 확인해보세요!"
    if (data.categories && data.categories.length > 0) {
      const topCategory = [...data.categories].sort((a, b) => b.amountHome - a.amountHome)[0]
      if (topCategory && topCategory.amountHome > 0) {
        dynamicTopCategoryMsg = `이번달 가장 많이 쓴 건 ${topCategory.categoryName}예요!`
      }
    }

    return [
      dynamicTodayMsg,
      dynamicTopCategoryMsg,
      "이번 달 예산에 맞게 잘 쓰고 있어요!"
    ]
  }, [savedExpenses, data])

  if (errorMessage) {
    return (
      <section className={`${styles.page} ${styles.feedbackPage}`} aria-labelledby="expense-history-title">
        <div className={styles.feedbackCard} role="alert">
          <h1 id="expense-history-title">{t('expenseHistory.title')}</h1>
          <p>{errorMessage}</p>
          <span>{t('expenseHistory.retryDescription')}</span>
          <button type="button" onClick={retry}>{t('common.retry')}</button>
        </div>
      </section>
    )
  }
  if (!data) {
    return (
      <section className={`${styles.page} ${styles.feedbackPage}`} aria-busy="true">
        <div className={styles.feedbackCard}>
          <h1>{t('expenseHistory.title')}</h1>
          <p aria-live="polite">{t('expenseHistory.loading')}</p>
        </div>
      </section>
    )
  }

  const recentExpenses = data.recentExpenses
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
    <section className={styles.page} aria-labelledby="expense-history-title">
      {toast && <Toast key={toast.id} {...toast} onClose={closeToast} />}
      <h1 id="expense-history-title" className={styles.srOnly}>{t('expenseHistory.title')}</h1>

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
            <div className={styles.rangePicker}>
              <button
                type="button"
                aria-label={t('expenseHistory.period')}
                aria-haspopup="listbox"
                aria-expanded={isRecentRangeOpen}
                onClick={() => setIsRecentRangeOpen((open) => !open)}
              >
                <span>{t(recentRangeOptions.find((option) => option.value === recentRange)?.labelKey ?? 'expenseHistory.day')}</span>
                <span className={styles.pickerChevron} aria-hidden="true" />
              </button>
              {isRecentRangeOpen && (
                <div className={styles.rangeMenu} role="listbox" aria-label={t('expenseHistory.period')}>
                  {recentRangeOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={recentRange === option.value}
                      onClick={() => {
                        setRecentRange(option.value)
                        setIsRecentRangeOpen(false)
                      }}
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
                    <span className={styles.categoryPercentage}>{category.percentage}%</span>
                    <strong>{formatCurrencyAmount(category.amountHome, data.homeCurrency)}</strong>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className={styles.monthlyEmptyState}>
              <img src="/assets/illustrations/mascot-checklist.png" alt="" aria-hidden="true" />
              <strong>{t('expenseHistory.noMonthlyExpensesTitle')}</strong>
              <p>{t('expenseHistory.noMonthlyExpensesDescription')}</p>
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
              <li className={styles.emptySaved} role="alert">{recentExpensesError}</li>
            )}
            {filteredSavedExpenses.slice(0, 2).map((expense) => (
              <li key={expense.expenseId}>
                <span className={styles.expenseIcon}><img src={getCategoryIconPath(expense.iconKey)} alt="" aria-hidden="true" /></span>
                <span><b>{expense.merchantName}</b><small>{expense.spentAt.slice(0, 10).replaceAll('-', '.')}</small></span>
                <strong>{formatCurrencyAmount(expense.convertedAmountHome, data.homeCurrency)}</strong>
              </li>
            ))}
            {!recentExpensesError && filteredSavedExpenses.length === 0 && (
              <li className={styles.emptySaved}>{t('expenseHistory.noRecentExpenses')}</li>
            )}
          </ul>
          <button type="button" onClick={openSavedExpenses}>{t('expenseHistory.more')}</button>
        </section>

      </div>

      <FloatingMascot
        messages={mascotMessages}
        imageSrc="/assets/illustrations/mascot-check.png"
        speechBubbleVariant="twoLine"
        className={styles.lowerMascot}
      />

      {isSavedExpensesOpen && (
        <ModalShell
          title={t('expenseHistory.recentExpenses')}
          titleId="saved-modal-title"
          width="50rem"
          minHeight="35rem"
          dialogClassName={styles.savedModalDialog}
          bodyClassName={styles.savedModalBody}
          showCloseButton={false}
          headerSupplement={(
            <div className={styles.monthPicker}>
              <button
                type="button"
                aria-label={t('expenseHistory.monthSelect')}
                aria-haspopup="listbox"
                aria-expanded={isMonthMenuOpen}
                onClick={() => setIsMonthMenuOpen((open) => !open)}
              >
                <span>{currentYear}.{recentModalMonth.padStart(2, '0')}</span>
                <span className={styles.pickerChevron} aria-hidden="true" />
              </button>
              {isMonthMenuOpen && <div className={styles.monthMenu} role="listbox" aria-label={t('expenseHistory.monthSelect')}>
                {Array.from({ length: 12 }, (_, index) => 12 - index).map((month) => (
                  <button
                    key={month}
                    type="button"
                    role="option"
                    aria-selected={recentModalMonth === String(month)}
                    onClick={() => {
                      setRecentModalMonth(String(month))
                      setIsMonthMenuOpen(false)
                    }}
                  >
                    {currentYear}.{String(month).padStart(2, '0')}
                  </button>
                ))}
              </div>}
            </div>
          )}
          headerActions={(
            <button
              className={`${styles.manageButton} ${isManagingExpenses ? styles.manageButtonActive : ''}`}
              type="button"
              aria-label={isManagingExpenses ? t('expenseHistory.editDone') : t('expenseHistory.edit')}
              onClick={() => {
                setIsManagingExpenses((current) => !current)
                cancelEditingExpenseName()
              }}
            >
              {isManagingExpenses
                ? t('expenseHistory.done')
                : <img src="/assets/icons/actions/action-edit-recent.png" alt="" aria-hidden="true" />}
            </button>
          )}
          onClose={closeSavedExpenses}
        >
          <ul>
              {isModalExpensesLoading && <li className={styles.emptySaved}>{t('expenseHistory.loadingModal')}</li>}
              {!isModalExpensesLoading && modalExpensesError && (
                <li className={styles.emptySaved} role="alert">{modalExpensesError}</li>
              )}
              {!isModalExpensesLoading && !modalExpensesError && filteredModalExpenses.map((expense) => (
                <li
                  key={expense.expenseId}
                  className={isManagingExpenses ? styles.managedExpense : ''}
                >
                  <div className={styles.savedExpenseMain}>
                    <span className={styles.expenseIcon}><img src={getCategoryIconPath(expense.iconKey)} alt="" aria-hidden="true" /></span>
                    <span className={styles.savedExpenseMeta}>
                      {editingExpenseId === expense.expenseId ? (
                        <form
                          className={styles.nameEditForm}
                          onSubmit={(event) => {
                            event.preventDefault()
                            void handleSaveExpenseName(expense)
                          }}
                        >
                          <input
                            type="text"
                            value={editingExpenseName}
                            maxLength={40}
                            aria-label={t('expenseHistory.editName', { name: expense.merchantName })}
                            autoFocus
                            onChange={(event) => setEditingExpenseName(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === 'Escape') cancelEditingExpenseName()
                            }}
                          />
                          <button type="submit" disabled={!editingExpenseName.trim()}>{t('common.save')}</button>
                          <button type="button" onClick={cancelEditingExpenseName}>{t('common.cancel')}</button>
                        </form>
                      ) : (
                        <b>
                          {expense.merchantName}
                          {isManagingExpenses && (
                            <button
                              className={styles.nameEditButton}
                              type="button"
                              aria-label={t('expenseHistory.editName', { name: expense.merchantName })}
                              onClick={() => startEditingExpenseName(expense)}
                            >
                              <img
                                className={styles.nameEditIcon}
                                src="/assets/icons/actions/action-edit-name.png"
                                alt=""
                                aria-hidden="true"
                              />
                            </button>
                          )}
                        </b>
                      )}
                      <small>{expense.spentAt.slice(0, 10).replaceAll('-', '.')}</small>
                    </span>
                  </div>
                  <strong>{formatCurrencyAmount(expense.convertedAmountHome, data.homeCurrency)}</strong>
                  {isManagingExpenses && (
                    <button
                      className={styles.modalDelete}
                      type="button"
                      aria-label={t('expenseHistory.deleteName', { name: expense.merchantName })}
                      onClick={() => handleDeleteExpense(expense.expenseId)}
                    >
                      <img src="/assets/icons/actions/action-delete.png" alt="" aria-hidden="true" />
                    </button>
                  )}
                </li>
              ))}
              {!isModalExpensesLoading && !modalExpensesError && filteredModalExpenses.length === 0 && (
                <li className={styles.emptyModalState}>
                  <img src="/assets/illustrations/mascot-checklist.png" alt="" aria-hidden="true" />
                  <strong>{t('expenseHistory.emptyModal')}</strong>
                  <p>{t('expenseHistory.emptyModalDescription')}</p>
                </li>
              )}
          </ul>
          <button className={styles.closeModalButton} type="button" onClick={closeSavedExpenses}>{t('common.close')}</button>
        </ModalShell>
      )}
    </section>
  )
}

export default ExpenseHistoryPage
