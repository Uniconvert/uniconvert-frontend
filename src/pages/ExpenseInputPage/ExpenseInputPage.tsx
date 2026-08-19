import { useCallback, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createExpense, importExpenses } from '@/api/expenses'
import Button from '@/components/common/Button/Button'
import CurrencyDropdown from '@/components/common/CurrencyDropdown/CurrencyDropdown'
import type { CurrencyCode } from '@/types/currency'
import FileUploadModal from '@/components/common/FileUploadModal/FileUploadModal'
import Toast from '@/components/common/Toast/Toast'
import { useToastQueue } from '@/components/common/Toast/useToastQueue'
import { useExpenseInputData } from '@/features/expense/hooks/useExpenseInputData'
import type { ExpenseFormValue } from '@/types/expense'
import { isCurrencyCode } from '@/types/currency'
import { getApiErrorNotice } from '@/utils/apiError'
import { formatCurrencyAmount } from '@/utils/currency'
import { useI18n } from '@/i18n/I18nContext'
import styles from './ExpenseInputPage.module.css'
import { getOnboardingSettings } from '@/auth/session'
import { expenseKeys } from '@/hooks/expenseKeys'
import { reportKeys } from '@/hooks/reportKeys'
import { formatCalendarDateLabel, handleCalendarKeyDown as handleSharedCalendarKeyDown } from '@/hooks/useCalendarKeyboard'

const WEEKDAY_KEYS = [
  'calendar.weekday.sun',
  'calendar.weekday.mon',
  'calendar.weekday.tue',
  'calendar.weekday.wed',
  'calendar.weekday.thu',
  'calendar.weekday.fri',
  'calendar.weekday.sat',
]

function getTodayDateInputValue() {
  const now = new Date()
  const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return localTime.toISOString().slice(0, 10)
}

