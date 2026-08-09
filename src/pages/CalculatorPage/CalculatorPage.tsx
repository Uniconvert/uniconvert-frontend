import { useEffect, useRef, useState } from 'react'
import styles from './CalculatorPage.module.css'
import { convertCurrencyAmount } from '@/utils/exchangeRate'
import { useExchangeCalculatorData } from '@/hooks/useExchangeCalculatorData'
import { isUsingMockExchangeApi } from '@/api/exchangeRates'
import ModalShell from '@/components/common/ModalShell/ModalShell';
import FloatingMascot from '@/components/common/FloatingMascot/FloatingMascot';

// 지원하는 통화 목록
const currencies = ['USD', 'EUR', 'JPY', 'KRW', 'CNY']

interface HistoryItem {
  id: number
  currencyCode: string
  code: string
  name: string
  text: string
  result: string
  time: string
  isActive: boolean
}

const fallbackHistoryData: HistoryItem[] = [
  {
    id: 1,
    currencyCode: 'usd',
    code: 'USD',
    name: '미국 달러',
    text: '1,000 USD',
    result: '1,350,000 KRW',
    time: '방금전',
    isActive: true
  },
  {
    id: 2,
    currencyCode: 'eur',
    code: 'EUR',
    name: '유로',
    text: '500 EUR',
    result: '750,000 KRW',
    time: '방금전',
    isActive: false
  },
  {
    id: 3,
    currencyCode: 'jpy',
    code: 'JPY',
    name: '일본 엔',
    text: '10,000 JPY',
    result: '90,000 KRW',
    time: '방금전',
    isActive: false
  },
]

