import { useEffect, useState } from 'react'
import { deleteSavedExpense, getExpenseHistory, getSavedExpenses, updateSavedExpenseOrder } from '@/api/expenses'
import ModalShell from '@/components/common/ModalShell/ModalShell'
import type { ExpenseHistoryData, SavedExpense } from '@/types/expense'
import { formatCurrencyAmount, getCurrentYearMonth } from '@/utils/currency'
import { getCategoryIconPath } from '@/utils/categoryIcon'
import styles from './ExpenseHistoryPage.module.css'
import FloatingMascot from '@/components/common/FloatingMascot/FloatingMascot'

const recentRangeOptions = [
  { value: 'day', label: '일' },
  { value: 'week', label: '주' },
  { value: 'month', label: '월' },
]

function ExpenseHistoryPage() {
  const currentYear = getCurrentYearMonth().slice(0, 4)
  const [selectedMonth, setSelectedMonth] = useState(() => String(Number(getCurrentYearMonth().slice(5))))
  const [recentRange, setRecentRange] = useState('day')
  const [isRecentRangeOpen, setIsRecentRangeOpen] = useState(false)
  const [isMonthlyPickerOpen, setIsMonthlyPickerOpen] = useState(false)
  const [data, setData] = useState<ExpenseHistoryData | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [isSavedExpensesOpen, setIsSavedExpensesOpen] = useState(false)
  const [isManagingExpenses, setIsManagingExpenses] = useState(false)
  const [isMonthMenuOpen, setIsMonthMenuOpen] = useState(false)
  const [savedExpenses, setSavedExpenses] = useState<SavedExpense[]>([])
  const [draggedExpenseId, setDraggedExpenseId] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true

    getExpenseHistory(`${currentYear}-${selectedMonth.padStart(2, '0')}`, recentRange)
      .then((response) => {
        if (isActive) {
          setData(response)
          setErrorMessage('')
        }
      })
      .catch(() => {
        if (isActive) setErrorMessage('지출 내역을 불러오지 못했습니다.')
      })

    return () => {
      isActive = false
    }
  }, [currentYear, selectedMonth, recentRange])

  useEffect(() => {
    getSavedExpenses().then(setSavedExpenses)
  }, [])

  const handleDeleteExpense = async (expenseId: string) => {
    const deleted = await deleteSavedExpense(expenseId)
    if (deleted) setSavedExpenses((current) => current.filter((expense) => expense.expenseId !== expenseId))
  }

  const filteredSavedExpenses = savedExpenses.filter((expense) => expense.spentAt.startsWith(`${currentYear}-${selectedMonth.padStart(2, '0')}`))

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

  if (errorMessage) return <p role="alert">{errorMessage}</p>
  if (!data) return <p aria-live="polite">지출 내역을 불러오는 중입니다.</p>

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
      <h1 id="expense-history-title" className={styles.srOnly}>지출 내역</h1>

      <div className={styles.leftColumn}>
        <section className={styles.assetCard} aria-labelledby="total-assets-title">
          <img className={styles.assetRing} src="/assets/illustrations/asset-ring.png" alt="" aria-hidden="true" />
          <div className={styles.assetCenter}>
            <h2 id="total-assets-title">총 보유 자산</h2>
            <strong>{formatCurrencyAmount(data.monthlyBudgetHome, data.homeCurrency)}</strong>
            <span>{data.yearMonth.replace('-', '.')}</span>
          </div>
          <div className={styles.budgetSummary}>
            <div className={styles.budgetHeader}>
              <span>월 예산 대비</span>
              <strong>{data.budgetUsagePercent}%</strong>
            </div>
            <div className={styles.progressTrack}><span style={{ width: `${Math.min(data.budgetUsagePercent, 100)}%` }} /></div>
            <div className={styles.remainingBudget}>
              <span>남은 예산</span>
              <strong>{formatCurrencyAmount(data.remainingBudgetHome, data.homeCurrency)}</strong>
            </div>
          </div>
        </section>

        <section className={styles.recentCard} aria-labelledby="recent-expenses-title">
          <header className={styles.cardHeader}>
            <div>
              <h2 id="recent-expenses-title">저장된 지출</h2>
              <span>{recentExpenses.length}개 카테고리</span>
            </div>
            <div className={styles.rangePicker}>
              <button
                type="button"
                aria-label="저장된 지출 조회 기간"
                aria-haspopup="listbox"
                aria-expanded={isRecentRangeOpen}
                onClick={() => setIsRecentRangeOpen((open) => !open)}
              >
                <span>{recentRangeOptions.find((option) => option.value === recentRange)?.label}</span>
                <span className={styles.pickerChevron} aria-hidden="true" />
              </button>
              {isRecentRangeOpen && (
                <div className={styles.rangeMenu} role="listbox" aria-label="저장된 지출 조회 기간 목록">
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
                      {option.label}
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
            {recentExpenses.length === 0 && <li>해당 기간에 저장된 지출이 없습니다.</li>}
          </ul>
        </section>
      </div>

      <div className={styles.rightColumn}>
        <section className={styles.monthlyCard} aria-labelledby="monthly-expenses-title">
          <header className={styles.monthlyHeader}>
            <h2 id="monthly-expenses-title">이번달 지출</h2>
            <div className={styles.monthlyPicker}>
              <button
                type="button"
                aria-label="지출 조회 월"
                aria-haspopup="listbox"
                aria-expanded={isMonthlyPickerOpen}
                onClick={() => setIsMonthlyPickerOpen((open) => !open)}
              >
                <span>{selectedMonth}월</span>
                <span className={styles.pickerChevron} aria-hidden="true" />
              </button>
              {isMonthlyPickerOpen && (
                <div className={styles.monthlyMenu} role="listbox" aria-label="지출 조회 월 목록">
                  {Array.from({ length: 12 }, (_, index) => String(index + 1)).map((month) => (
                    <button
                      key={month}
                      type="button"
                      role="option"
                      aria-selected={selectedMonth === month}
                      onClick={() => {
                        setSelectedMonth(month)
                        setIsMonthlyPickerOpen(false)
                      }}
                    >
                      {month}월
                    </button>
                  ))}
                </div>
              )}
            </div>
          </header>

          <div className={styles.monthlyBody}>
            <div className={styles.donutWrap} aria-label={`총 지출 ${data.monthlyExpenseHome.toLocaleString('ko-KR')}원`}>
              <svg className={styles.donut} viewBox="0 0 272 272" aria-hidden="true">
                {donutSegments.map((segment) => (
                  <g key={segment.categoryId}>
                    <circle cx="136" cy="136" r="96" pathLength="100" fill="none" stroke={segment.color} strokeWidth="70" strokeDasharray={`${segment.percentage} ${100 - segment.percentage}`} strokeDashoffset={-segment.start} transform="rotate(-90 136 136)" />
                    {segment.percentage >= 2 && <text x={segment.labelX} y={segment.labelY} textAnchor="middle" dominantBaseline="middle" fill={segment.color === '#e2efff' || segment.color === '#a9cbfa' ? '#366894' : '#fff'}>{Math.round(segment.percentage)}%</text>}
                  </g>
                ))}
              </svg>
              <div className={styles.donutCenter}>
                <span>총 지출</span>
                <strong>{formatCurrencyAmount(data.monthlyExpenseHome, data.homeCurrency)}</strong>
              </div>
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
            {filteredSavedExpenses.slice(0, 2).map((expense) => (
              <li key={expense.expenseId}>
                <span className={styles.expenseIcon}><img src={getCategoryIconPath(expense.iconKey)} alt="" aria-hidden="true" /></span>
                <span><b>{expense.merchantName}</b><small>{expense.spentAt.slice(0, 10).replaceAll('-', '.')}</small></span>
                <strong>{formatCurrencyAmount(expense.convertedAmountHome, data.homeCurrency)}</strong>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => setIsSavedExpensesOpen(true)}>더보기</button>
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
                <span>{currentYear}.{selectedMonth.padStart(2, '0')}</span>
                <span className={styles.pickerChevron} aria-hidden="true" />
              </button>
              {isMonthMenuOpen && <div className={styles.monthMenu} role="listbox" aria-label="최근 지출 조회 월">
                {Array.from({ length: 12 }, (_, index) => 12 - index).map((month) => (
                  <button key={month} type="button" role="option" aria-selected={selectedMonth === String(month)} onClick={() => { setSelectedMonth(String(month)); setIsMonthMenuOpen(false) }}>{currentYear}.{String(month).padStart(2, '0')}</button>
                ))}
              </div>}
            </div>
          )}
          headerActions={(
            <button
              className={`${styles.manageButton} ${isManagingExpenses ? styles.manageButtonActive : ''}`}
              type="button"
              aria-label={isManagingExpenses ? '편집 완료' : '최근 지출 편집'}
              onClick={() => setIsManagingExpenses((current) => !current)}
            >
              {isManagingExpenses ? '완료 ×' : '✎'}
            </button>
          )}
          onClose={() => setIsSavedExpensesOpen(false)}
        >
          <ul>
              {filteredSavedExpenses.map((expense) => (
                <li key={expense.expenseId} draggable={isManagingExpenses} className={draggedExpenseId === expense.expenseId ? styles.dragging : ''} onDragStart={() => setDraggedExpenseId(expense.expenseId)} onDragOver={(event) => event.preventDefault()} onDrop={() => handleDrop(expense.expenseId)} onDragEnd={() => setDraggedExpenseId(null)}>
                  {isManagingExpenses && <span className={styles.dragHandle} title="드래그하여 순서 변경" aria-hidden="true">⠿</span>}
                  <button type="button" className={styles.savedExpenseMain}>
                    <span className={styles.expenseIcon}><img src={getCategoryIconPath(expense.iconKey)} alt="" aria-hidden="true" /></span>
                    <span><b>{expense.merchantName}{isManagingExpenses && <i aria-hidden="true">✎</i>}</b><small>{expense.spentAt.slice(0, 10).replaceAll('-', '.')}</small></span>
                  </button>
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
              {filteredSavedExpenses.length === 0 && <li className={styles.emptySaved}>최근 지출이 없습니다.</li>}
          </ul>
          <button className={styles.closeModalButton} type="button" onClick={() => setIsSavedExpensesOpen(false)}>닫기</button>
        </ModalShell>
      )}
    </section>
  )
}

export default ExpenseHistoryPage
