// ReportPage.tsx
import { useState } from 'react'
import styles from './ReportPage.module.css'

interface Expense {
  label: string
  amount: number
}

const timeData: Expense[] = [
  { label: '1', amount: 40000 },
  { label: '2', amount: 70000 },
  { label: '3', amount: 20000 },
  { label: '4', amount: 10000 },
  { label: '5', amount: 30000 },
  { label: '6', amount: 50000 },
  { label: '7', amount: 60000 },
]

const monthlyData: Expense[] = [
  { label: '1월', amount: 1000000 },
  { label: '2월', amount: 800000 },
  { label: '3월', amount: 900000 },
  { label: '4월', amount: 1250000 },
  { label: '5월', amount: 1150000 },
  { label: '6월', amount: 1005000 },
  { label: '7월', amount: 1050000 },
]

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
                      className={`${styles.calendarDay} ${
                        isSelected ? styles.calendarDaySelected : ''
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
  return (
    <section className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 style={{ color: 'var(--color-primary)' }}>리포트</h1>
        <p>나의 지출 흐름을 한눈에 확인해보세요.</p>
      </div>

      <div className={styles.reportContent}>
        <BarChart
          titlePrefix="07/01 - 07/07"
          titleSuffix=" 지출"
          data={timeData}
          chartClass={styles.timeBarChart}
          type="date"
          selectorText="2026.07.07"
        />

        <BarChart
          titlePrefix="2026년"
          titleSuffix=" 월별 지출"
          data={monthlyData}
          chartClass={styles.monthlyBarChart}
          type="month"
          selectorText="2026.07"
        />
      </div>

      <div className={styles.mascotArea} aria-hidden="true">
        <p>오늘 지출이 어제보다 5% 증가했어요</p>
        <span className={styles.thoughtSmall} />
        <span className={styles.thoughtLarge} />
        <img src="/assets/illustrations/mascot-check.png" alt="" />
      </div>
    </section>
  )
}

export default ReportPage