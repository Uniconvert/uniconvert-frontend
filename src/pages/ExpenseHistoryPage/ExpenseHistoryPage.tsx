import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { getExpenseHistory } from '@/api/expenses'
import { ROUTE_PATHS } from '@/routes/routePaths'
import type { ExpenseHistoryData } from '@/types/expense'
import styles from './ExpenseHistoryPage.module.css'

const categoryIconPath = (iconKey: string) => `/assets/icons/categories/category-${iconKey}.png`

function ExpenseHistoryPage() {
  const navigate = useNavigate()
  const [selectedMonth, setSelectedMonth] = useState('7')
  const [recentRange, setRecentRange] = useState('day')
  const [data, setData] = useState<ExpenseHistoryData | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isActive = true

    getExpenseHistory(`2026-${selectedMonth.padStart(2, '0')}`, recentRange)
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
  }, [selectedMonth, recentRange])

  if (errorMessage) return <p role="alert">{errorMessage}</p>
  if (!data) return <p aria-live="polite">지출 내역을 불러오는 중입니다.</p>

  const recentExpenses = data.recentExpenses
  const categorySummary = data.categories

  return (
    <section className={styles.page} aria-labelledby="expense-history-title">
      <h1 id="expense-history-title" className={styles.srOnly}>지출 내역</h1>

      <div className={styles.leftColumn}>
        <section className={styles.assetCard} aria-labelledby="total-assets-title">
          <div className={styles.assetRing} aria-hidden="true" />
          <div className={styles.assetCenter}>
            <h2 id="total-assets-title">총 보유 자산</h2>
            <strong>₩ {data.monthlyBudgetHome.toLocaleString('ko-KR')}</strong>
            <span>{data.yearMonth.replace('-', '.')}</span>
          </div>
          <div className={styles.budgetSummary}>
            <div className={styles.budgetHeader}>
              <span>월 예산 대비</span>
              <strong>{data.budgetUsagePercent}%</strong>
            </div>
            <div className={styles.progressTrack}><span /></div>
            <div className={styles.remainingBudget}>
              <span>남은 예산</span>
              <strong>₩ {data.remainingBudgetHome.toLocaleString('ko-KR')}</strong>
            </div>
          </div>
        </section>

        <section className={styles.recentCard} aria-labelledby="recent-expenses-title">
          <header className={styles.cardHeader}>
            <div>
              <h2 id="recent-expenses-title">최근 지출</h2>
              <span>{recentExpenses.length}개 발견됨</span>
            </div>
            <select value={recentRange} onChange={(event) => setRecentRange(event.target.value)} aria-label="최근 지출 조회 기간">
              <option value="day">일</option>
              <option value="week">주</option>
              <option value="month">월</option>
            </select>
          </header>
          <ul className={styles.recentList}>
            {recentExpenses.map((expense) => (
              <li key={expense.expenseId}>
                <button type="button" onClick={() => navigate(`${ROUTE_PATHS.expenses}/${expense.expenseId}`)} aria-label={`${expense.categoryName} ${expense.convertedAmountHome.toLocaleString('ko-KR')}원 상세 보기`}>
                  <span className={styles.expenseIcon}><img src={categoryIconPath(expense.iconKey)} alt="" aria-hidden="true" /></span>
                  <span>{expense.categoryName}</span>
                  <strong>₩ {expense.convertedAmountHome.toLocaleString('ko-KR')}</strong>
                </button>
              </li>
            ))}
            {recentExpenses.length === 0 && <li>등록된 지출이 없습니다.</li>}
          </ul>
        </section>
      </div>

      <div className={styles.rightColumn}>
        <section className={styles.monthlyCard} aria-labelledby="monthly-expenses-title">
          <header className={styles.monthlyHeader}>
            <h2 id="monthly-expenses-title">이번달 지출</h2>
            <select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} aria-label="지출 조회 월">
              {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => <option key={month} value={month}>{month}월</option>)}
            </select>
          </header>

          <div className={styles.monthlyBody}>
            <div className={styles.donutWrap} aria-label={`총 지출 ${data.monthlyExpenseHome.toLocaleString('ko-KR')}원`}>
              <div className={styles.donut} aria-hidden="true">
                <span className={styles.percent55}>55%</span>
                <span className={styles.percent24}>24%</span>
                <span className={styles.percent10}>10%</span>
                <span className={styles.percent8}>8%</span>
                <span className={styles.percent2}>2%</span>
              </div>
              <div className={styles.donutCenter}>
                <span>총 지출</span>
                <strong>₩ {data.monthlyExpenseHome.toLocaleString('ko-KR')}</strong>
              </div>
            </div>

            <ul className={styles.categorySummary}>
              {categorySummary.map((category) => (
                <li key={category.categoryId}>
                  <span className={styles.categoryName}><i style={{ backgroundColor: category.color }} />{category.categoryName}</span>
                  <span className={styles.categoryPercentage}>{category.percentage}%</span>
                  <strong>₩ {category.amountHome.toLocaleString('ko-KR')}</strong>
                </li>
              ))}
              {categorySummary.length === 0 && <li>카테고리별 지출이 없습니다.</li>}
            </ul>
          </div>
        </section>

        <div className={styles.mascotArea} aria-hidden="true">
          <p>외화와 원화를 함께 관리하세요</p>
          <span className={styles.thoughtSmall} />
          <span className={styles.thoughtLarge} />
          <img src="/assets/illustrations/mascot-check.png" alt="" />
        </div>
      </div>
    </section>
  )
}

export default ExpenseHistoryPage
