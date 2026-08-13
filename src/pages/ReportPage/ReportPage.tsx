import { useEffect, useRef, useState, useMemo } from 'react'
import { sendMonthlyReport } from '@/api/reports'
import { getExpensePage } from '@/api/expenses'

import styles from './ReportPage.module.css'
import FloatingMascot from '@/components/common/FloatingMascot/FloatingMascot'
import Button from '@/components/common/Button/Button'
import Toast from '@/components/common/Toast/Toast'
import { useToastQueue } from '@/components/common/Toast/useToastQueue'
import { createPortal } from 'react-dom'
import { convertCurrencyAmount } from '@/utils/exchangeRate'
import { getOnboardingSettings } from '@/auth/session'
import { getApiErrorNotice } from '@/utils/apiError'
import { useMonthlyReportData } from '@/hooks/useMonthlyReportData'
import { getCategoryIconPath } from '@/utils/categoryIcon'
import type { ExpenseListItemDto } from '@/types/expense'
import { useI18n } from '@/i18n/I18nContext'

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
  const { locale, t } = useI18n()
  const initialCalendarMonth = (() => {
    if (type === 'date' && selectedDate) {
      return selectedDate.slice(0, 7)
    }
    return selectedMonth
  })()

  const [calendarMonth, setCalendarMonth] = useState(initialCalendarMonth)

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
              aria-label={t('report.dateSelect')}
              aria-expanded={isOpen}
              onClick={onToggle}
            >
              <span>{selectorText}</span>
              <span className={styles.selectorChevron} aria-hidden="true" />
            </button>
            {isOpen && (
              <div className={styles.calendar} role="dialog" aria-label={t('report.calendar')}>
                <header>
                  <button type="button" aria-label={t('report.previousMonth')} onClick={() => moveCalendarMonth(-1)}>‹</button>
                  <strong>{new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' }).format(new Date(calendarYear, calendarMonthNumber - 1, 1))}</strong>
                  <button type="button" aria-label={t('report.nextMonth')} onClick={() => moveCalendarMonth(1)}>›</button>
                </header>
                <div className={styles.weekdays}>
                  {['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map((day) => <span key={day}>{t(`calendar.weekday.${day}`)}</span>)}
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
              aria-label={t('report.monthSelect')}
              aria-haspopup="listbox"
              aria-expanded={isOpen}
            >
              <span>{selectorText}</span>
              <span className={styles.selectorChevron} aria-hidden="true" />
            </button>
            {isOpen && (
              <div className={styles.monthMenu} role="listbox" aria-label={t('report.monthSelect')}>
                {monthlyList.map((monthStr) => {
                  const [year, month] = monthStr.split('-').map(Number)
                  const formattedMonth = new Intl.DateTimeFormat(locale, { year: 'numeric', month: '2-digit' })
                    .format(new Date(year, month - 1, 1))
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
            <span key={`${value}-${index}`}>{value.toLocaleString(locale)}</span>
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
                      ₩ {item.amount.toLocaleString(locale)}
                    </span>
                  )}

                  <span
                    className={`${styles.bar} ${isHighest ? styles.currentBar : ''}`}
                    style={{ height: `${height}%` }}
                    title={`${item.label} ${item.amount.toLocaleString(locale)}`}
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
  const { locale, t } = useI18n()
  const todayObj = new Date()
  const todayStr = todayObj.toISOString().slice(0, 10)

  const currentYM = todayStr.slice(0, 7)

  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [selectedMonth, setSelectedMonth] = useState(currentYM)

  const [openDropdown, setOpenDropdown] = useState<'date' | 'month' | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const { toast, showToast, closeToast } = useToastQueue()

  // 모달 안의 지출 내역 API 연동을 위한 상태
  const [dailyTxList, setDailyTxList] = useState<ExpenseListItemDto[]>([])
  const [isLoadingTx, setIsLoadingTx] = useState(false)

  const dateReportMonth = selectedDate ? selectedDate.slice(0, 7) : currentYM
  const {
    report,
    expenseHistory: data,
    errorMessage,
    retry,
  } = useMonthlyReportData({ reportYearMonth: dateReportMonth, budgetYearMonth: currentYM })

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

  const targetDate = selectedDate || todayStr

  // 이메일 모달이 열릴 때 선택된 날짜의 지출 목록(GET /expenses) 조회
  useEffect(() => {
    if (!isEmailModalOpen || !targetDate) return

    let isCancelled = false

      getExpensePage({
        startAt: `${targetDate}T00:00:00`,
        endAt: `${targetDate}T23:59:59`,
      })
        .then((res) => {
          if (!isCancelled) setDailyTxList(res.content || [])
        })
        .catch(() => {
          showToast({ variant: 'error', title: t('report.transactionsError') })
        })
        .finally(() => {
          if (!isCancelled) setIsLoadingTx(false)
        })

    return () => {
      isCancelled = true
    }
  }, [isEmailModalOpen, targetDate, showToast, t])

  const openEmailModal = () => {
    setIsLoadingTx(true)
    setIsEmailModalOpen(true)
  }

  const handleReportDateChange = (date: string) => {
    if (isEmailModalOpen) setIsLoadingTx(true)
    setSelectedDate(date)
  }

  useEffect(() => {
    const handleOutsideSelect = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (
        !target.closest(`.${styles.selectorBtn}`) &&
        !target.closest(`.${styles.selectorChevron}`) &&
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

  const handleSendEmailReport = async () => {
    if (isSendingEmail) return
    setIsSendingEmail(true)
    try {
      await sendMonthlyReport()
      showToast({ variant: 'success', title: t('report.sendSuccess') })
    } catch (error) {
      showToast({
        variant: 'error',
        ...getApiErrorNotice(error, t('report.sendError')),
      })
    } finally {
      setIsSendingEmail(false)
    }
  }

  const dateList = useMemo(() => {
    const endDateTime = new Date(targetDate)
    const list: string[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(endDateTime)
      d.setDate(endDateTime.getDate() - i)
      list.push(d.toISOString().slice(0, 10))
    }
    return list
  }, [targetDate])

  const timeData = useMemo(() => {
    if (!report?.dailyExpenses) return []
    return dateList.map((dateStr) => {
      const found = report.dailyExpenses.find((expense: any) => expense.date === dateStr)
      return {
        label: String(Number(dateStr.slice(8))),
        amount: found ? found.amountHome : 0,
        dateStr,
      }
    })
  }, [report, dateList])

  const weeklyMaxDateFormatted = useMemo(() => {
    if (timeData.length === 0) return ''
    const maxTimeItem = timeData.reduce((max, item) => (item.amount > max.amount ? item : max), timeData[0])
    return maxTimeItem ? `${Number(maxTimeItem.dateStr.slice(5, 7))}.${Number(maxTimeItem.dateStr.slice(8, 10))}` : ''
  }, [timeData])

  const calculatedChangeRate = useMemo(() => {
    if (!report?.dailyExpenses) return 0
    const yesterdayStr = (() => {
      const d = new Date()
      d.setDate(d.getDate() - 1)
      return d.toISOString().slice(0, 10)
    })()

    const todayExpenseAmount = report.dailyExpenses.find((e: any) => e.date === todayStr)?.amountHome ?? 0
    const yesterdayExpenseAmount = report.dailyExpenses.find((e: any) => e.date === yesterdayStr)?.amountHome ?? 0

    if (yesterdayExpenseAmount === 0) {
      return todayExpenseAmount > 0 ? 100 : 0
    }
    const diff = todayExpenseAmount - yesterdayExpenseAmount
    return Number(((diff / yesterdayExpenseAmount) * 100).toFixed(1))
  }, [report, todayStr])

  const legacyMascotMessages = useMemo(() => {
    const rate = calculatedChangeRate
    const absRate = Math.abs(rate)
    const isIncrease = rate > 0
    const actionText = isIncrease ? '증가' : '감소'
    const color = isIncrease ? '#6AADEA' : '#E16D6D'

    const dailyChangeMsg = (
      <span>
        오늘 지출이 어제보다{' '}
        <span style={{ color: color, fontWeight: 600 }}>
          {absRate}% {actionText}
        </span>
        했어요!
      </span>
    )

    const weeklyMaxMsg = weeklyMaxDateFormatted ? (
      <span>
        지난 7일 중{' '}
        <span style={{ color: '#6AADEA', fontWeight: 600 }}>
          {weeklyMaxDateFormatted}
        </span>
        에 돈을 가장 많이 썼어요!
      </span>
    ) : (
      "이번 주 지출 흐름을 확인해보세요!"
    )

    const staticMsg = "월별 지출 흐름, 이렇게 보니까 한눈에 들어오죠?"

    return [dailyChangeMsg, weeklyMaxMsg, staticMsg]
  }, [calculatedChangeRate, weeklyMaxDateFormatted])

  const mascotMessages = useMemo(() => {
    const apiMessages = report?.mascotMessages
      .map((item: any) => item.message)
      .filter(Boolean) ?? []

    if (apiMessages.length > 0) return apiMessages

    return legacyMascotMessages
  }, [legacyMascotMessages, report?.mascotMessages])

  if (errorMessage) {
    return (
      <section className={styles.page}>
        <div className={styles.pageHeader}>
          <h1>{t('report.title')}</h1>
          <p>{t('report.description')}</p>
        </div>
        <div className={styles.feedbackCard} role="alert">
          <h2>{t('report.errorTitle')}</h2>
          <p>{errorMessage}</p>
          <span>{t('report.errorDescription')}</span>
          <button type="button" onClick={retry}>{t('common.retry')}</button>
        </div>
      </section>
    )
  }

  if (!report) {
    return (
      <section className={styles.page} aria-busy="true">
        <div className={styles.pageHeader}>
          <h1>{t('report.title')}</h1>
          <p>{t('report.description')}</p>
        </div>
        <div className={styles.feedbackCard}>
          <p aria-live="polite">{t('report.loading')}</p>
        </div>
      </section>
    )
  }

  const targetExpenseData = report.dailyExpenses.find(
    (expense: any) => expense.date === targetDate
  )
  const targetAmount = targetExpenseData ? targetExpenseData.amountHome : 0

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
    const found = rawMonthlyExpenses.find((expense: any) => expense.yearMonth === monthStr)
    return {
      label: new Intl.DateTimeFormat(locale, { month: 'short' }).format(
        new Date(Number(monthStr.slice(0, 4)), Number(monthStr.slice(5)) - 1, 1),
      ),
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

  const monthList: string[] = []
  let tempY = 2026
  let tempM = 1
  const [currentY, currentM] = currentYM.split('-').map(Number)

  while (tempY < currentY || (tempY === currentY && tempM <= currentM)) {
    monthList.push(`${tempY}-${String(tempM).padStart(2, '0')}`)
    tempM++
    if (tempM > 12) {
      tempM = 1
      tempY++
    }
  }
  monthList.reverse()

  return (
    <section className={styles.page} ref={containerRef}>
      {toast && <Toast key={toast.id} {...toast} onClose={closeToast} />}
      <div className={styles.pageHeader}>
        <h1>{t('report.title')}</h1>
        <div className={styles.headerWrapper}>
          <p>{t('report.description')}</p>
          <Button
            variant="primary"
            onClick={openEmailModal}
            className={styles.emailreportBtn}
          >
            <span className={styles.emailReportLabel}>{t('report.emailReport')}</span>
            <span className={styles.chevronright} aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className={styles.reportContent}>
        <BarChart
          titlePrefix={`${firstDailyDate.slice(5).replace('-', '.')} - ${lastDailyDate.slice(5).replace('-', '.')}`}
          titleSuffix={t('report.dailySuffix')}
          data={timeData}
          chartClass={styles.timeBarChart}
          type="date"
          selectorText={lastDailyDate.replaceAll('-', '.')}
          selectedDate={selectedDate}
          selectedMonth={currentSelectedMonth}
          monthlyList={monthList}
          onDateChange={handleReportDateChange}
          onMonthChange={() => { }}
          isOpen={openDropdown === 'date'}
          onToggle={() => setOpenDropdown(openDropdown === 'date' ? null : 'date')}
        />

        <BarChart
          titlePrefix={new Intl.DateTimeFormat(locale, { year: 'numeric' }).format(new Date(Number(displayYear), 0, 1))}
          titleSuffix={t('report.monthlySuffix')}
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
            if (e.target === e.currentTarget) {
              const isScrollbarClick = e.clientX >= e.currentTarget.clientWidth
              if (!isScrollbarClick) {
                setIsEmailModalOpen(false)
              }
            }
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
                    return t('report.todayReport', { month: Number(m), day: Number(d) })
                  })()}
                </h2>
                <p>{t('report.todayDescription')}</p>
              </header>
              <section className={styles.emailListSection}>
                <div className={styles.emailSummary}>
                  <div className={styles.summaryBox}>
                    <span>{t('report.totalExpense')}</span>
                    <strong className={styles.textBlue}>{localSymbol} {targetAmount.toLocaleString(locale)}</strong>
                    <small>({userHomeCurrency} {Number(convertCurrencyAmount(targetAmount, userLocalCurrency, userHomeCurrency)).toFixed(2)})</small>
                  </div>
                  <div className={styles.summaryArrow}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M13 5L20 12L13 19M5 5L12 12L5 19" stroke="#90b6d9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className={styles.summaryBox}>
                    <span>{t('report.remainingBudget')}</span>
                    <strong>
                      {homeSymbol} {Number(data?.remainingBudgetHome ?? 0).toLocaleString(locale)}
                    </strong>
                    <small>(USD {Number(convertCurrencyAmount(data?.remainingBudgetHome ?? 0, userHomeCurrency, 'USD')).toFixed(2)})</small>
                  </div>
                </div>
              </section>

              <section className={styles.emailListSection}>
                <h3>{t('report.todayExpenses')}</h3>
                <ul className={styles.emailTxList}>
                  {isLoadingTx ? (
                    <li style={{ padding: '1rem', color: '#999', textAlign: 'center' }}>
                      {t('report.loadingTransactions')}
                    </li>
                  ) : dailyTxList.length === 0 ? (
                    <li style={{ padding: '1rem', color: '#999', textAlign: 'center' }}>
                      {t('report.noTodayExpenses')}
                    </li>
                  ) : (
                    dailyTxList.map((tx) => {
                      const timeStr = tx.spentAt?.includes('T')
                        ? tx.spentAt.split('T')[1].slice(0, 5)
                        : ''

                      return (
                        <li key={tx.id ?? `${tx.merchantName ?? 'expense'}-${tx.spentAt ?? ''}`}>
                          <div className={styles.txIcon}>
                            <img src={getCategoryIconPath(tx.iconKey)} alt={tx.categoryName ?? ''} width="18" height="18" />
                          </div>
                          <div className={styles.txInfo}>
                            <strong>{tx.merchantName ?? tx.categoryName ?? '-'}</strong>
                            <span>{tx.categoryName} {timeStr ? `• ${timeStr}` : ''}</span>
                          </div>
                          <div className={styles.txAmount}>
                            <strong>{localSymbol} {Number(tx.convertedAmountHome ?? 0).toLocaleString(locale)}</strong>
                            <span>USD {Number(convertCurrencyAmount(tx.convertedAmountHome ?? 0, userHomeCurrency, 'USD')).toFixed(2)}</span>
                          </div>
                        </li>
                      )
                    })
                  )}
                </ul>
              </section>

              <section className={styles.emailChartSection}>
                <h3>{t('report.weeklyTrend')}</h3>
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
                                {localSymbol} {item.amount.toLocaleString(locale)}
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

              <Button
                className={styles.emailSendBtn}
                fullWidth
                disabled={isSendingEmail}
                onClick={handleSendEmailReport}
              >
                <img src="/assets/icons/email.png" alt="" aria-hidden="true" />
                {isSendingEmail ? t('report.sending') : t('report.send')}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <FloatingMascot
        messages={mascotMessages}
        imageSrc="/assets/illustrations/mascot-check.png"
        speechBubbleVariant="twoLine"
        className={styles.lowerMascot}
      />
    </section>
  )
}

export default ReportPage
