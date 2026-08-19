import { useEffect, useRef, useState, useMemo } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ReportEmailSendError, sendReportEmail, type SendReportEmailInput } from '@/features/report/emailReportSender'
import { captureReportImage, ReportImageCaptureError } from '@/features/report/reportImageCapture'
import { executeManualEmailReport } from '@/features/report/manualEmailReport'

import styles from '@/features/report/report.module.css'
import FloatingMascot from '@/components/common/FloatingMascot/FloatingMascot'
import Button from '@/components/common/Button/Button'
import Toast from '@/components/common/Toast/Toast'
import { useToastQueue } from '@/components/common/Toast/useToastQueue'
import { getOnboardingSettings, getSessionUser } from '@/auth/session'
import { getApiErrorNotice } from '@/utils/apiError'
import { useMonthlyReportData } from '@/features/report/hooks/useMonthlyReportData'
import { useI18n } from '@/i18n/I18nContext'
import LoadingState from '@/components/common/LoadingState/LoadingState'
import ErrorState from '@/components/common/ErrorState/ErrorState'
import { normalizeCurrencyCode } from '@/types/currency'
import ReportBarChart from '@/features/report/components/ReportBarChart'
import EmailReportDialog from '@/features/report/components/EmailReportDialog'
import { useReportTransactions } from '@/features/report/hooks/useReportTransactions'

function ReportPage() {
  const { locale, t } = useI18n()
  const todayObj = new Date()
  const todayStr = todayObj.toISOString().slice(0, 10)

  const currentYM = todayStr.slice(0, 7)

  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [selectedMonth, setSelectedMonth] = useState(currentYM)

  const [openDropdown, setOpenDropdown] = useState<'date' | 'month' | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const reportCaptureRef = useRef<HTMLElement>(null)
  const captureInProgressRef = useRef(false)

  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
  const [isCapturingReport, setIsCapturingReport] = useState(false)
  const { toast, showToast, closeToast } = useToastQueue()

  const dateReportMonth = selectedDate ? selectedDate.slice(0, 7) : currentYM
  const {
    report,
    expenseHistory: data,
    errorMessage,
    expenseHistoryErrorMessage,
    isInitialLoading,
    isBackgroundFetching,
    retry,
  } = useMonthlyReportData({ reportYearMonth: dateReportMonth, budgetYearMonth: currentYM })

  const targetDate = selectedDate || todayStr
  const transactionsQuery = useReportTransactions(targetDate, isEmailModalOpen)
  const dailyTxList = transactionsQuery.transactions
  const isLoadingTx = isEmailModalOpen && transactionsQuery.isLoading
  const sendEmailMutation = useMutation({ mutationFn: (input: SendReportEmailInput) => sendReportEmail(input) })

  useEffect(() => {
    if (isEmailModalOpen && transactionsQuery.error) {
      showToast({ variant: 'error', title: t('report.transactionsError') })
    }
  }, [isEmailModalOpen, showToast, t, transactionsQuery.error])

  const openEmailModal = () => {
    setIsEmailModalOpen(true)
  }

  const handleReportDateChange = (date: string) => {
    setSelectedDate(date)
  }

  useEffect(() => {
    if (openDropdown !== 'date') return undefined

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
  }, [openDropdown])

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
      const found = report.dailyExpenses.find((expense: { date: string; amountHome: number }) => expense.date === dateStr)
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

    const todayExpenseAmount = report.dailyExpenses.find((e: { date: string; amountHome: number }) => e.date === todayStr)?.amountHome ?? 0
    const yesterdayExpenseAmount = report.dailyExpenses.find((e: { date: string; amountHome: number }) => e.date === yesterdayStr)?.amountHome ?? 0

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
      ?.map((item: { message?: string }) => item.message)
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
        <div className={styles.feedbackCard}>
          <h2>{t('report.errorTitle')}</h2>
          <ErrorState
            title={errorMessage}
            description={t('report.errorDescription')}
            retryLabel={t('common.retry')}
            onRetry={retry}
          />
        </div>
      </section>
    )
  }

  if (!report && isInitialLoading) {
    return (
      <section className={styles.page} aria-busy="true">
        <div className={styles.pageHeader}>
          <h1>{t('report.title')}</h1>
          <p>{t('report.description')}</p>
        </div>
        <div className={styles.feedbackCard}>
          <LoadingState message={t('report.loading')} />
        </div>
      </section>
    )
  }

  if (!report) return null

  const targetExpenseData = report.dailyExpenses.find(
    (expense: { date: string; amountHome: number }) => expense.date === targetDate
  )
  const targetAmount = targetExpenseData ? targetExpenseData.amountHome : 0

  const handleSendEmailReport = async () => {
    const recipientEmail = getSessionUser()?.email?.trim() ?? ''
    if (!recipientEmail) {
      showToast({ variant: 'error', title: t('report.sendError') })
      return
    }
    if (captureInProgressRef.current || sendEmailMutation.isPending) return

    captureInProgressRef.current = true
    setIsCapturingReport(true)
    try {
      await executeManualEmailReport({
        isPending: sendEmailMutation.isPending,
        send: async () => {
          const reportImage = await captureReportImage(reportCaptureRef.current)
          return sendEmailMutation.mutateAsync({
            toEmail: recipientEmail,
            reportPeriod: targetDate,
            reportImage,
          })
        },
        onSuccess: () => {
          showToast({ variant: 'success', title: t('report.sendSuccess') })
          setIsEmailModalOpen(false)
        },
        onError: (error) => {
          const isKnownReportError = error instanceof ReportEmailSendError || error instanceof ReportImageCaptureError
          showToast({
            variant: 'error',
            ...(isKnownReportError
              ? { title: t('report.sendError') }
              : getApiErrorNotice(error, t('report.sendError'))),
          })
        },
      })
    } finally {
      captureInProgressRef.current = false
      setIsCapturingReport(false)
    }
  }

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
    const found = rawMonthlyExpenses.find((expense: { yearMonth: string; amountHome: number }) => expense.yearMonth === monthStr)
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
  const userLocalCurrency = normalizeCurrencyCode(localCurrencies[0], 'KRW')

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
      {isBackgroundFetching && <LoadingState size="sm" variant="inline" message={t('report.loading')} />}
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
        <ReportBarChart
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

        <ReportBarChart
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

      {isEmailModalOpen && (
        <EmailReportDialog
          captureRef={reportCaptureRef}
          targetDate={targetDate}
          targetAmount={targetAmount}
          remainingBudgetHome={data?.remainingBudgetHome ?? null}
          remainingBudgetError={expenseHistoryErrorMessage}
          localSymbol={localSymbol}
          homeSymbol={homeSymbol}
          userLocalCurrency={userLocalCurrency}
          userHomeCurrency={userHomeCurrency}
          transactions={dailyTxList}
          isLoadingTransactions={isLoadingTx}
          timeData={timeData}
          isSending={sendEmailMutation.isPending || isCapturingReport}
          onClose={() => setIsEmailModalOpen(false)}
          onSend={handleSendEmailReport}
        />
      )}

      <FloatingMascot
        messages={mascotMessages}
        imageSrc="/assets/illustrations/mascot-calendar.png"
        speechBubbleVariant="twoLine"
        className={styles.lowerMascot}
      />
    </section>
  )
}

export default ReportPage
