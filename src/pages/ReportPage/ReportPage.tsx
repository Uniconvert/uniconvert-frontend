import { useEffect, useState } from 'react'
import { getMonthlyReport } from '@/api/reports'
import type { MonthlyReportData } from '@/types/report'
import { getCurrentYearMonth } from '@/utils/currency'
import styles from './ReportPage.module.css'
import Mascot from '@/components/common/Mascot/Mascot'

interface Expense {
  label: string
  amount: number
}

interface BarChartProps {
  titlePrefix: string
  titleSuffix: string
  data: Expense[]
  chartClass: string
  type: 'date' | 'month'
  selectorText: string
}

function BarChart({
  titlePrefix,
  titleSuffix,
  data,
  chartClass,
  type,
  selectorText,
}: BarChartProps) {
  const [isOpen, setIsOpen] = useState(false)

  const maxAmount = data.length > 0 ? Math.max(...data.map((item) => item.amount)) : 0

  const axisValues = [
    maxAmount,                    // 100%
    Math.round(maxAmount * 0.75), // 75%
    Math.round(maxAmount * 0.5),  // 50%
    Math.round(maxAmount * 0.25), // 25%
    0,                            // 0%
  ]

  return (
    <section className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <h2>
          {titlePrefix}
          <span className={styles.highlightTitle}>{titleSuffix}</span>
        </h2>

        <button
          type="button"
          className={styles.selectorBtn}
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
        >
          {selectorText}
          <span aria-hidden="true" />
        </button>
      </div>

      {isOpen && (
        <div
          className={styles.dropdownBox}
          style={type === 'month' ? { width: '8rem', padding: '1rem 0' } : {}}
        >
          {type === 'date' ? (
            <div>
              <div className={styles.calendarHeader}>
                <div className={styles.calendarTitle}>2026.07</div>
                <div className={styles.calendarNav}>
                  <button type="button">{'<'}</button>
                  <span />
                  <button type="button">{'>'}</button>
                </div>
              </div>

              <div className={styles.calendarGrid}>
                {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
                  <div key={day} className={styles.calendarWeekday}>{day}</div>
                ))}
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={`empty-${i}`} className={styles.calendarDayEmpty} />
                ))}
                {Array.from({ length: 31 }).map((_, i) => {
                  const day = i + 1
                  const isSelected = day >= 1 && day <= 7
                  return (
                    <div
                      key={day}
                      className={`${styles.calendarDay} ${isSelected ? styles.calendarDaySelected : ''
                        }`}
                      onClick={() => setIsOpen(false)}
                    >
                      {day}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className={styles.monthList}>
              {['2026.07', '2026.06', '2026.05', '2026.04', '2026.03'].map((monthStr, index) => {
                const isSelected = index === 0;

                return (
                  <button
                    key={monthStr}
                    type="button"
                    className={`${styles.monthListItem} ${isSelected ? styles.monthListItemSelected : ''}`}
                    onClick={() => setIsOpen(false)}
                  >
                    {monthStr}
                  </button>
                )
              })}

              {/* 더보기 꺾쇠 버튼 */}
              <button
                type="button"
                className={styles.monthListMoreBtn}
                aria-label="이전 달 더보기"
              />
            </div>
          )}
        </div>
      )}
      <div className={styles.chartBody}>
        <div className={styles.axisLabels} aria-hidden="true">
          {axisValues.map((value, index) => (
            <span key={`${value}-${index}`}>{value.toLocaleString('ko-KR')}</span>
          ))}
        </div>

        <div className={chartClass}>
          {data.map((item, index) => {
            const height = maxAmount > 0 ? (item.amount / maxAmount) * 100 : 0

            const isHighest = item.amount === maxAmount && maxAmount > 0

            const isLabelHighlighted = type === 'date'
              ? index === data.length - 1
              : isHighest

            return (
              <div className={styles.barColumn} key={item.label}>
                <div className={styles.barArea}>
                  {isHighest && (
                    <span className={styles.amountTooltip}>
                      ₩ {item.amount.toLocaleString('ko-KR')}
                    </span>
                  )}

                  <span
                    className={`${styles.bar} ${isHighest ? styles.currentBar : ''}`}
                    style={{ height: `${height}%` }}
                    title={`${item.label} ${item.amount.toLocaleString('ko-KR')}원`}
                  />
                </div>

                <span className={isLabelHighlighted ? styles.currentLabel : undefined}>
                  {item.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function ReportPage() {
  const [report, setReport] = useState<MonthlyReportData | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

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

    return () => {
      isActive = false
    }
  }, [])

  if (errorMessage) {
    return <section className={styles.page}><p role="alert">{errorMessage}</p></section>
  }

  if (!report) {
    return <section className={styles.page} aria-busy="true"><p>리포트를 불러오는 중입니다.</p></section>
  }

  const timeData = report.dailyExpenses.map((expense) => ({
    label: String(Number(expense.date.slice(8))),
    amount: expense.amountHome,
  }))
  const monthlyData = report.monthlyExpenses.map((expense) => ({
    label: `${Number(expense.yearMonth.slice(5))}월`,
    amount: expense.amountHome,
  }))
  const firstDailyDate = report.dailyExpenses[0]?.date ?? `${report.yearMonth}-01`
  const lastDailyDate = report.dailyExpenses.at(-1)?.date ?? firstDailyDate
  const year = report.yearMonth.slice(0, 4)

  return (
    <section className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 style={{ color: 'var(--color-primary)' }}>리포트</h1>
        <p>나의 지출 흐름을 한눈에 확인해보세요.</p>
      </div>

      <div className={styles.reportContent}>
        <BarChart
          titlePrefix={`${firstDailyDate.slice(5).replace('-', '/')} - ${lastDailyDate.slice(5).replace('-', '/')}`}
          titleSuffix=" 지출"
          data={timeData}
          chartClass={styles.timeBarChart}
          type="date"
          selectorText={lastDailyDate.replaceAll('-', '.')}
        />

        <BarChart
          titlePrefix={`${year}년`}
          titleSuffix=" 월별 지출"
          data={monthlyData}
          chartClass={styles.monthlyBarChart}
          type="month"
          selectorText={report.yearMonth.replace('-', '.')}
        />
      </div>

      <div className={styles.mascotArea} aria-hidden="true">
        <Mascot
          message="오늘 지출이 어제보다 5% 증가했어요"
          imageSrc="/assets/illustrations/mascot-check.png"
        />
      </div>
    </section>
  )
}

export default ReportPage
