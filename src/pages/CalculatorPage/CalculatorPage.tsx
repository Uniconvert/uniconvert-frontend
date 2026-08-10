import { useCallback, useEffect, useRef, useState } from 'react'
import styles from './CalculatorPage.module.css'
import ModalShell from '@/components/common/ModalShell/ModalShell'
import FloatingMascot from '@/components/common/FloatingMascot/FloatingMascot'
import {
  getCurrentExchangeRate,
  getExchangeQuote,
  getExchangeQuoteHistory
} from '@/api/exchangeRates'
import type { ExchangeQuoteHistoryDto } from '@/api/exchangeRates'

const currencies = ['USD', 'EUR', 'JPY', 'KRW', 'CNY']

const currencyNames: Record<string, string> = {
  USD: '미국 달러',
  EUR: '유로',
  JPY: '일본 엔',
  KRW: '대한민국 원',
  CNY: '중국 위안',
}

function CalculatorPage() {
  const [fromCurrency, setFromCurrency] = useState('USD')
  const [isFromOpen, setIsFromOpen] = useState(false)
  const [fromAmount, setFromAmount] = useState('')

  const [toCurrency, setToCurrency] = useState('KRW')
  const [isToOpen, setIsToOpen] = useState(false)
  const [toAmount, setToAmount] = useState('')

  const [debouncedAmount, setDebouncedAmount] = useState(0)
  const [rateInfo, setRateInfo] = useState<{ date: string; rate: number } | null>(null)
  const [changeRate, setChangeRate] = useState<number | null>(null)

  const [historyList, setHistoryList] = useState<ExchangeQuoteHistoryDto[]>([])
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)

  const fromSelectRef = useRef<HTMLDivElement>(null)
  const toSelectRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fromSelectRef.current && !fromSelectRef.current.contains(event.target as Node)) setIsFromOpen(false)
      if (toSelectRef.current && !toSelectRef.current.contains(event.target as Node)) setIsToOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => { document.removeEventListener('mousedown', handleClickOutside) }
  }, [])

  const fetchHistory = useCallback(() => {
    getExchangeQuoteHistory(0, 20)
      .then((data) => setHistoryList(data || []))
      .catch((err) => console.error('Failed to fetch history:', err))
  }, [])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  useEffect(() => {
    let isActive = true
    getCurrentExchangeRate(fromCurrency, toCurrency)
      .then((res) => {
        if (isActive && res.changeRate !== undefined) {
          setChangeRate(res.changeRate)
        }
      })
      .catch(() => { if (isActive) setChangeRate(null) })
    return () => { isActive = false }
  }, [fromCurrency, toCurrency])

  useEffect(() => {
    const numericAmount = Number(fromAmount.replace(/,/g, '')) || 0
    const timer = setTimeout(() => setDebouncedAmount(numericAmount), 500)
    return () => clearTimeout(timer)
  }, [fromAmount])

  useEffect(() => {
    if (debouncedAmount <= 0) {
      setToAmount('')
      setRateInfo(null)
      return
    }

    let isActive = true
    getExchangeQuote(fromCurrency, toCurrency, debouncedAmount)
      .then((res) => {
        if (isActive) {
          const converted = res.convertedAmount ?? 0
          setToAmount(converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))

          if (res.rateDate && res.appliedRate) {
            setRateInfo({ date: res.rateDate, rate: res.appliedRate })
          }

          fetchHistory()
        }
      })
      .catch(() => { if (isActive) setToAmount('오류 발생') })

    return () => { isActive = false }
  }, [debouncedAmount, fromCurrency, toCurrency, fetchHistory])

  const handleSwap = () => {
    setFromCurrency(toCurrency)
    setToCurrency(fromCurrency)
    if (toAmount && toAmount !== '오류 발생') {
      const cleanToAmount = toAmount.replace(/,/g, '')
      setFromAmount(cleanToAmount)
    }
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let rawValue = e.target.value.replace(/[^0-9.]/g, '')
    const parts = rawValue.split('.')
    if (parts.length > 2) rawValue = parts[0] + '.' + parts.slice(1).join('')
    if (!rawValue) { setFromAmount(''); return }

    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",")
    const decimalPart = parts.length > 1 ? '.' + parts[1] : ''
    setFromAmount(integerPart + decimalPart)
  }

  const handleAddAmount = (addValue: number) => {
    const currentNum = Number(fromAmount.replace(/,/g, '')) || 0
    setFromAmount((currentNum + addValue).toLocaleString())
  }

  const getMascotMessage = () => {
    if (changeRate === null || changeRate === undefined) return "환율을 바로 적용하는 계산기를 사용해보세요!"
    if (changeRate === 0) return "오늘 환율은 전일과 동일해요."
    const absRate = Math.abs(changeRate)
    const action = changeRate > 0 ? '증가' : '감소'
    return `오늘 환율이 ${absRate}% ${action}했어요`
  }

  const formatHistoryTime = (isoString?: string) => {
  if (!isoString) return ''

  const normalizedString = isoString.endsWith('Z') || isoString.includes('+') 
    ? isoString 
    : isoString + 'Z'

  const d = new Date(normalizedString)
  
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const mins = String(d.getMinutes()).padStart(2, '0')
  
  return `${month}.${day} ${hours}:${mins}`
}

  return (
    <section className={styles.page}>
      <div className={styles.pageHeader}>
        <h1>환율 계산기</h1>
        <p>당일 환율로 간편하게 계산해보세요</p>
      </div>

      <div className={styles.contentWrapper}>
        <div className={styles.exchangeArea}>

          {/* From 카드 */}
          <div className={styles.calcCard}>
            <h2 className={styles.cardTitle}>From</h2>
            <div className={styles.customSelect} ref={fromSelectRef}>
              <button
                className={styles.currencySelectWrap}
                type="button"
                aria-expanded={isFromOpen}
                onClick={() => { setIsFromOpen((o) => !o); setIsToOpen(false) }}
              >
                <div className={styles.flagWrap}>
                  <img src={`/assets/icons/currencies/currency-${fromCurrency.toLowerCase()}.png`} alt="" aria-hidden="true" />
                  <span>{fromCurrency}</span>
                </div>
                <span className={styles.chevronDown} aria-hidden="true" />
              </button>
              {isFromOpen && (
                <div className={styles.currencyMenu} role="listbox">
                  {currencies.map((option) => (
                    <button
                      key={`from-${option}`}
                      type="button"
                      role="option"
                      aria-selected={fromCurrency === option}
                      onClick={() => { setFromCurrency(option); setIsFromOpen(false) }}
                    >
                      <img src={`/assets/icons/currencies/currency-${option.toLowerCase()}.png`} alt="" aria-hidden="true" />
                      <span>{option}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.inputGroup}>
              <span className={styles.inputLabel}>금액 입력</span>
              <div className={styles.amountBox}>
                <input
                  type="text"
                  value={fromAmount}
                  onChange={handleAmountChange}
                  placeholder="0"
                  style={{ border: 'none', outline: 'none', width: '100%', fontSize: '1.25rem', fontWeight: 500, background: 'transparent' }}
                />
              </div>
            </div>

            <div className={styles.quickButtons}>
              <button type="button" className={styles.quickBtn} onClick={() => handleAddAmount(100)}>+ 100</button>
              <button type="button" className={styles.quickBtn} onClick={() => handleAddAmount(500)}>+ 500</button>
              <button type="button" className={styles.quickBtn} onClick={() => handleAddAmount(1000)}>+ 1000</button>
              <button type="button" className={styles.quickBtn} onClick={() => setFromAmount('0')}>Clear</button>
            </div>
          </div>

          <button type="button" aria-label="환전 방향 바꾸기" onClick={handleSwap} className={styles.swapBtn}>
            <img src="/assets/icons/actions/exchange-button.png" alt="" aria-hidden="true" className={styles.swapIcon} />
          </button>

          {/* To 카드 */}
          <div className={styles.calcCard}>
            <h2 className={styles.cardTitle}>To</h2>
            <div className={styles.customSelect} ref={toSelectRef}>
              <button
                className={styles.currencySelectWrap}
                type="button"
                aria-expanded={isToOpen}
                onClick={() => { setIsToOpen((o) => !o); setIsFromOpen(false) }}
              >
                <div className={styles.flagWrap}>
                  <img src={`/assets/icons/currencies/currency-${toCurrency.toLowerCase()}.png`} alt="" aria-hidden="true" />
                  <span>{toCurrency}</span>
                </div>
                <span className={styles.chevronDown} aria-hidden="true" />
              </button>
              {isToOpen && (
                <div className={styles.currencyMenu} role="listbox">
                  {currencies.map((option) => (
                    <button
                      key={`to-${option}`}
                      type="button"
                      role="option"
                      aria-selected={toCurrency === option}
                      onClick={() => { setToCurrency(option); setIsToOpen(false) }}
                    >
                      <img src={`/assets/icons/currencies/currency-${option.toLowerCase()}.png`} alt="" aria-hidden="true" />
                      <span>{option}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.inputGroup}>
              <span className={styles.inputLabel}>계산 결과</span>
              <div className={styles.amountBox}>
                <input
                  type="text"
                  value={toAmount}
                  readOnly
                  placeholder="0"
                  style={{ border: 'none', outline: 'none', width: '100%', fontSize: '1.25rem', fontWeight: 500, background: 'transparent' }}
                />
              </div>
            </div>

            <div className={styles.statusMessage} style={{ visibility: rateInfo ? 'visible' : 'hidden' }}>
              <span className={styles.statusDot} />
              <span>{rateInfo?.date.replace(/-/g, '.')} 환율이 적용되었습니다.</span>
            </div>
          </div>
        </div>

        <div className={styles.historyArea}>
          <div className={styles.historyHeader}>
            <h2>최근 계산 내역</h2>
            <button type="button" className={styles.viewAllBtn} onClick={() => setIsHistoryModalOpen(true)}>
              전체 보기 <span className={styles.chevronRight}></span>
            </button>
          </div>

          <div className={styles.historyList}>
            {historyList.length === 0 ? (
              <p style={{ color: '#90b6d9', padding: '24px', textAlign: 'center' }}>최근 계산 내역이 없습니다.</p>
            ) : (
              historyList.slice(0, 3).map((item, index) => (
                <div key={item.id ?? index} className={`${styles.historyItem} ${index === 0 ? styles.active : ''}`}>
                  <div className={styles.historyInfo}>
                    <img
                      src={`/assets/icons/currencies/currency-${(item.fromCurrency || 'default').toLowerCase()}.png`}
                      alt=""
                      aria-hidden="true"
                      style={{ width: '2.5rem', height: '1.5rem', objectFit: 'contain' }}
                      onError={(e) => { e.currentTarget.src = '/assets/icons/currencies/currency-default.png' }}
                    />
                    <div className={styles.historyText}>
                      {(item.amount ?? 0).toLocaleString()} {item.fromCurrency}
                      <span>→ {(item.convertedAmount ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} {item.toCurrency}</span>
                    </div>
                  </div>
                  <span className={styles.historyTime}>{formatHistoryTime(item.createdAt)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {isHistoryModalOpen && (
        <ModalShell
          title="최근 계산 내역"
          titleId="history-modal-title"
          width="52rem"
          onClose={() => setIsHistoryModalOpen(false)}
        >
          <div className={styles.modalHistoryContainer}>
            <div className={styles.modalHistoryList}>
              {historyList.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#90b6d9', padding: '24px' }}>내역이 없습니다.</p>
              ) : (
                historyList.map((item, index) => (
                  <div key={`modal-item-${item.id ?? index}`} className={styles.modalHistoryItem}>
                    <div className={styles.modalHistoryInfo}>
                      <img
                        src={`/assets/icons/currencies/currency-${(item.fromCurrency || 'default').toLowerCase()}.png`}
                        alt=""
                        aria-hidden="true"
                        style={{ width: '3rem', height: '1.8rem', objectFit: 'contain' }}
                        onError={(e) => { e.currentTarget.src = '/assets/icons/currencies/currency-default.png' }}
                      />
                      <div className={styles.currencyTextGroup}>
                        <span className={styles.currencyCodeText}>{item.fromCurrency}</span>
                        <span className={styles.currencySubText}>{item.fromCurrency ? currencyNames[item.fromCurrency] : ''}</span>
                      </div>
                      <div className={styles.modalHistoryCalcText}>
                        {(item.amount ?? 0).toLocaleString()} {item.fromCurrency}
                        <span>→</span>
                        <span className={styles.resultText}>
                          {(item.convertedAmount ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} {item.toCurrency}
                        </span>
                      </div>
                    </div>
                    <span className={styles.modalHistoryTime}>{formatHistoryTime(item.createdAt)}</span>
                  </div>
                ))
              )}
            </div>

            {historyList.length > 0 && (
              <div className={styles.pagination}>
                <button type="button" className={styles.pageNavBtn} aria-label="이전 페이지"><span className={styles.chevronLeft}></span></button>
                <button type="button" className={styles.pageNumberBtn}>1</button>
                <button type="button" className={styles.pageNavBtn} aria-label="다음 페이지"><span className={styles.chevronRight}></span></button>
              </div>
            )}
          </div>
        </ModalShell>
      )}

      <div className={styles.mascotArea} aria-hidden="true">
        <FloatingMascot message={getMascotMessage()} imageSrc="/assets/illustrations/mascot-check.png" />
      </div>
    </section>
  )
}

export default CalculatorPage
