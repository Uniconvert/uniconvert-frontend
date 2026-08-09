import { useEffect, useMemo, useState } from 'react'
import { getCategories, getFallbackCategories } from '@/api/categories'
import { createExpense, getExpenseHistory, importExpenses } from '@/api/expenses'
import { getCurrentExchangeRate } from '@/api/exchangeRates'
import Button from '@/components/common/Button/Button'
import CurrencyDropdown from '@/components/common/CurrencyDropdown/CurrencyDropdown'
import type { CurrencyCode } from '@/components/common/CurrencyDropdown/currencyOptions'
import FileUploadModal from '@/components/common/FileUploadModal/FileUploadModal'
import Toast from '@/components/common/Toast/Toast'
import { useToastQueue } from '@/components/common/Toast/useToastQueue'
import type { ExpenseDetail } from '@/types/expense'
import { formatCurrencyAmount } from '@/utils/currency'
import { getExchangeRate } from '@/utils/exchangeRate'
import styles from './ExpenseInputPage.module.css'

const fallbackCategories = getFallbackCategories()

function getTodayDateInputValue() {
  const now = new Date()
  const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return localTime.toISOString().slice(0, 10)
}

function ExpenseInputPage() {
  const [currency, setCurrency] = useState<CurrencyCode>('USD')
  const [amount, setAmount] = useState('')
  const [spentAt, setSpentAt] = useState(getTodayDateInputValue)
  const [merchant, setMerchant] = useState('')
  const [categories, setCategories] = useState(fallbackCategories)
  const [categoryId, setCategoryId] = useState(fallbackCategories[0].id)
  const [memo, setMemo] = useState('')
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDateOpen, setIsDateOpen] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(() => getTodayDateInputValue().slice(0, 7))
  const { toast, showToast, closeToast } = useToastQueue()
  const [budgetSummary, setBudgetSummary] = useState({
    homeCurrency: 'KRW',
    monthlyBudgetHome: 0,
    monthlyExpenseHome: 0,
  })

  const activeCurrency = currency
  const [rate, setRate] = useState(() => getExchangeRate(currency, budgetSummary.homeCurrency))
  const numericAmount = Number(amount) || 0
  const convertedAmount = Math.floor(numericAmount * rate)
  const projectedExpenseHome = budgetSummary.monthlyExpenseHome + convertedAmount
  const budgetUsagePercent = budgetSummary.monthlyBudgetHome > 0
    ? Math.min((projectedExpenseHome / budgetSummary.monthlyBudgetHome) * 100, 100)
    : 0
  const remainingBudgetHome = Math.max(budgetSummary.monthlyBudgetHome - projectedExpenseHome, 0)
  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === categoryId) ?? categories[0],
    [categories, categoryId],
  )
  const [calendarYear, calendarMonthNumber] = calendarMonth.split('-').map(Number)
  const firstWeekday = new Date(calendarYear, calendarMonthNumber - 1, 1).getDay()
  const daysInMonth = new Date(calendarYear, calendarMonthNumber, 0).getDate()

  useEffect(() => {
    let isActive = true

    getCategories()
      .then((response) => {
        if (!isActive || response.length === 0) return
        setCategories(response)
        setCategoryId((current) => (
          response.some((category) => category.id === current) ? current : response[0].id
        ))
      })
      .catch(() => {
        if (isActive) showToast({ variant: 'error', title: '카테고리를 불러오지 못해 기본 목록을 사용해요' })
      })

    return () => { isActive = false }
  }, [showToast])

  useEffect(() => {
    let isActive = true

    getExpenseHistory(spentAt.slice(0, 7), 'month')
      .then((history) => {
        if (!isActive) return
        setBudgetSummary({
          homeCurrency: history.homeCurrency,
          monthlyBudgetHome: history.monthlyBudgetHome,
          monthlyExpenseHome: history.monthlyExpenseHome,
        })
      })
      .catch(() => {
        if (!isActive) return
        setBudgetSummary({ homeCurrency: 'KRW', monthlyBudgetHome: 0, monthlyExpenseHome: 0 })
        showToast({ variant: 'error', title: '환율 정보를 불러오지 못했어요' })
      })

    return () => {
      isActive = false
    }
  }, [spentAt, showToast])

  useEffect(() => {
    let isActive = true

    getCurrentExchangeRate(currency, budgetSummary.homeCurrency)
      .then((response) => {
        if (isActive && typeof response.rate === 'number' && response.rate > 0) {
          setRate(response.rate)
        }
      })
      .catch(() => {
        if (isActive) {
          setRate(getExchangeRate(currency, budgetSummary.homeCurrency))
          showToast({ variant: 'error', title: '실시간 환율을 불러오지 못해 기본 환율을 사용해요' })
        }
      })

    return () => { isActive = false }
  }, [budgetSummary.homeCurrency, currency, showToast])

  const moveCalendarMonth = (amount: number) => {
    const next = new Date(calendarYear, calendarMonthNumber - 1 + amount, 1)
    setCalendarMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (numericAmount <= 0 || isSaving) return

    setIsSaving(true)

    try {
      const savedExpense = await createExpense({
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
        title: '지출이 성공적으로 저장되었어요!',
        description: `${selectedCategory.label} · ${merchant.trim() || '상점 미입력'} · ${currencySymbol}${formattedAmount}`,
      })
      if (budgetSummary.monthlyBudgetHome > 0 && projectedExpenseHome > budgetSummary.monthlyBudgetHome) {
        showToast({ variant: 'info', title: '이번 달 예산을 초과했어요' })
      }
      setBudgetSummary((current) => ({
        ...current,
        monthlyExpenseHome: current.monthlyExpenseHome + savedExpense.convertedAmountHome,
      }))
      setAmount('')
    } catch {
      showToast({ variant: 'error', title: '지출을 저장하지 못했어요. 다시 시도해주세요' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className={styles.page} aria-labelledby="expense-input-title">
      {toast && <Toast key={toast.id} {...toast} onClose={closeToast} />}
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.formToolbar}>
          <h1 id="expense-input-title">지출 입력</h1>
          <button className={styles.uploadButton} type="button" aria-label="지출 파일 업로드" onClick={() => setIsUploadOpen(true)}>
            <img src="/assets/icons/actions/action-upload.png" alt="" aria-hidden="true" />
          </button>
        </div>

        {uploadedFileName && <p className={styles.uploadStatus}>선택된 파일: {uploadedFileName}</p>}

        <div className={styles.twoColumns}>
          <div className={styles.field}>
            <span>통화</span>
            <CurrencyDropdown value={currency} onChange={setCurrency} />
          </div>

          <label className={styles.field}>
            <span className={styles.amountLabel}>지출 금액 <small><b>적용 환율</b> {rate.toLocaleString('ko-KR', { maximumFractionDigits: 4 })} {budgetSummary.homeCurrency}</small></span>
            <span className={styles.amountInputWrap}>
              <b>{activeCurrency === 'KRW' ? '₩' : activeCurrency === 'USD' ? '$' : activeCurrency === 'EUR' ? '€' : '¥'}</b>
              <input value={amount} inputMode="decimal" aria-label="지출 금액" onChange={(event) => setAmount(event.target.value.replace(/[^\d.]/g, ''))} />
              <small>{activeCurrency}</small>
            </span>
          </label>

          <div className={styles.field}>
            <span>지출 날짜</span>
            <div className={styles.datePicker}>
              <button type="button" aria-label="지출 날짜 선택" aria-expanded={isDateOpen} onClick={() => setIsDateOpen((open) => !open)}><img src="/assets/icons/expenses/expense-calendar.png" alt="" aria-hidden="true" /><span>{spentAt.replaceAll('-', '.')}</span></button>
              {isDateOpen && <div className={styles.calendar} role="dialog" aria-label="날짜 선택">
                <header><button type="button" aria-label="이전 달" onClick={() => moveCalendarMonth(-1)}>‹</button><strong>{calendarYear}년 {calendarMonthNumber}월</strong><button type="button" aria-label="다음 달" onClick={() => moveCalendarMonth(1)}>›</button></header>
                <div className={styles.weekdays}>{['일','월','화','수','목','금','토'].map((day) => <span key={day}>{day}</span>)}</div>
                <div className={styles.days}>{Array.from({ length: firstWeekday }, (_, index) => <span key={`blank-${index}`} />)}{Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day) => {
                  const value = `${calendarMonth}-${String(day).padStart(2, '0')}`
                  return <button key={day} type="button" aria-pressed={spentAt === value} onClick={() => { setSpentAt(value); setIsDateOpen(false) }}>{day}</button>
                })}</div>
              </div>}
            </div>
          </div>

          <label className={styles.field}>
            <span>상점 (선택)</span>
            <input value={merchant} placeholder="상점명을 입력하세요" onChange={(event) => setMerchant(event.target.value)} />
          </label>
        </div>

        <fieldset className={styles.categories}>
          <legend>카테고리</legend>
          <div className={styles.categoryList}>
            {categories.map((category) => (
              <button key={category.id} className={categoryId === category.id ? styles.selectedCategory : ''} type="button" aria-pressed={categoryId === category.id} onClick={() => setCategoryId(category.id)}>
                <img
                  className={['shopping', 'communication', 'education', 'travel'].includes(category.iconKey) ? styles.largeCategoryIcon : undefined}
                  src={category.iconSrc}
                  alt=""
                  aria-hidden="true"
                />
                <span>{category.label}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <label className={styles.memoField}>
          <span>메모 입력(선택)</span>
          <span className={styles.textareaWrap}>
            <textarea maxLength={200} value={memo} placeholder="메모를 입력하세요" onChange={(event) => setMemo(event.target.value)} />
            <small>{memo.length}/200</small>
          </span>
        </label>

        <Button className={styles.saveButton} type="submit" fullWidth disabled={numericAmount <= 0} isLoading={isSaving}>지출 저장하기</Button>
      </form>

      <aside className={styles.previewPanel} aria-label="지출 미리보기">
        <img className={styles.exchangeImage} src="/assets/icons/expenditure_input.png" alt="" aria-hidden="true" />
        <section className={styles.previewCard}>
          <h2>미리보기</h2>
          <div className={styles.conversion}>
            <span><small>{activeCurrency}</small> {numericAmount.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
            <b aria-hidden="true">»</b>
            <span><small>{budgetSummary.homeCurrency}</small> {convertedAmount.toLocaleString('ko-KR')}</span>
          </div>
          <div className={styles.previewRow}>
            <span>카테고리</span>
            <strong>
              <img src={selectedCategory.iconSrc} alt="" aria-hidden="true" />
              {selectedCategory.label}
            </strong>
          </div>
          <hr />
          <div className={styles.budgetHeading}><span>예산 사용 현황</span><strong>{Math.round(budgetUsagePercent)}%</strong></div>
          <div className={styles.progressTrack}><span style={{ width: `${budgetUsagePercent}%` }} /></div>
          <div className={styles.remaining}>
            <span>남은 예산</span>
            <strong>{formatCurrencyAmount(remainingBudgetHome, budgetSummary.homeCurrency)}</strong>
          </div>
        </section>
      </aside>

      <FileUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onError={() => showToast({ variant: 'error', title: '가져오기에 실패했어요. 다시 시도해주세요' })}
        onUpload={async (file) => {
          const result = await importExpenses(file)
          setUploadedFileName(file.name)
          setIsUploadOpen(false)
          showToast({ variant: 'success', title: `${result.savedCount ?? 0}건의 지출을 가져왔어요` })
          const history = await getExpenseHistory(spentAt.slice(0, 7), 'month')
          setBudgetSummary({
            homeCurrency: history.homeCurrency,
            monthlyBudgetHome: history.monthlyBudgetHome,
            monthlyExpenseHome: history.monthlyExpenseHome,
          })
        }}
      />
    </section>
  )
}

export default ExpenseInputPage