function ExpenseInputPage() {
  const { t, locale } = useI18n()
  const onboarding = getOnboardingSettings()
  const defaultCurrency = onboarding.localCurrencies?.find(isCurrencyCode) ?? 'USD'

  const [currency, setCurrency] = useState<CurrencyCode>(defaultCurrency)
  const [amount, setAmount] = useState('')
  const [spentAt, setSpentAt] = useState(getTodayDateInputValue)
  const [merchant, setMerchant] = useState('')
  const [memo, setMemo] = useState('')
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [isDateOpen, setIsDateOpen] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(() => getTodayDateInputValue().slice(0, 7))
  const { toast, showToast, closeToast } = useToastQueue()
  const queryClient = useQueryClient()
  const createExpenseMutation = useMutation({
    mutationFn: createExpense,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reportKeys.all })
      void queryClient.invalidateQueries({ queryKey: expenseKeys.history })
      void queryClient.invalidateQueries({ queryKey: expenseKeys.recent })
    },
  })
  const importExpensesMutation = useMutation({ mutationFn: importExpenses })
  const isSaving = createExpenseMutation.isPending
  const showLoadWarning = useCallback((title: string) => {
    showToast({ variant: 'error', title })
  }, [showToast])
  const {
    categories,
    categoryId,
    setCategoryId,
    budgetSummary,
    rate,
    isTemporaryRate,
    rateStatus,
    budgetStatus,
    isRateLoading,
    isRateError,
    retryRate,
    refetchBudget,
  } = useExpenseInputData({
    yearMonth: spentAt.slice(0, 7),
    currency,
    onWarning: showLoadWarning,
  })

  const resolvedRateStatus = rateStatus ?? (
    isRateLoading
      ? 'loading'
      : isRateError
        ? 'error'
        : typeof rate === 'number' && Number.isFinite(rate) && rate > 0
          ? 'ready'
          : 'error'
  )
  const isRateReady = resolvedRateStatus === 'ready'
    && typeof rate === 'number'
    && Number.isFinite(rate)
    && rate > 0
  const isBudgetReady = budgetStatus === 'ready'

  const activeCurrency = currency
  const numericAmount = Number(amount) || 0
  const convertedAmount = Math.floor(numericAmount * rate)
  const projectedRemainingBudgetHome = Math.max(
    budgetSummary.remainingBudgetHome - convertedAmount,
    0,
  )
  const budgetUsagePercent = budgetSummary.monthlyBudgetHome > 0
    ? Math.min(
      ((budgetSummary.monthlyBudgetHome - projectedRemainingBudgetHome)
        / budgetSummary.monthlyBudgetHome) * 100,
      100,
    )
    : 0
  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === categoryId) ?? categories[0],
    [categories, categoryId],
  )
  const getCategoryLabel = useCallback((iconKey: string, fallback: string) => {
    const translationKey = `category.${iconKey}`
    const translated = t(translationKey)
    return translated === translationKey ? fallback : translated
  }, [t])
  const selectedCategoryLabel = getCategoryLabel(
    selectedCategory.iconKey,
    selectedCategory.label,
  )
  const [calendarYear, calendarMonthNumber] = calendarMonth.split('-').map(Number)
  const firstWeekday = new Date(calendarYear, calendarMonthNumber - 1, 1).getDay()
  const daysInMonth = new Date(calendarYear, calendarMonthNumber, 0).getDate()
  const selectedCalendarDay = spentAt.startsWith(`${calendarMonth}-`)
    ? Number(spentAt.slice(-2)) - 1
    : 0
  const focusDateTrigger = () => document.getElementById('expense-input-date-trigger')?.focus()
  const focusCalendarDay = (index: number) => {
    document.getElementById('expense-input-calendar')
      ?.querySelector<HTMLButtonElement>(`[data-calendar-index="${index}"]`)
      ?.focus()
  }
  const toggleDatePicker = () => {
    setIsDateOpen((open) => {
      const nextOpen = !open
      window.setTimeout(() => {
        if (nextOpen) focusCalendarDay(selectedCalendarDay)
        else focusDateTrigger()
      }, 0)
      return nextOpen
    })
  }
  const handleCalendarKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement
    const currentIndex = Number(target.dataset.calendarIndex ?? selectedCalendarDay)
    handleSharedCalendarKeyDown(event, {
      dayCount: daysInMonth,
      currentIndex: Number.isFinite(currentIndex) ? currentIndex : selectedCalendarDay,
      onClose: () => setIsDateOpen(false),
      onFocusDay: focusCalendarDay,
      onRestoreFocus: focusDateTrigger,
    })
  }

  const moveCalendarMonth = (amount: number) => {
    const next = new Date(calendarYear, calendarMonthNumber - 1 + amount, 1)
    setCalendarMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (numericAmount <= 0 || isSaving || !isBudgetReady || !isRateReady) return

    try {
      const formValue: ExpenseFormValue = {
        currency: activeCurrency,
        originalAmount: numericAmount,
        spentAt,
        merchantName: merchant.trim(),
        categoryName: selectedCategory.label,
        iconKey: selectedCategory.iconKey,
        categoryId: selectedCategory.serverId,
        memo: memo.trim(),
      }
      await createExpenseMutation.mutateAsync({
        ...formValue,
        convertedAmountHome: convertedAmount,
        appliedRate: rate,
      })
      const currencySymbol = activeCurrency === 'KRW' ? '₩' : activeCurrency === 'USD' ? '$' : activeCurrency === 'EUR' ? '€' : '¥'
      const formattedAmount = numericAmount.toLocaleString('en-US', {
        minimumFractionDigits: activeCurrency === 'USD' || activeCurrency === 'EUR' ? 2 : 0,
        maximumFractionDigits: 2,
      })
      showToast({
        variant: 'success',
        title: t('expenseInput.saved'),
        description: `${selectedCategoryLabel} · ${merchant.trim() || t('expenseInput.merchantEmpty')} · ${currencySymbol}${formattedAmount}`,
      })
      if (
        budgetSummary.monthlyBudgetHome > 0
        && convertedAmount > budgetSummary.remainingBudgetHome
      ) {
        showToast({ variant: 'info', title: t('expenseInput.overBudget') })
      }
      setAmount('')
      setMerchant('')
      setMemo('')
      // 지출 생성 성공과 후속 예산 갱신은 별도의 결과다. 갱신 실패가
      // 이미 저장된 지출을 저장 실패로 재분류하거나 재시도를 유도하지 않게 한다.
      try {
        await refetchBudget()
      } catch {
        showToast({ variant: 'info', title: t('dashboard.budgetLoadError') })
      }
    } catch (error) {
      showToast({
        variant: 'error',
        ...getApiErrorNotice(error, t('expenseInput.saveError')),
      })
    }
  }

  return (
    <section className={styles.page} aria-labelledby="expense-input-title">
      {toast && <Toast key={toast.id} {...toast} onClose={closeToast} />}
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.formToolbar}>
          <h1 id="expense-input-title">{t('expenseInput.title')}</h1>
          <button className={styles.uploadButton} type="button" aria-label={t('expenseInput.upload')} onClick={() => setIsUploadOpen(true)}>
            <img src="/assets/icons/actions/action-upload.png" alt="" aria-hidden="true" />
          </button>
        </div>

        {budgetStatus === 'error' && <p role="alert">{t('dashboard.budgetLoadError')} <button type="button" onClick={() => { void refetchBudget() }}>{t('common.retry')}</button></p>}
        {isRateError && budgetStatus !== 'error' && <p role="alert">환율을 불러오지 못했습니다. <button type="button" onClick={() => { void retryRate() }}>다시 시도</button></p>}
        <div className={styles.twoColumns}>
          <div className={styles.field}>
            <span>{t('expenseInput.currency')}</span>
            <CurrencyDropdown value={currency} onChange={setCurrency} />
          </div>

          <label className={styles.field}>
            <span className={styles.amountLabel}>{t('expenseInput.amount')} <small><b>{isTemporaryRate ? '임시 환율' : t('expenseInput.appliedRate')}</b> {isBudgetReady ? rate.toLocaleString(locale, { maximumFractionDigits: 4 }) : '—'} {isBudgetReady ? budgetSummary.homeCurrency : ''}</small></span>
            <span className={styles.amountInputWrap}>
              <b>{activeCurrency === 'KRW' ? '₩' : activeCurrency === 'USD' ? '$' : activeCurrency === 'EUR' ? '€' : '¥'}</b>
              <input value={amount} inputMode="decimal" aria-label={t('expenseInput.amount')} onChange={(event) => setAmount(event.target.value.replace(/[^\d.]/g, ''))} />
              <small>{activeCurrency}</small>
            </span>
          </label>

          <div className={styles.field}>
            <span>{t('expenseInput.date')}</span>
            <div className={styles.datePicker}>
              <button id="expense-input-date-trigger" type="button" aria-label={t('expenseInput.selectDate')} aria-expanded={isDateOpen} aria-controls="expense-input-calendar" onClick={toggleDatePicker}><img src="/assets/icons/expenses/expense-calendar.png" alt="" aria-hidden="true" /><span>{spentAt.replaceAll('-', '.')}</span></button>
              {isDateOpen && <div id="expense-input-calendar" className={styles.calendar} role="dialog" aria-label={t('expenseInput.selectDate')} onKeyDown={handleCalendarKeyDown}>
                <header><button type="button" aria-label={t('expenseInput.previousMonth')} onClick={() => moveCalendarMonth(-1)}>‹</button><strong>{new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' }).format(new Date(calendarYear, calendarMonthNumber - 1, 1))}</strong><button type="button" aria-label={t('expenseInput.nextMonth')} onClick={() => moveCalendarMonth(1)}>›</button></header>
                <div className={styles.weekdays}>{WEEKDAY_KEYS.map((key) => <span key={key}>{t(key)}</span>)}</div>
                <div className={styles.days}>{Array.from({ length: firstWeekday }, (_, index) => <span key={`blank-${index}`} />)}{Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day, index) => {
                  const value = `${calendarMonth}-${String(day).padStart(2, '0')}`
                  return <button key={day} data-calendar-index={index} type="button" aria-label={formatCalendarDateLabel(value, locale)} aria-current={spentAt === value ? 'date' : undefined} aria-pressed={spentAt === value} onClick={() => { setSpentAt(value); setCalendarMonth(value.slice(0, 7)); setIsDateOpen(false); window.setTimeout(focusDateTrigger, 0) }}>{day}</button>
                })}</div>
              </div>}
            </div>
          </div>

          <label className={styles.field}>
            <span>{t('expenseInput.merchant')}</span>
            <input value={merchant} placeholder={t('expenseInput.merchantPlaceholder')} onChange={(event) => setMerchant(event.target.value)} />
          </label>
        </div>

        <fieldset className={styles.categories}>
          <legend>{t('expenseInput.category')}</legend>
          <div className={styles.categoryList}>
            {categories.map((category) => {
              const categoryLabel = getCategoryLabel(category.iconKey, category.label)
              const needsTwoLines = categoryLabel.replaceAll(' ', '').length > 10

              return (
                <button key={category.id} className={categoryId === category.id ? styles.selectedCategory : ''} type="button" aria-pressed={categoryId === category.id} onClick={() => setCategoryId(category.id)}>
                  <img
                    className={
                      category.iconKey === 'savings'
                        ? styles.savingsCategoryIcon
                        : ['shopping', 'communication', 'education', 'travel'].includes(category.iconKey)
                          ? styles.largeCategoryIcon
                          : undefined
                    }
                    src={category.iconSrc}
                    alt=""
                    aria-hidden="true"
                  />
                  <span className={needsTwoLines ? styles.multilineCategoryLabel : undefined}>{categoryLabel}</span>
                </button>
              )
            })}
          </div>
        </fieldset>

        <label className={styles.memoField}>
          <span>{t('expenseInput.memo')}</span>
          <span className={styles.textareaWrap}>
            <textarea maxLength={200} value={memo} placeholder={t('expenseInput.memoPlaceholder')} onChange={(event) => setMemo(event.target.value)} />
            <small>{memo.length}/200</small>
          </span>
        </label>

        <Button className={styles.saveButton} type="submit" fullWidth disabled={numericAmount <= 0 || !isBudgetReady || !isRateReady || isSaving} isLoading={isSaving}>{t('expenseInput.save')}</Button>
      </form>

      <aside className={styles.previewPanel} aria-label={t('expenseInput.preview')}>
        <img className={styles.exchangeImage} src="/assets/icons/expenditure_input.png" alt="" aria-hidden="true" />
        <section className={styles.previewCard}>
          <h2>{t('expenseInput.preview')}</h2>
          <div className={styles.conversion}>
            <span><small>{activeCurrency}</small> {numericAmount.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
            <b aria-hidden="true">»</b>
            <span><small>{isBudgetReady ? budgetSummary.homeCurrency : '—'}</small> {convertedAmount.toLocaleString(locale)}</span>
          </div>
          <div className={styles.previewRow}>
            <span>{t('expenseInput.category')}</span>
            <strong>
              <img src={selectedCategory.iconSrc} alt="" aria-hidden="true" />
              {selectedCategoryLabel}
            </strong>
          </div>
          <hr />
          <div className={styles.budgetHeading}><span>{t('expenseInput.budgetUsage')}</span><strong>{isBudgetReady ? `${Math.round(budgetUsagePercent)}%` : '—'}</strong></div>
          <div className={styles.progressTrack}><span style={{ width: `${isBudgetReady ? budgetUsagePercent : 0}%` }} /></div>
          <div className={styles.remaining}>
            <span>{t('expenseInput.remainingBudget')}</span>
            <strong>{isBudgetReady ? formatCurrencyAmount(projectedRemainingBudgetHome, budgetSummary.homeCurrency) : '—'}</strong>
          </div>
        </section>
      </aside>

      <FileUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onError={(error) => showToast({
          variant: 'error',
          ...getApiErrorNotice(error, t('expenseInput.importError')),
        })}
        onUpload={async (file) => {
          const result = await importExpensesMutation.mutateAsync(file)
          setIsUploadOpen(false)
          showToast({
            variant: 'success',
            title: t('expenseInput.imported', { saved: result.savedCount ?? 0 }),
            description: t('expenseInput.importDescription', {
              excluded: result.excludedCount ?? 0,
              errors: result.errorCount ?? 0,
            }),
          })
          await refetchBudget()
        }}
      />
    </section>
  )
}

export default ExpenseInputPage
