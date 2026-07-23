import { useEffect, useMemo, useState } from 'react'
import { getMonthlyReport, sendMonthlyReport } from '@/api/reports'
import Button from '@/components/common/Button/Button'
import type { MonthlyReportData, ReportCategory } from '@/types/report'
import { formatCurrencyAmount, getCurrentYearMonth } from '@/utils/currency'
import styles from './ReportPage.module.css'

function CategoryList({ categories, currency, compact = false }: { categories: ReportCategory[]; currency: string; compact?: boolean }) {
  return (
    <ul className={`${styles.categoryList} ${compact ? styles.compactCategoryList : ''}`}>
      {categories.map((category) => (
        <li key={category.categoryId}>
          <span className={styles.categoryIcon}>
            <img src={`/assets/icons/categories/category-${category.iconKey}.png`} alt="" aria-hidden="true" />
          </span>
          <span className={styles.categoryInfo}>
            <span className={styles.categoryHeading}>
              <b>{category.name}</b>
              <strong>{formatCurrencyAmount(category.amountHome, currency)}</strong>
            </span>
            <span className={styles.progressTrack} aria-hidden="true">
              <i style={{ width: `${category.percent}%` }} />
            </span>
          </span>
        </li>
      ))}
    </ul>
  )
}

function ReportPage() {
  const [report, setReport] = useState<MonthlyReportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [sendMessage, setSendMessage] = useState('')
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    let isActive = true

    getMonthlyReport(getCurrentYearMonth())
      .then((response) => {
        if (isActive) setReport(response)
      })
      .catch((error) => {
        if (isActive) {
          setErrorMessage(error instanceof Error ? error.message : '리포트를 불러오지 못했습니다.')
        }
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [])

  const chartMaximum = useMemo(() => {
    const maximum = Math.max(...(report?.monthlyExpenses.map((expense) => expense.amountHome) ?? [0]))
    return maximum > 0 ? maximum * 1.1 : 1
  }, [report])

  const axisLabels = useMemo(
    () => [0.8, 0.6, 0.4, 0.2, 0].map((ratio) => Math.round(chartMaximum * ratio)),
    [chartMaximum],
  )

  const handleSendReport = async () => {
    if (!report || isSending) return

    setIsSending(true)
    setSendMessage('')

    try {
      await sendMonthlyReport(report.yearMonth)
      setSendMessage('이메일 리포트 전송을 요청했습니다.')
    } catch (error) {
      setSendMessage(error instanceof Error ? error.message : '리포트 전송에 실패했습니다.')
    } finally {
      setIsSending(false)
    }
  }

  if (isLoading) {
    return (
      <section className={styles.page} aria-busy="true">
        <h1>리포트</h1>
        <p>리포트를 불러오는 중입니다.</p>
      </section>
    )
  }

  if (errorMessage || !report) {
    return (
      <section className={styles.page}>
        <h1>리포트</h1>
        <p role="alert">{errorMessage || '리포트 데이터가 없습니다.'}</p>
      </section>
    )
  }

  return (
    <section className={styles.page} aria-labelledby="report-title">
      <h1 id="report-title">리포트</h1>

      <div className={styles.reportContent}>
        <section className={styles.chartCard} aria-labelledby="monthly-chart-title">
          <h2 id="monthly-chart-title">월별 지출 추이</h2>
          <div className={styles.chartBody}>
            <div className={styles.axisLabels} aria-hidden="true">
              {axisLabels.map((label) => <span key={label}>{label.toLocaleString('ko-KR')}</span>)}
            </div>
            <div className={styles.barChart}>
              {report.monthlyExpenses.map((expense) => {
                const month = `${Number(expense.yearMonth.slice(5))}월`
                const isCurrent = expense.yearMonth === report.yearMonth

                return (
                  <div className={styles.barColumn} key={expense.yearMonth}>
                    <span
                      className={`${styles.bar} ${isCurrent ? styles.currentBar : ''}`}
                      style={{ height: `${(expense.amountHome / chartMaximum) * 100}%` }}
                      title={`${month} ${expense.amountHome.toLocaleString('ko-KR')}원`}
                    />
                    <span className={isCurrent ? styles.currentMonth : undefined}>{month}</span>
                  </div>
                )
              })}
            </div>
          </div>
          <p className={styles.srOnly}>
            {report.monthlyExpenses.map((expense) => `${Number(expense.yearMonth.slice(5))}월 ${expense.amountHome.toLocaleString('ko-KR')}원`).join(', ')}
          </p>
        </section>

        <section className={styles.categoryCard} aria-labelledby="category-report-title">
          <h2 id="category-report-title">카테고리별 지출</h2>
          <CategoryList categories={report.categoryBreakdown} currency={report.homeCurrency} />
        </section>
      </div>

      <aside className={styles.previewPanel} aria-label="이메일 리포트 미리보기">
        <img className={styles.emailIllustration} src="/assets/illustrations/email-report.png" alt="" aria-hidden="true" />
        <section className={styles.previewCard}>
          <h2>리포트 미리보기</h2>
          <p className={styles.reportMonth}>{report.yearMonth.replace('-', '.')}</p>
          <div className={styles.reportTotal}>
            <span>총 지출 금액</span>
            <strong>{formatCurrencyAmount(report.totalExpenseHome, report.homeCurrency)}</strong>
          </div>
          <hr />
          <h3>카테고리별 지출</h3>
          <CategoryList categories={report.categoryBreakdown} currency={report.homeCurrency} compact />
          <Button
            className={styles.sendButton}
            fullWidth
            onClick={handleSendReport}
            disabled={isSending}
            isLoading={isSending}
          >
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
