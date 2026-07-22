import { useEffect, useMemo, useState } from 'react'
import { createExpense, getExpenseHistory } from '@/api/expenses'
import Button from '@/components/common/Button/Button'
import FileUploadModal from '@/components/common/FileUploadModal/FileUploadModal'
import type { ExpenseDetail } from '@/types/expense'
import { formatCurrencyAmount } from '@/utils/currency'
import styles from './ExpenseInputPage.module.css'

interface Category {
  id: string
  label: string
  iconSrc?: string
  symbol?: string
}

const categories: Category[] = [
  { id: 'food', label: '식비', iconSrc: '/assets/icons/categories/category-food.png' },
  { id: 'transport', label: '교통', iconSrc: '/assets/icons/categories/category-transport.png' },
  { id: 'shopping', label: '쇼핑', symbol: '🛍️' },
  { id: 'medical', label: '의료', iconSrc: '/assets/icons/categories/category-medical.png' },
  { id: 'education', label: '학업', iconSrc: '/assets/icons/categories/category-education.png' },
  { id: 'travel', label: '여행', iconSrc: '/assets/icons/categories/category-travel.png' },
  { id: 'other', label: '추가', symbol: '＋' },
]

const exchangeRatesInKrw: Record<string, number> = {
  KRW: 1,
  USD: 1499.07,
  EUR: 1711.83,
  JPY: 9.23,
  CNY: 207.65,
}

const currencies = ['USD', 'EUR', 'JPY', 'CNY', 'KRW'] as const

function getTodayDateInputValue() {
  const now = new Date()
  const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return localTime.toISOString().slice(0, 10)
}

function ExpenseInputPage() {
  const [currency, setCurrency] = useState('USD')
  const [amount, setAmount] = useState('')
  const [spentAt, setSpentAt] = useState(getTodayDateInputValue)
  const [merchant, setMerchant] = useState('')
  const [categoryId, setCategoryId] = useState('food')
  const [memo, setMemo] = useState('')
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false)
  const [isDateOpen, setIsDateOpen] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(() => getTodayDateInputValue().slice(0, 7))
  const [successMessage, setSuccessMessage] = useState('')
  const [budgetSummary, setBudgetSummary] = useState({
    homeCurrency: 'KRW',
    monthlyBudgetHome: 0,
    monthlyExpenseHome: 0,
  })

  const activeCurrency = currency
  const sourceRateInKrw = exchangeRatesInKrw[currency]
  const homeRateInKrw = exchangeRatesInKrw[budgetSummary.homeCurrency] ?? 1
  const rate = sourceRateInKrw / homeRateInKrw
  const numericAmount = Number(amount) || 0
  const convertedAmount = Math.floor(numericAmount * rate)
  const projectedExpenseHome = budgetSummary.monthlyExpenseHome + convertedAmount
  const budgetUsagePercent = budgetSummary.monthlyBudgetHome > 0
    ? Math.min((projectedExpenseHome / budgetSummary.monthlyBudgetHome) * 100, 100)
    : 0
  const remainingBudgetHome = Math.max(budgetSummary.monthlyBudgetHome - projectedExpenseHome, 0)
  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === categoryId) ?? categories[0],
    [categoryId],
  )
  const [calendarYear, calendarMonthNumber] = calendarMonth.split('-').map(Number)
  const firstWeekday = new Date(calendarYear, calendarMonthNumber - 1, 1).getDay()
  const daysInMonth = new Date(calendarYear, calendarMonthNumber, 0).getDate()

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
      })

    return () => {
      isActive = false
    }
  }, [spentAt])

  const moveCalendarMonth = (amount: number) => {
    const next = new Date(calendarYear, calendarMonthNumber - 1 + amount, 1)
    setCalendarMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (numericAmount <= 0 || isSaving) return

    setIsSaving(true)
    setErrorMessage('')

    try {
      await createExpense({
        currency: activeCurrency as ExpenseDetail['currency'],
        originalAmount: numericAmount,
        convertedAmountHome: convertedAmount,
        appliedRate: rate,
        spentAt,
        merchantName: merchant.trim(),
        categoryName: selectedCategory.label,
        iconKey: selectedCategory.id,
        memo: memo.trim(),
      })
      setSuccessMessage(`${selectedCategory.label} · ${merchant.trim() || '상점 미입력'} · ${activeCurrency} ${numericAmount.toLocaleString('en-US', { maximumFractionDigits: 2 })}`)
      setBudgetSummary((current) => ({
        ...current,
        monthlyExpenseHome: current.monthlyExpenseHome + convertedAmount,
      }))
      setAmount('')
    } catch {
      setErrorMessage('지출을 저장하지 못했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className={styles.page} aria-labelledby="expense-input-title">
      {successMessage && <div className={styles.successToast} role="status"><b>✓</b><div><strong>지출이 성공적으로 저장되었어요!</strong><span>{successMessage}</span></div><button type="button" aria-label="알림 닫기" onClick={() => setSuccessMessage('')}>×</button></div>}
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.formToolbar}>
          <h1 id="expense-input-title">지출 입력</h1>
          <button className={styles.uploadButton} type="button" aria-label="지출 파일 업로드" onClick={() => setIsUploadOpen(true)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V3m0 0L7.5 7.5M12 3l4.5 4.5M5 13v7h14v-7" /></svg>
          </button>
        </div>

        {uploadedFileName && <p className={styles.uploadStatus}>선택된 파일: {uploadedFileName}</p>}

        <div className={styles.twoColumns}>
          <div className={styles.field}>
            <span>통화</span>
            <div className={styles.customSelect}>
              <button className={styles.currencySelectWrap} type="button" aria-label="통화 선택" aria-expanded={isCurrencyOpen} onClick={() => setIsCurrencyOpen((open) => !open)}>
              {currency === 'KRW'
                ? <b className={styles.krwIcon} aria-hidden="true">₩</b>
                : <img src={`/assets/icons/currencies/currency-${currency.toLowerCase()}.png`} alt="" aria-hidden="true" />}
                <strong>{currency}</strong><span aria-hidden="true">⌄</span>
              </button>
              {isCurrencyOpen && <div className={styles.currencyMenu} role="listbox" aria-label="통화 목록">
                {currencies.map((option) => <button key={option} type="button" role="option" aria-selected={currency === option} onClick={() => { setCurrency(option); setIsCurrencyOpen(false) }}>
                  {option === 'KRW' ? <b aria-hidden="true">₩</b> : <img src={`/assets/icons/currencies/currency-${option.toLowerCase()}.png`} alt="" aria-hidden="true" />}<span>{option}</span>
                </button>)}
              </div>}
            </div>
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
              <button type="button" aria-label="지출 날짜 선택" aria-expanded={isDateOpen} onClick={() => setIsDateOpen((open) => !open)}><span>{spentAt.replaceAll('-', '.')}</span><img src="/assets/icons/expenses/expense-calendar.png" alt="" aria-hidden="true" /></button>
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
                {category.iconSrc ? <img src={category.iconSrc} alt="" aria-hidden="true" /> : <span className={styles.categorySymbol} aria-hidden="true">{category.symbol}</span>}
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

        {errorMessage && <p role="alert">{errorMessage}</p>}
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
              {selectedCategory.iconSrc ? <img src={selectedCategory.iconSrc} alt="" aria-hidden="true" /> : <span aria-hidden="true">{selectedCategory.symbol}</span>}
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
        onUpload={(file) => {
          setUploadedFileName(file.name)
          setIsUploadOpen(false)
        }}
      />
    </section>
  )
}

export default ExpenseInputPage
