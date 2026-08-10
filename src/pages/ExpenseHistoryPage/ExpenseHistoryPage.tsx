import { useState } from 'react'
import {
  deleteSavedExpense,
  isUsingMockExpenseReadApi,
  updateSavedExpenseName,
  updateSavedExpenseOrder,
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
  const { t } = useI18n()
  const currentYear = getCurrentYearMonth().slice(0, 4)
  const selectedMonth = String(Number(getCurrentYearMonth().slice(5)))
  const [recentRange, setRecentRange] = useState('day')
  const [isRecentRangeOpen, setIsRecentRangeOpen] = useState(false)
  const [isSavedExpensesOpen, setIsSavedExpensesOpen] = useState(false)
  const [isManagingExpenses, setIsManagingExpenses] = useState(false)
  const [isMonthMenuOpen, setIsMonthMenuOpen] = useState(false)
  const [recentModalMonth, setRecentModalMonth] = useState(() => String(Number(getCurrentYearMonth().slice(5))))
  const [draggedExpenseId, setDraggedExpenseId] = useState<string | null>(null)
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
      showToast({ variant: 'success', title: '지출을 삭제했어요' })
      retry()
    } catch (error) {
      showToast({
        variant: 'error',
        ...getApiErrorNotice(error, '지출을 삭제하지 못했습니다.'),
      })
    }
  }

  const filteredSavedExpenses = savedExpenses.filter((expense) => expense.spentAt.startsWith(`${currentYear}-${selectedMonth.padStart(2, '0')}`))
  const filteredModalExpenses = isUsingMockExpenseReadApi
    ? savedExpenses.filter((expense) => expense.spentAt.startsWith(`${currentYear}-${recentModalMonth.padStart(2, '0')}`))
    : modalExpenses

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
      showToast({ variant: 'success', title: '수정되었어요' })
    } catch (error) {
      showToast({
        variant: 'error',
        ...getApiErrorNotice(error, '지출 내역을 수정하지 못했습니다.'),
      })
    }
  }

  const handleDrop = async (targetExpenseId: string) => {
    if (!draggedExpenseId || draggedExpenseId === targetExpenseId) return
    const sourceIndex = savedExpenses.findIndex((expense) => expense.expenseId === draggedExpenseId)
    const targetIndex = savedExpenses.findIndex((expense) => expense.expenseId === targetExpenseId)
    if (sourceIndex < 0 || targetIndex < 0) return
    const reordered = [...savedExpenses]
    const [moved] = reordered.splice(sourceIndex, 1)
    reordered.splice(targetIndex, 0, moved)
    setSavedExpenses(reordered)
    setDraggedExpenseId(null)
    await updateSavedExpenseOrder(reordered)
  }

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
                  <span>{expense.categoryName}</span>
                  <strong>{formatCurrencyAmount(expense.convertedAmountHome, data.homeCurrency)}</strong>
                </div>
              </li>
            ))}
            {recentExpenses.length === 0 && <li>해당 기간에 카테고리별 지출이 없습니다.</li>}
          </ul>
        </section>
      </div>

      <div className={styles.rightColumn}>
        <section className={styles.monthlyCard} aria-labelledby="monthly-expenses-title">
          <header className={styles.monthlyHeader}>
            <h2 id="monthly-expenses-title">이번달 지출</h2>
          </header>

          <div className={styles.monthlyBody}>
            <div className={styles.donutWrap} aria-label={data.monthlyExpenseHome > 0 ? `총 지출 ${data.monthlyExpenseHome.toLocaleString('ko-KR')}원` : '지출 내역 없음'}>
              <svg className={styles.donut} viewBox="0 0 272 272" aria-hidden="true">
                {donutSegments.map((segment) => (
                  <g key={segment.categoryId}>
                    <circle cx="136" cy="136" r="96" pathLength="100" fill="none" stroke={segment.color} strokeWidth="70" strokeDasharray={`${segment.percentage} ${100 - segment.percentage}`} strokeDashoffset={-segment.start} transform="rotate(-90 136 136)" />
                    {segment.percentage >= 2 && <text x={segment.labelX} y={segment.labelY} textAnchor="middle" dominantBaseline="middle" fill={segment.color === '#e2efff' || segment.color === '#a9cbfa' ? '#366894' : '#fff'}>{Math.round(segment.percentage)}%</text>}
                  </g>
                ))}
              </svg>
              {data.monthlyExpenseHome > 0 && (
                <div className={styles.donutCenter}>
                  <span>총 지출</span>
                  <strong>{formatCurrencyAmount(data.monthlyExpenseHome, data.homeCurrency)}</strong>
                </div>
              )}
            </div>

            <ul className={styles.categorySummary}>
              {categorySummary.map((category) => (
                <li key={category.categoryId}>
                  <span className={styles.categoryName}><i style={{ backgroundColor: category.color }} />{category.categoryName}</span>
                  <span className={styles.categoryPercentage}>{category.percentage}%</span>
                  <strong>{formatCurrencyAmount(category.amountHome, data.homeCurrency)}</strong>
                </li>
              ))}
              {categorySummary.length === 0 && <li>카테고리별 지출이 없습니다.</li>}
            </ul>
          </div>
        </section>

        <section className={styles.savedCard} aria-labelledby="saved-expenses-title">
          <header>
            <h2 id="saved-expenses-title">최근 지출</h2>
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
              <li className={styles.emptySaved}>최근 지출이 없습니다.</li>
            )}
          </ul>
          <button type="button" onClick={openSavedExpenses}>더보기</button>
        </section>

        <FloatingMascot
            message="외화와 원화를 함께 관리하세요"
            imageSrc="/assets/illustrations/mascot-check.png"
        />
        
      </div>

      {isSavedExpensesOpen && (
        <ModalShell
          title="최근 지출"
          titleId="saved-modal-title"
          width="50rem"
          bodyClassName={styles.savedModalBody}
          showCloseButton={false}
          headerSupplement={(
            <div className={styles.monthPicker}>
              <button
                type="button"
                aria-label="최근 지출 조회 월"
                aria-haspopup="listbox"
                aria-expanded={isMonthMenuOpen}
                onClick={() => setIsMonthMenuOpen((open) => !open)}
              >
                <span>{currentYear}.{recentModalMonth.padStart(2, '0')}</span>
                <span className={styles.pickerChevron} aria-hidden="true" />
              </button>
              {isMonthMenuOpen && <div className={styles.monthMenu} role="listbox" aria-label="최근 지출 조회 월">
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
              aria-label={isManagingExpenses ? '편집 완료' : '최근 지출 편집'}
              onClick={() => {
                setIsManagingExpenses((current) => !current)
                cancelEditingExpenseName()
              }}
            >
              {isManagingExpenses
                ? '완료 ×'
                : <img src="/assets/icons/actions/action-edit-recent.png" alt="" aria-hidden="true" />}
            </button>
          )}
          onClose={closeSavedExpenses}
        >
          <ul>
              {isModalExpensesLoading && <li className={styles.emptySaved}>불러오는 중입니다.</li>}
              {!isModalExpensesLoading && modalExpensesError && (
                <li className={styles.emptySaved} role="alert">{modalExpensesError}</li>
              )}
              {!isModalExpensesLoading && !modalExpensesError && filteredModalExpenses.map((expense) => (
                <li
                  key={expense.expenseId}
                  draggable={isUsingMockExpenseReadApi && isManagingExpenses && editingExpenseId !== expense.expenseId}
                  className={[
                    isManagingExpenses ? styles.managedExpense : '',
                    draggedExpenseId === expense.expenseId ? styles.dragging : '',
                  ].filter(Boolean).join(' ')}
                  onDragStart={() => setDraggedExpenseId(expense.expenseId)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => handleDrop(expense.expenseId)}
                  onDragEnd={() => setDraggedExpenseId(null)}
                >
                  {isUsingMockExpenseReadApi && isManagingExpenses && <span className={styles.dragHandle} title="드래그하여 순서 변경" aria-hidden="true">⠿</span>}
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
                            aria-label={`${expense.merchantName} 이름 수정`}
                            autoFocus
                            onChange={(event) => setEditingExpenseName(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === 'Escape') cancelEditingExpenseName()
                            }}
                          />
                          <button type="submit" disabled={!editingExpenseName.trim()}>저장</button>
                          <button type="button" onClick={cancelEditingExpenseName}>취소</button>
                        </form>
                      ) : (
                        <b>
                          {expense.merchantName}
                          {isUsingMockExpenseReadApi && isManagingExpenses && (
                            <button
                              className={styles.nameEditButton}
                              type="button"
                              aria-label={`${expense.merchantName} 이름 수정`}
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
                      aria-label={`${expense.merchantName} 삭제`}
                      onClick={() => handleDeleteExpense(expense.expenseId)}
                    >
                      <img src="/assets/icons/actions/action-delete.png" alt="" aria-hidden="true" />
                    </button>
                  )}
                </li>
              ))}
              {!isModalExpensesLoading && !modalExpensesError && filteredModalExpenses.length === 0 && (
                <li className={styles.emptySaved}>최근 지출이 없습니다.</li>
              )}
          </ul>
          <button className={styles.closeModalButton} type="button" onClick={closeSavedExpenses}>닫기</button>
        </ModalShell>
      )}
    </section>
  )
}

export default ExpenseHistoryPage
