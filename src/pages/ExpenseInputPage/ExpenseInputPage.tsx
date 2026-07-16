import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { createExpense } from '@/api/expenses'
import Button from '@/components/common/Button/Button'
import FileUploadModal from '@/components/common/FileUploadModal/FileUploadModal'
import { ROUTE_PATHS } from '@/routes/routePaths'
import type { ExpenseDetail } from '@/types/expense'
import styles from './ExpenseInputPage.module.css'

type EntryMode = 'foreign' | 'krw'

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
  { id: 'other', label: '기타', symbol: '•••' },
]

const exchangeRates: Record<string, number> = {
  USD: 1499.07,
  EUR: 1711.83,
  JPY: 9.23,
}

function getTodayDateInputValue() {
  const now = new Date()
  const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return localTime.toISOString().slice(0, 10)
}

function ExpenseInputPage() {
  const navigate = useNavigate()
  const [entryMode, setEntryMode] = useState<EntryMode>('foreign')
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

  const activeCurrency = entryMode === 'krw' ? 'KRW' : currency
  const rate = entryMode === 'krw' ? 1 : exchangeRates[currency]
  const numericAmount = Number(amount) || 0
  const convertedAmount = Math.floor(numericAmount * rate)
  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === categoryId) ?? categories[0],
    [categoryId],
  )

  const handleModeChange = (mode: EntryMode) => {
    setEntryMode(mode)
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
      navigate(ROUTE_PATHS.expenses)
    } catch {
      setErrorMessage('지출을 저장하지 못했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className={styles.page} aria-labelledby="expense-input-title">
      <h1 id="expense-input-title" className={styles.srOnly}>지출 입력</h1>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.formToolbar}>
          <div className={styles.modeSwitch} aria-label="지출 입력 통화 기준">
            <button className={entryMode === 'foreign' ? styles.activeMode : ''} type="button" aria-pressed={entryMode === 'foreign'} onClick={() => handleModeChange('foreign')}>외화로 입력</button>
            <button className={entryMode === 'krw' ? styles.activeMode : ''} type="button" aria-pressed={entryMode === 'krw'} onClick={() => handleModeChange('krw')}>원화로 입력</button>
          </div>
          <button className={styles.uploadButton} type="button" aria-label="지출 파일 업로드" onClick={() => setIsUploadOpen(true)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V3m0 0L7.5 7.5M12 3l4.5 4.5M5 13v7h14v-7" /></svg>
          </button>
        </div>

        {uploadedFileName && <p className={styles.uploadStatus}>선택된 파일: {uploadedFileName}</p>}

        <div className={styles.twoColumns}>
          <label className={styles.field}>
            <span>통화</span>
            {entryMode === 'foreign' ? (
              <span className={styles.currencySelectWrap}>
                <img src={`/assets/icons/currencies/currency-${currency.toLowerCase()}.png`} alt="" aria-hidden="true" />
                <select value={currency} onChange={(event) => setCurrency(event.target.value)} aria-label="통화 선택">
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="JPY">JPY</option>
                </select>
              </span>
            ) : (
              <span className={styles.readOnlyCurrency}>₩ <strong>KRW</strong></span>
            )}
          </label>

          <label className={styles.field}>
            <span className={styles.amountLabel}>지출 금액 <small><b>적용 환율</b> {rate.toLocaleString('ko-KR')} KRW</small></span>
            <span className={styles.amountInputWrap}>
              <b>{entryMode === 'krw' ? '₩' : activeCurrency === 'USD' ? '$' : activeCurrency === 'EUR' ? '€' : '¥'}</b>
              <input value={amount} inputMode="decimal" aria-label="지출 금액" onChange={(event) => setAmount(event.target.value.replace(/[^\d.]/g, ''))} />
              <small>{activeCurrency}</small>
            </span>
          </label>

          <label className={styles.field}>
            <span>지출 날짜</span>
            <input type="date" value={spentAt} onChange={(event) => setSpentAt(event.target.value)} />
          </label>

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
            <span><small>KRW</small> {convertedAmount.toLocaleString('ko-KR')}</span>
          </div>
          <div className={styles.previewRow}>
            <span>카테고리</span>
            <strong>
              {selectedCategory.iconSrc ? <img src={selectedCategory.iconSrc} alt="" aria-hidden="true" /> : <span aria-hidden="true">{selectedCategory.symbol}</span>}
              {selectedCategory.label}
            </strong>
          </div>
          <hr />
          <div className={styles.budgetHeading}><span>예산 사용 현황</span><strong>72%</strong></div>
          <div className={styles.progressTrack}><span /></div>
          <div className={styles.remaining}><span>남은 예산</span><strong>₩ 820,000</strong></div>
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
