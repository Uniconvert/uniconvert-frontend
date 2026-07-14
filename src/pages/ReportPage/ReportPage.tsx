import { useState } from 'react'
import Button from '@/components/common/Button/Button'
import styles from './ReportPage.module.css'

interface MonthlyExpense {
  month: string
  amount: number
  isCurrent?: boolean
}

interface CategoryExpense {
  id: string
  label: string
  amount: number
  ratio: number
  iconSrc: string
}

// TODO: Swagger 연동 후 월별·카테고리별 리포트 응답으로 교체합니다.
const monthlyExpenses: MonthlyExpense[] = [
  { month: '1월', amount: 1850000 },
  { month: '2월', amount: 2200000 },
  { month: '3월', amount: 2000000 },
  { month: '4월', amount: 2500000 },
  { month: '5월', amount: 2200000 },
  { month: '6월', amount: 1455000, isCurrent: true },
]

const categoryExpenses: CategoryExpense[] = [
  { id: 'food', label: '식비', amount: 350000, ratio: 30, iconSrc: '/assets/icons/categories/category-food.png' },
  { id: 'transport', label: '교통', amount: 120000, ratio: 10, iconSrc: '/assets/icons/categories/category-transport.png' },
  { id: 'education', label: '학비', amount: 150000, ratio: 13, iconSrc: '/assets/icons/categories/category-education.png' },
  { id: 'travel', label: '여행', amount: 800000, ratio: 72, iconSrc: '/assets/icons/categories/category-travel.png' },
  { id: 'medical', label: '의료', amount: 35000, ratio: 3, iconSrc: '/assets/icons/categories/category-medical.png' },
]

const chartMaximum = 2750000

function CategoryList({ compact = false }: { compact?: boolean }) {
  return (
    <ul className={`${styles.categoryList} ${compact ? styles.compactCategoryList : ''}`}>
      {categoryExpenses.map((category) => (
        <li key={category.id}>
          <span className={styles.categoryIcon}>
            <img src={category.iconSrc} alt="" aria-hidden="true" />
          </span>
          <span className={styles.categoryInfo}>
            <span className={styles.categoryHeading}>
              <b>{category.label}</b>
              <strong>₩ {category.amount.toLocaleString('ko-KR')}</strong>
            </span>
            <span className={styles.progressTrack} aria-hidden="true">
              <i style={{ width: `${category.ratio}%` }} />
            </span>
          </span>
        </li>
      ))}
    </ul>
  )
}

function ReportPage() {
  const [sendMessage, setSendMessage] = useState('')

  const handleSendReport = () => {
    setSendMessage('이메일 리포트 전송을 요청했습니다.')
    // TODO: Swagger 이메일 리포트 전송 API를 연결합니다.
  }

  return (
    <section className={styles.page} aria-labelledby="report-title">
      <h1 id="report-title">리포트</h1>

      <div className={styles.reportContent}>
        <section className={styles.chartCard} aria-labelledby="monthly-chart-title">
          <h2 id="monthly-chart-title">월별 지출 추이</h2>
          <div className={styles.chartBody}>
            <div className={styles.axisLabels} aria-hidden="true">
              <span>2,200,000</span>
              <span>1,650,000</span>
              <span>1,100,000</span>
              <span>550,000</span>
              <span>0</span>
            </div>
            <div className={styles.barChart}>
              {monthlyExpenses.map((expense) => (
                <div className={styles.barColumn} key={expense.month}>
                  <span
                    className={`${styles.bar} ${expense.isCurrent ? styles.currentBar : ''}`}
                    style={{ height: `${(expense.amount / chartMaximum) * 100}%` }}
                    title={`${expense.month} ${expense.amount.toLocaleString('ko-KR')}원`}
                  />
                  <span className={expense.isCurrent ? styles.currentMonth : undefined}>{expense.month}</span>
                </div>
              ))}
            </div>
          </div>
          <p className={styles.srOnly}>
            {monthlyExpenses.map((expense) => `${expense.month} ${expense.amount.toLocaleString('ko-KR')}원`).join(', ')}
          </p>
        </section>

        <section className={styles.categoryCard} aria-labelledby="category-report-title">
          <h2 id="category-report-title">카테고리별 지출</h2>
          <CategoryList />
        </section>
      </div>

      <aside className={styles.previewPanel} aria-label="이메일 리포트 미리보기">
        <img className={styles.emailIllustration} src="/assets/illustrations/email-report.png" alt="" aria-hidden="true" />
        <section className={styles.previewCard}>
          <h2>리포트 미리보기</h2>
          <p className={styles.reportMonth}>2026.06</p>
          <div className={styles.reportTotal}>
            <span>총 지출 금액</span>
            <strong>₩ 1,455,000</strong>
          </div>
          <hr />
          <h3>카테고리별 지출</h3>
          <CategoryList compact />
          <Button className={styles.sendButton} fullWidth onClick={handleSendReport}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m4 7 8 6 8-6" />
            </svg>
            이메일로 리포트 보내기
          </Button>
          <p className={styles.sendStatus} role="status">{sendMessage}</p>
        </section>
      </aside>
    </section>
  )
}

export default ReportPage