function CalculatorPage() {
  const [fromCurrency, setFromCurrency] = useState('USD')
  const [isFromOpen, setIsFromOpen] = useState(false)
  const [fromAmount, setFromAmount] = useState('')

  const [toCurrency, setToCurrency] = useState('KRW')
  const [isToOpen, setIsToOpen] = useState(false)

  const fromSelectRef = useRef<HTMLDivElement>(null)
  const toSelectRef = useRef<HTMLDivElement>(null)

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fromSelectRef.current && !fromSelectRef.current.contains(event.target as Node)) {
        setIsFromOpen(false)
      }
      if (toSelectRef.current && !toSelectRef.current.contains(event.target as Node)) {
        setIsToOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleSwap = () => {
    setFromCurrency(toCurrency)
    setToCurrency(fromCurrency)

    const numericFromAmount = Number(fromAmount.replace(/,/g, '')) || 0
    if (numericFromAmount > 0) {
      const calculatedResult = convertCurrencyAmount(numericFromAmount, fromCurrency, toCurrency)

      const swappedAmount = Number(calculatedResult.toFixed(2)).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
      setFromAmount(swappedAmount)
    }
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let rawValue = e.target.value.replace(/[^0-9.]/g, '')

    const parts = rawValue.split('.')
    if (parts.length > 2) {
      rawValue = parts[0] + '.' + parts.slice(1).join('')
    }

    if (!rawValue) {
      setFromAmount('')
      return
    }

    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",")
    const decimalPart = parts.length > 1 ? '.' + parts[1] : ''

    setFromAmount(integerPart + decimalPart)
  }

  const handleAddAmount = (addValue: number) => {
    const currentNum = Number(fromAmount.replace(/,/g, '')) || 0
    setFromAmount((currentNum + addValue).toLocaleString())
  }

  const numericFromAmount = Number(fromAmount.replace(/,/g, '')) || 0
  const {
    quote,
    quoteError,
    historyItems,
    isHistoryLoading,
    historyError,
  } = useExchangeCalculatorData({
    fromCurrency,
    toCurrency,
    amount: numericFromAmount,
  })
  const historyData = historyItems.length > 0
    ? historyItems.map((item, index) => {
        const from = item.fromCurrency?.toUpperCase() || 'USD'
        const to = item.toCurrency?.toUpperCase() || 'KRW'
        const historyAmount = item.amount ?? 0
        const converted = item.convertedAmount ?? 0
        return {
          id: item.id ?? index,
          currencyCode: from.toLowerCase(),
          code: from,
          name: from,
          text: `${historyAmount.toLocaleString()} ${from}`,
          result: `${converted.toLocaleString()} ${to}`,
          time: item.createdAt ? new Date(item.createdAt).toLocaleString() : '',
          isActive: index === 0,
        }
      })
    : isUsingMockExchangeApi
      ? fallbackHistoryData
      : []

  const isCurrentQuote = quote?.fromCurrency === fromCurrency
    && quote?.toCurrency === toCurrency
    && quote?.amount === numericFromAmount
  const serverConvertedAmount = isCurrentQuote
    && quote.available !== false
    && typeof quote.convertedAmount === 'number'
    ? quote.convertedAmount
    : null
  const hasAvailableQuote = serverConvertedAmount !== null
  const calculatedResult = hasAvailableQuote
    ? serverConvertedAmount
    : isUsingMockExchangeApi
      ? convertCurrencyAmount(numericFromAmount, fromCurrency, toCurrency)
      : null

  const toAmount = numericFromAmount === 0 || calculatedResult === null
    ? ''
    : Number(calculatedResult.toFixed(2)).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })

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

            {/* From 통화 선택 드롭다운 */}
            <div className={styles.customSelect} ref={fromSelectRef}>
              <button
                className={styles.currencySelectWrap}
                type="button"
                aria-label="보낼 통화 선택"
                aria-expanded={isFromOpen}
                onClick={() => {
                  setIsFromOpen((open) => !open)
                  setIsToOpen(false)
                }}
              >
                <div className={styles.flagWrap}>
                  <img src={`/assets/icons/currencies/currency-${fromCurrency.toLowerCase()}.png`} alt="" aria-hidden="true" />
                  <span>{fromCurrency}</span>
                </div>
                <span className={styles.chevronDown} aria-hidden="true" />
              </button>

              {isFromOpen && (
                <div className={styles.currencyMenu} role="listbox" aria-label="통화 목록">
                  {currencies.map((option) => (
                    <button
                      key={`from-${option}`}
                      type="button"
                      role="option"
                      aria-selected={fromCurrency === option}
                      onClick={() => {
                        setFromCurrency(option)
                        setIsFromOpen(false)
                      }}
                    >
                      <img src={`/assets/icons/currencies/currency-${option.toLowerCase()}.png`} alt="" aria-hidden="true" />
                      <span>{option}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* From 금액 입력 */}
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

            {/* 퀵 버튼 그룹 */}
            <div className={styles.quickButtons}>
              <button type="button" className={styles.quickBtn} onClick={() => handleAddAmount(100)}>+ 100</button>
              <button type="button" className={styles.quickBtn} onClick={() => handleAddAmount(500)}>+ 500</button>
              <button type="button" className={styles.quickBtn} onClick={() => handleAddAmount(1000)}>+ 1000</button>
              <button type="button" className={styles.quickBtn} onClick={() => setFromAmount('0')}>Clear</button>
            </div>
          </div>

          {/* 중앙 교체(Swap) 버튼 */}
          <button type="button" aria-label="환전 방향 바꾸기" onClick={handleSwap} className={styles.swapBtn}>
            <img
              src="/assets/icons/actions/exchange-button.png"
              alt=""
              aria-hidden="true"
              className={styles.swapIcon}
            />
          </button>

          {/* To 카드 */}
          <div className={styles.calcCard}>
            <h2 className={styles.cardTitle}>To</h2>

            {/* To 통화 선택 드롭다운 */}
            <div className={styles.customSelect} ref={toSelectRef}>
              <button
                className={styles.currencySelectWrap}
                type="button"
                aria-label="받을 통화 선택"
                aria-expanded={isToOpen}
                onClick={() => {
                  setIsToOpen((open) => !open)
                  setIsFromOpen(false)
                }}
              >
                <div className={styles.flagWrap}>
                  <img src={`/assets/icons/currencies/currency-${toCurrency.toLowerCase()}.png`} alt="" aria-hidden="true" />
                  <span>{toCurrency}</span>
                </div>
                <span className={styles.chevronDown} aria-hidden="true" />
              </button>

              {isToOpen && (
                <div className={styles.currencyMenu} role="listbox" aria-label="통화 목록">
                  {currencies.map((option) => (
                    <button
                      key={`to-${option}`}
                      type="button"
                      role="option"
                      aria-selected={toCurrency === option}
                      onClick={() => {
                        setToCurrency(option)
                        setIsToOpen(false)
                      }}
                    >
                      <img src={`/assets/icons/currencies/currency-${option.toLowerCase()}.png`} alt="" aria-hidden="true" />
                      <span>{option}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* To 계산 결과 금액 */}
            <div className={styles.inputGroup}>
              <span className={styles.inputLabel}>계산 결과</span>
              <div className={styles.amountBox}>
                <input
                  type="text"
                  value={toAmount}
                  readOnly
                  style={{ border: 'none', outline: 'none', width: '100%', fontSize: '1.25rem', fontWeight: 500, background: 'transparent' }}
                />
              </div>
            </div>

            <div className={styles.statusMessage}>
              <span className={styles.statusDot} />
              <span>
                {quoteError
                  || (hasAvailableQuote
                    ? `${quote?.rateDate ?? '최신'} 환율이 적용되었습니다.`
                    : numericFromAmount > 0
                      ? '환율 정보를 불러오는 중입니다.'
                      : '금액을 입력하면 환율을 계산합니다.')}
              </span>
            </div>
          </div>
        </div>

        {/* 2. 최근 계산 내역 영역 */}
        <div className={styles.historyArea}>
          <div className={styles.historyHeader}>
            <h2>최근 계산 내역</h2>
            <button
              type="button"
              className={styles.viewAllBtn}
              onClick={() => setIsHistoryModalOpen(true)}
            >
              전체 보기 <span className={styles.chevronRight}></span>
            </button>
          </div>

          <div className={styles.historyList}>
            {isHistoryLoading && !isUsingMockExchangeApi && (
              <p className={styles.emptyHistory}>계산 내역을 불러오는 중입니다.</p>
            )}
            {!isHistoryLoading && historyError && (
              <p className={styles.emptyHistory} role="alert">{historyError}</p>
            )}
            {!isHistoryLoading && !historyError && historyData.length === 0 && (
              <p className={styles.emptyHistory}>최근 계산 내역이 없습니다.</p>
            )}
            {historyData.map((item, index) => (
              <div
                key={item.id}
                className={`${styles.historyItem} ${index === 0 ? styles.active : ''}`}
              >
                <div className={styles.historyInfo}>
                  <img
                    src={`/assets/icons/currencies/currency-${item.currencyCode}.png`}
                    alt=""
                    aria-hidden="true"
                    style={{ width: '2.5rem', height: '1.5rem', objectFit: 'contain' }}
                  />
                  <div className={styles.historyText}>
                    {item.text} <span>→ {item.result}</span> 
                  </div>
                </div>
                <span className={styles.historyTime}>{item.time}</span>
              </div>
            ))}
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
              {isHistoryLoading && !isUsingMockExchangeApi && (
                <p className={styles.emptyHistory}>계산 내역을 불러오는 중입니다.</p>
              )}
              {!isHistoryLoading && historyError && (
                <p className={styles.emptyHistory} role="alert">{historyError}</p>
              )}
              {!isHistoryLoading && !historyError && historyData.length === 0 && (
                <p className={styles.emptyHistory}>최근 계산 내역이 없습니다.</p>
              )}
              {historyData.map((item) => (
                <div key={`modal-item-${item.id}`} className={styles.modalHistoryItem}>
                  <div className={styles.modalHistoryInfo}>
                    <img
                      src={`/assets/icons/currencies/currency-${item.currencyCode}.png`}
                      alt=""
                      aria-hidden="true"
                      style={{ width: '3rem', height: '1.8rem', objectFit: 'contain' }}
                    />
                    <div className={styles.currencyTextGroup}>
                      <span className={styles.currencyCodeText}>{item.code}</span>
                      <span className={styles.currencySubText}>{item.name}</span>
                    </div>
                    <div className={styles.modalHistoryCalcText}>
                      {item.text}
                      <span>→</span>
                      <span className={styles.resultText}>{item.result}</span>
                    </div>
                  </div>
                  <span className={styles.modalHistoryTime}>{item.time}</span>
                </div>
              ))}
            </div>

            {historyData.length > 0 && <div className={styles.pagination}>
              <button type="button" className={styles.pageNavBtn} aria-label="이전 페이지">
                <span className={styles.chevronLeft}></span>
              </button>

              <button type="button" className={styles.pageNumberBtn}>1</button>

              <button type="button" className={styles.pageNavBtn} aria-label="다음 페이지">
                <span className={styles.chevronRight}></span>
              </button>
            </div>}
          </div>
        </ModalShell>
      )}

      <div className={styles.mascotArea} aria-hidden="true">
        <FloatingMascot
          message="환율을 바로 적용하는 계산기를 사용해보세요!"
          imageSrc="/assets/illustrations/mascot-check.png"
        />
      </div>
    </section>
  )
}
export default CalculatorPage
