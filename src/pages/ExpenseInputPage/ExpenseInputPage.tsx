import { useCallback, useMemo, useState } from 'react'
import { createExpense, importExpenses } from '@/api/expenses'
import Button from '@/components/common/Button/Button'
import CurrencyDropdown from '@/components/common/CurrencyDropdown/CurrencyDropdown'
import type { CurrencyCode } from '@/components/common/CurrencyDropdown/currencyOptions'
import FileUploadModal from '@/components/common/FileUploadModal/FileUploadModal'
import Toast from '@/components/common/Toast/Toast'
import { useToastQueue } from '@/components/common/Toast/useToastQueue'
import { useExpenseInputData } from '@/hooks/useExpenseInputData'
import type { ExpenseDetail } from '@/types/expense'
import { getApiErrorNotice } from '@/utils/apiError'
import { formatCurrencyAmount } from '@/utils/currency'
import { useI18n } from '@/i18n/I18nContext'
import styles from './ExpenseInputPage.module.css'

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
  const [currency, setCurrency] = useState<CurrencyCode>('USD')
  const [amount, setAmount] = useState('')
  const [spentAt, setSpentAt] = useState(getTodayDateInputValue)
  const [merchant, setMerchant] = useState('')
  const [memo, setMemo] = useState('')
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDateOpen, setIsDateOpen] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(() => getTodayDateInputValue().slice(0, 7))
  const { toast, showToast, closeToast } = useToastQueue()
  const showLoadWarning = useCallback((title: string) => {
    showToast({ variant: 'error', title })
  }, [showToast])
  const {
    categories,
    categoryId,
    setCategoryId,
    budgetSummary,
    rate,
    refetchBudget,
  } = useExpenseInputData({
    yearMonth: spentAt.slice(0, 7),
    currency,
    onWarning: showLoadWarning,
  })

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

  const moveCalendarMonth = (amount: number) => {
    const next = new Date(calendarYear, calendarMonthNumber - 1 + amount, 1)
    setCalendarMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (numericAmount <= 0 || isSaving) return

    setIsSaving(true)

    try {
      await createExpense({
        currency: activeCurrency as ExpenseDetail['currency'],
        originalAmount: numericAmount,
        convertedAmountHome: convertedAmount,
        appliedRate: rate,
        spentAt,
        merchantName: merchant.trim(),
        categoryName: selectedCategory.label,
        iconKey: selectedCategory.iconKey,
        categoryId: selectedCategory.serverId,
        memo: memo.trim(),
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
      // 지출 저장 뒤 남은 예산과 Pot 배정 반영 여부는 서버 계산값을 다시 사용한다.
      await refetchBudget()
      setAmount('')
    } catch (error) {
      showToast({
        variant: 'error',
        ...getApiErrorNotice(error, '지출을 저장하지 못했습니다.'),
      })
    } finally {
      setIsSaving(false)
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

        <div className={styles.twoColumns}>
          <div className={styles.field}>
            <span>{t('expenseInput.currency')}</span>
            <CurrencyDropdown value={currency} onChange={setCurrency} />
          </div>

          <label className={styles.field}>
            <span className={styles.amountLabel}>{t('expenseInput.amount')} <small><b>{t('expenseInput.appliedRate')}</b> {rate.toLocaleString(locale, { maximumFractionDigits: 4 })} {budgetSummary.homeCurrency}</small></span>
            <span className={styles.amountInputWrap}>
              <b>{activeCurrency === 'KRW' ? '₩' : activeCurrency === 'USD' ? '$' : activeCurrency === 'EUR' ? '€' : '¥'}</b>
              <input value={amount} inputMode="decimal" aria-label={t('expenseInput.amount')} onChange={(event) => setAmount(event.target.value.replace(/[^\d.]/g, ''))} />
              <small>{activeCurrency}</small>
            </span>
          </label>

          <div className={styles.field}>
            <span>{t('expenseInput.date')}</span>
            <div className={styles.datePicker}>
              <button type="button" aria-label={t('expenseInput.selectDate')} aria-expanded={isDateOpen} onClick={() => setIsDateOpen((open) => !open)}><img src="/assets/icons/expenses/expense-calendar.png" alt="" aria-hidden="true" /><span>{spentAt.replaceAll('-', '.')}</span></button>
              {isDateOpen && <div className={styles.calendar} role="dialog" aria-label={t('expenseInput.selectDate')}>
                <header><button type="button" aria-label={t('expenseInput.previousMonth')} onClick={() => moveCalendarMonth(-1)}>‹</button><strong>{new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' }).format(new Date(calendarYear, calendarMonthNumber - 1, 1))}</strong><button type="button" aria-label={t('expenseInput.nextMonth')} onClick={() => moveCalendarMonth(1)}>›</button></header>
                <div className={styles.weekdays}>{WEEKDAY_KEYS.map((key) => <span key={key}>{t(key)}</span>)}</div>
                <div className={styles.days}>{Array.from({ length: firstWeekday }, (_, index) => <span key={`blank-${index}`} />)}{Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day) => {
                  const value = `${calendarMonth}-${String(day).padStart(2, '0')}`
                  return <button key={day} type="button" aria-pressed={spentAt === value} onClick={() => { setSpentAt(value); setIsDateOpen(false) }}>{day}</button>
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

        <Button className={styles.saveButton} type="submit" fullWidth disabled={numericAmount <= 0} isLoading={isSaving}>{t('expenseInput.save')}</Button>
      </form>

      <aside className={styles.previewPanel} aria-label={t('expenseInput.preview')}>
        <img className={styles.exchangeImage} src="/assets/icons/expenditure_input.png" alt="" aria-hidden="true" />
        <section className={styles.previewCard}>
          <h2>{t('expenseInput.preview')}</h2>
          <div className={styles.conversion}>
            <span><small>{activeCurrency}</small> {numericAmount.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
            <b aria-hidden="true">»</b>
            <span><small>{budgetSummary.homeCurrency}</small> {convertedAmount.toLocaleString(locale)}</span>
          </div>
          <div className={styles.previewRow}>
            <span>{t('expenseInput.category')}</span>
            <strong>
              <img src={selectedCategory.iconSrc} alt="" aria-hidden="true" />
              {selectedCategoryLabel}
            </strong>
          </div>
          <hr />
          <div className={styles.budgetHeading}><span>{t('expenseInput.budgetUsage')}</span><strong>{Math.round(budgetUsagePercent)}%</strong></div>
          <div className={styles.progressTrack}><span style={{ width: `${budgetUsagePercent}%` }} /></div>
          <div className={styles.remaining}>
            <span>{t('expenseInput.remainingBudget')}</span>
            <strong>{formatCurrencyAmount(projectedRemainingBudgetHome, budgetSummary.homeCurrency)}</strong>
          </div>
        </section>
      </aside>

      <FileUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onError={(error) => showToast({
          variant: 'error',
          ...getApiErrorNotice(error, '지출 내역을 가져오지 못했습니다.'),
        })}
        onUpload={async (file) => {
          const result = await importExpenses(file)
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
