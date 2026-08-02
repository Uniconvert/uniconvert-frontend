import { useEffect, useRef, useState } from 'react'
import { getMonthlyReport } from '@/api/reports'
import type { MonthlyReportData } from '@/types/report'

import styles from './ReportPage.module.css'
import FloatingMascot from '@/components/common/FloatingMascot/FloatingMascot'
import Button from '@/components/common/Button/Button'
import { createPortal } from 'react-dom'
import { getEmailReportPreview } from '@/api/emailReports'
import type { EmailReportData } from '@/types/emailReport'
import type { ExpenseHistoryData } from '@/types/expense'
import { convertCurrencyAmount } from '@/utils/exchangeRate'
import todayExpensesMock from '@/mocks/todays-expenses.json'
import { getOnboardingSettings } from '@/auth/session'

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
  selectedDate: string
  selectedMonth: string
  monthlyList: string[]
  onDateChange: (date: string) => void
  onMonthChange: (month: string) => void
  isOpen: boolean
  onToggle: () => void
}

function BarChart({
  titlePrefix,
  titleSuffix,
  data,
  chartClass,
  type,
  selectorText,
  selectedDate,
  selectedMonth,
  monthlyList,
  onDateChange,
  onMonthChange,
  isOpen,
  onToggle,
}: BarChartProps) {
  const [calendarMonth, setCalendarMonth] = useState(() => {
    if (type === 'date' && selectedDate) {
      return selectedDate.slice(0, 7)
    }
    return selectedMonth
  })

  useEffect(() => {
    if (type === 'date' && selectedDate) {
      setCalendarMonth(selectedDate.slice(0, 7))
    }
  }, [selectedDate, type])

  useEffect(() => {
    if (type === 'month' && selectedMonth) {
      setCalendarMonth(selectedMonth)
    }
  }, [selectedMonth, type])

  const [calendarYear, calendarMonthNumber] = calendarMonth.split('-').map(Number)

  const firstWeekday = new Date(calendarYear, calendarMonthNumber - 1, 1).getDay()
  const daysInMonth = new Date(calendarYear, calendarMonthNumber, 0).getDate()

  const moveCalendarMonth = (amount: number) => {
    const next = new Date(calendarYear, calendarMonthNumber - 1 + amount, 1)
    setCalendarMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`)
  }

  const maxAmount = data.length > 0 ? Math.max(...data.map((item) => item.amount)) : 0

  const axisValues = [
    maxAmount,
    Math.round(maxAmount * 0.75),
    Math.round(maxAmount * 0.5),
    Math.round(maxAmount * 0.25),
    0,
  ]

  return (
    <section className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <h2>
          {titlePrefix}
          <span className={styles.highlightTitle}>{titleSuffix}</span>
        </h2>

        {type === 'date' ? (
          <div>
            <button
              type="button"
              className={styles.selectorBtn}
              aria-label="지출 날짜 선택"
              aria-expanded={isOpen}
              onClick={onToggle}
            >
              <span>{selectorText}</span>
              <span className={styles.selectorChevron} aria-hidden="true" />
            </button>
            {isOpen && (
              <div className={styles.calendar} role="dialog" aria-label="날짜 선택">
                <header>
                  <button type="button" aria-label="이전 달" onClick={() => moveCalendarMonth(-1)}>‹</button>
                  <strong>{calendarYear}년 {calendarMonthNumber}월</strong>
                  <button type="button" aria-label="다음 달" onClick={() => moveCalendarMonth(1)}>›</button>
                </header>
                <div className={styles.weekdays}>
                  {['일', '월', '화', '수', '목', '금', '토'].map((day) => <span key={day}>{day}</span>)}
                </div>
                <div className={styles.days}>
                  {Array.from({ length: firstWeekday }, (_, index) => <span key={`blank-${index}`} />)}
                  {Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day) => {
                    const value = `${calendarMonth}-${String(day).padStart(2, '0')}`

                    const isWithinRange = (() => {
                      if (!selectedDate) return false
                      const currentDayDate = new Date(value)
                      const selected = new Date(selectedDate)
                      const startRange = new Date(selected)
                      startRange.setDate(selected.getDate() - 6)

                      return currentDayDate >= startRange && currentDayDate <= selected
                    })()

                    return (
                      <button
                        key={day}
                        type="button"
                        aria-pressed={selectedDate === value}
                        data-in-range={isWithinRange}
                        onClick={() => {
                          onDateChange(value)
                          onToggle()
                        }}
                      >
                        {day}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.monthPicker}>
            <button
              type="button"
              className={styles.selectorBtn}
              onClick={onToggle}
              aria-label="지출 조회 월"
              aria-haspopup="listbox"
              aria-expanded={isOpen}
            >
              <span>{selectorText}</span>
              <span className={styles.selectorChevron} aria-hidden="true" />
            </button>
            {isOpen && (
              <div className={styles.monthMenu} role="listbox" aria-label="지출 조회 월 선택">
                {monthlyList.map((monthStr) => {
                  const formattedMonth = monthStr.replaceAll('-', '.')
                  const isSelected = monthStr === selectedMonth

                  return (
                    <button
                      key={monthStr}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        onMonthChange(monthStr)
                        onToggle()
                      }}
                    >
                      {formattedMonth}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

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
            const isLabelHighlighted = type === 'date' ? index === data.length - 1 : isHighest

            return (
              <div className={styles.barColumn} key={item.label}>
                <div className={styles.barArea}>
                  {isHighest && item.amount > 0 && (
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

  const todayObj = new Date()
  const todayStr = todayObj.toISOString().slice(0, 10)

  const currentYM = todayStr.slice(0, 7)

  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [selectedMonth, setSelectedMonth] = useState(currentYM)

  const [openDropdown, setOpenDropdown] = useState<'date' | 'month' | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
  const [data, setData] = useState<ExpenseHistoryData | null>(null)

  const [summaryMock] = useState({
    changeRate: 5.0,
    comparedDate: '2026-07-25',
  })

  const [, setReportError] = useState('')
  const [, setEmailReport] = useState<EmailReportData | null>(null)

  useEffect(() => {
    if (!isEmailModalOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsEmailModalOpen(false)
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isEmailModalOpen])

  useEffect(() => {
    let isActive = true

    getEmailReportPreview()
      .then((response) => {
        if (isActive) {
          setEmailReport(response)
          setData(response as unknown as ExpenseHistoryData)
        }
      })
      .catch(() => {
        if (isActive) setReportError('이메일 리포트를 불러오지 못했습니다.')
      })

    return () => {
      isActive = false
    }
  }, [])

  const getMascotMessage = (rate: number | null) => {
    if (rate === null) return null
    const absRate = Math.abs(rate)
    const action = rate > 0 ? '증가' : '감소'
    const color = rate > 0 ? '#ff4d4f' : '#1890ff'

    return (
      <span>
        오늘 지출이 어제보다{' '}
        <span style={{ color: color, fontWeight: 'bold' }}>
          {absRate}% {action}
        </span>
        <span>했어요</span>
      </span>
    )
  }

  const monthList: string[] = []
  const [currentY, currentM] = currentYM.split('-').map(Number)
  let tempY = 2026
  let tempM = 1

  while (tempY < currentY || (tempY === currentY && tempM <= currentM)) {
    monthList.push(`${tempY}-${String(tempM).padStart(2, '0')}`)
    tempM++
    if (tempM > 12) {
      tempM = 1
      tempY++
    }
  }
  monthList.reverse()

  const dateReportMonth = selectedDate ? selectedDate.slice(0, 7) : currentYM

  useEffect(() => {
    let isActive = true

    getMonthlyReport(dateReportMonth)
      .then((response) => {
        if (isActive) {
          setReport(response)
        }
      })
      .catch((error) => {
        if (isActive) {
          setErrorMessage(error instanceof Error ? error.message : '리포트를 불러오지 못했습니다.')
        }
      })

    return () => {
      isActive = false
    }
  }, [dateReportMonth])

  useEffect(() => {
    const handleOutsideSelect = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (
        !target.closest(`.${styles.selectorBtn}`) &&
        !target.closest(`.${styles.calendar}`) &&
        !target.closest(`.${styles.monthMenu}`)
      ) {
        setOpenDropdown(null)
      }
    }

    document.addEventListener('click', handleOutsideSelect)
    return () => {
      document.removeEventListener('click', handleOutsideSelect)
    }
  }, [])

  if (errorMessage) {
    return <section className={styles.page}><p role="alert">{errorMessage}</p></section>
  }

  if (!report) {
    return <section className={styles.page} aria-busy="true"><p>리포트를 불러오는 중입니다.</p></section>
  }

  const targetDate = selectedDate || todayStr

  const targetExpenseData = report.dailyExpenses.find(
    (expense) => expense.date === targetDate
  )
  const targetAmount = targetExpenseData ? targetExpenseData.amountHome : 0

  const endDateTime = new Date(targetDate)
  const dateList: string[] = []

  for (let i = 6; i >= 0; i--) {
    const d = new Date(endDateTime)
    d.setDate(endDateTime.getDate() - i)
    dateList.push(d.toISOString().slice(0, 10))
  }

  const timeData = dateList.map((dateStr) => {
    const found = report.dailyExpenses.find((expense) => expense.date === dateStr)
    return {
      label: String(Number(dateStr.slice(8))),
      amount: found ? found.amountHome : 0,
      dateStr,
    }
  })

  const currentSelectedMonth = selectedMonth || currentYM
  const [selYear, selMonthNum] = currentSelectedMonth.split('-').map(Number)
  const fixedMonthList: string[] = []

  for (let i = 6; i >= 0; i--) {
    const d = new Date(selYear, selMonthNum - 1 - i, 1)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    fixedMonthList.push(`${y}-${m}`)
  }

  const rawMonthlyExpenses = report.monthlyExpenses ?? []

  const monthlyData = fixedMonthList.map((monthStr) => {
    const found = rawMonthlyExpenses.find((expense) => expense.yearMonth === monthStr)
    return {
      label: `${Number(monthStr.slice(5))}월`,
      amount: found ? found.amountHome : 0,
    }
  })

  const firstDailyDate = dateList[0]
  const lastDailyDate = targetDate
  const displayYear = currentSelectedMonth.slice(0, 4)

  const userHomeCurrency = report?.homeCurrency || data?.homeCurrency || 'KRW'
  const localCurrencies = getOnboardingSettings().localCurrencies ?? []
  const userLocalCurrency = localCurrencies[0] || 'KRW'

  const currencySymbols: Record<string, string> = {
    KRW: '₩',
    USD: '$',
    EUR: '€',
    JPY: '¥',
    CNY: '¥',
  }

  const localSymbol = currencySymbols[userLocalCurrency] || userLocalCurrency
  const homeSymbol = currencySymbols[userHomeCurrency] || userHomeCurrency

  return (
    <section className={styles.page} ref={containerRef}>
      <div className={styles.pageHeader}>
        <h1>리포트</h1>
        <div className={styles.headerWrapper}>
          <p>나의 지출 흐름을 한눈에 확인해보세요.</p>
          <Button
            variant="primary"
            onClick={() => setIsEmailModalOpen(true)}
            className={styles.emailreportBtn}
          >
            이메일 리포트 <span className={styles.chevronright} aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className={styles.reportContent}>
        <BarChart
          titlePrefix={`${firstDailyDate.slice(5).replace('-', '.')} - ${lastDailyDate.slice(5).replace('-', '.')}`}
          titleSuffix=" 지출"
          data={timeData}
          chartClass={styles.timeBarChart}
          type="date"
          selectorText={lastDailyDate.replaceAll('-', '.')}
          selectedDate={selectedDate}
          selectedMonth={currentSelectedMonth}
          monthlyList={monthList}
          onDateChange={setSelectedDate}
          onMonthChange={() => { }}
          isOpen={openDropdown === 'date'}
          onToggle={() => setOpenDropdown(openDropdown === 'date' ? null : 'date')}
        />

        <BarChart
          titlePrefix={`${displayYear}년`}
          titleSuffix=" 월별 지출"
          data={monthlyData}
          chartClass={styles.monthlyBarChart}
          type="month"
          selectorText={currentSelectedMonth.replaceAll('-', '.')}
          selectedDate={selectedDate}
          selectedMonth={currentSelectedMonth}
          monthlyList={monthList}
          onDateChange={() => { }}
          onMonthChange={setSelectedMonth}
          isOpen={openDropdown === 'month'}
          onToggle={() => setOpenDropdown(openDropdown === 'month' ? null : 'month')}
        />
      </div>

      {isEmailModalOpen && createPortal(
        <div
          className={styles.emailModalBackdrop}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsEmailModalOpen(false)
          }}
        >
          <div className={styles.emailModalWrapper}>
            <img
              className={styles.emailIllustration}
              src="/assets/illustrations/email-report.png"
              alt=""
              aria-hidden="true"
            />

            <div className={styles.emailModalInner}>

              <header className={styles.emailHeader}>
                <h2>
                  {(() => {
                    const [, m, d] = targetDate.split('-')
                    return `${Number(m)}월 ${Number(d)}일 리포트`
                  })()}
                </h2>
                <p>오늘 하루 지출을 정리했어요</p>
              </header>
              <section className={styles.emailListSection}>
                <div className={styles.emailSummary}>
                  <div className={styles.summaryBox}>
                    <span>총 지출 금액</span>
                    <strong className={styles.textBlue}>{localSymbol} {targetAmount.toLocaleString('ko-KR')}</strong>
                    <small>({userHomeCurrency} {Number(convertCurrencyAmount(targetAmount, userLocalCurrency, userHomeCurrency)).toFixed(2)})</small>
                  </div>
                  <div className={styles.summaryArrow}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M13 5L20 12L13 19M5 5L12 12L5 19" stroke="#90b6d9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className={styles.summaryBox}>
                    <span>남은 예산</span>
                    <strong>
                      {homeSymbol} {Number(data?.monthlyBudgetHome ?? 0).toLocaleString('ko-KR')}
                    </strong>
                    <small>(USD {Number(convertCurrencyAmount(data?.monthlyBudgetHome ?? 0, userHomeCurrency, 'USD')).toFixed(2)})</small>
                  </div>
                </div>
              </section>

              <section className={styles.emailListSection}>
                <h3>오늘 지출 내역</h3>
                <ul className={styles.emailTxList}>
                  {todayExpensesMock.data
                    .filter((tx) => tx.date === targetDate)
                    .map((tx) => {
                      const amountNumber = Number(tx.krw.replace(/[^0-9]/g, ''))

                      return (
                        <li key={tx.id}>
                          <div className={styles.txIcon}>
                            <img src={tx.iconUrl} alt={tx.category} width="18" height="18" />
                          </div>
                          <div className={styles.txInfo}>
                            <strong>{tx.title}</strong>
                            <span>{tx.category} • {tx.time}</span>
                          </div>
                          <div className={styles.txAmount}>
                            <strong>{localSymbol} {amountNumber.toLocaleString('ko-KR')}</strong>
                            <span>USD {Number(convertCurrencyAmount(amountNumber, 'KRW', 'USD')).toFixed(2)}</span>
                          </div>
                        </li>
                      )
                    })}
                </ul>
              </section>

              <section className={styles.emailChartSection}>
                <h3>이번 주 지출 흐름</h3>
                <div className={styles.emailChart}>
                  {(() => {
                    const maxTimeAmount = timeData.length > 0 ? Math.max(...timeData.map((item) => item.amount)) : 0

                    return timeData.map((item) => {
                      const isToday = item.dateStr === targetDate

                      return (
                        <div className={styles.chartCol} key={item.dateStr}>
                          <div
                            className={`${styles.chartBar} ${isToday ? styles.barToday : ''} ${item.amount === maxTimeAmount && maxTimeAmount > 0 ? styles.barMax : ''}`}
                            style={{ height: item.amount > 0 ? `${(item.amount / maxTimeAmount) * 100}%` : '0%' }}
                          >
                            {isToday && item.amount > 0 && (
                              <div className={styles.chartTooltip}>
                                {localSymbol} {item.amount.toLocaleString('ko-KR')}
                              </div>
                            )}
                          </div>
                          <span>{item.label}</span>
                        </div>
                      )
                    })
                  })()}
                </div>
              </section>

              <Button className={styles.emailSendBtn} fullWidth>
                <img src="/assets/icons/email.png" alt="" aria-hidden="true" />
                이메일로 리포트 보내기
              </Button>

            </div>
          </div>
        </div>,
        document.body
      )}

      {summaryMock.changeRate !== null && (
        <FloatingMascot
          message={getMascotMessage(summaryMock.changeRate) as any}
          imageSrc="/assets/illustrations/mascot-check.png"
        />
      )}
    </section>
  )
}

export default ReportPage
