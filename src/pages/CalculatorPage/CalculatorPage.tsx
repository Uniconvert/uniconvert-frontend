import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styles from './CalculatorPage.module.css'
import ModalShell from '@/components/common/ModalShell/ModalShell'
import FloatingMascot from '@/components/common/FloatingMascot/FloatingMascot'
import { getExchangeQuote, getExchangeQuoteHistory } from '@/api/exchangeRates'
import type { ExchangeQuoteHistoryDto } from '@/api/exchangeRates'
import { useI18n } from '@/i18n/I18nContext'
import { useExchangeRateQuery } from '@/hooks/useExchangeRateQuery'

const currencies = ['USD', 'EUR', 'JPY', 'KRW', 'CNY']
const CALCULATION_ERROR = '__CALCULATION_ERROR__'

function CalculatorPage() {
  const { locale, t } = useI18n()
  const [fromCurrency, setFromCurrency] = useState('USD')
  const [toCurrency, setToCurrency] = useState('KRW')
  const [isFromOpen, setIsFromOpen] = useState(false)
  const [isToOpen, setIsToOpen] = useState(false)
  const [fromAmount, setFromAmount] = useState('')
  const [toAmount, setToAmount] = useState('')
  const [debouncedAmount, setDebouncedAmount] = useState(0)
  const [rateInfo, setRateInfo] = useState<{ date: string; rate: number } | null>(null)
  const currentRateQuery = useExchangeRateQuery(fromCurrency, toCurrency)
  const changeRate = currentRateQuery.data?.changeRate ?? null
  const [historyList, setHistoryList] = useState<ExchangeQuoteHistoryDto[]>([])
  const [historyError, setHistoryError] = useState('')
  const [isHistoryLoading, setIsHistoryLoading] = useState(true)
  const [quoteError, setQuoteError] = useState('')
  const [isQuoteLoading, setIsQuoteLoading] = useState(false)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const isSwapRef = useRef(false)
  const fromSelectRef = useRef<HTMLDivElement>(null)
  const toSelectRef = useRef<HTMLDivElement>(null)

  const fetchHistory = useCallback(() => {
    getExchangeQuoteHistory(0, 20)
      .then((data) => { setHistoryList(data || []); setHistoryError('') })
      .catch(() => { setHistoryList([]); setHistoryError(t('calculator.historyLoadError')) })
      .finally(() => setIsHistoryLoading(false))
  }, [t])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fromSelectRef.current && !fromSelectRef.current.contains(event.target as Node)) setIsFromOpen(false)
      if (toSelectRef.current && !toSelectRef.current.contains(event.target as Node)) setIsToOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedAmount(Number(fromAmount.replaceAll(',', '')) || 0)
    }, 500)
    return () => window.clearTimeout(timer)
  }, [fromAmount])

  useEffect(() => {
    if (debouncedAmount <= 0) return
    let isActive = true
    const amount = fromCurrency === 'KRW' ? Math.round(debouncedAmount) : debouncedAmount

    getExchangeQuote(fromCurrency, toCurrency, amount)
      .then((result) => {
        if (!isActive) return
        const convertedAmount = result.convertedAmount ?? 0
        setToAmount(convertedAmount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
        setRateInfo(result.rateDate && result.appliedRate ? { date: result.rateDate, rate: result.appliedRate } : null)
        setQuoteError('')
        fetchHistory()
      })
      .catch(() => {
        if (isActive) {
          setToAmount(CALCULATION_ERROR)
          setRateInfo(null)
          setQuoteError(t('calculator.quoteLoadError'))
        }
      })
      .finally(() => { if (isActive) setIsQuoteLoading(false) })

    window.setTimeout(() => { if (isActive) { setIsQuoteLoading(true); setQuoteError('') } }, 0)

    return () => { isActive = false }
  }, [debouncedAmount, fetchHistory, fromCurrency, locale, t, toCurrency])

  const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    let rawValue = event.target.value.replace(/[^0-9.]/g, '')
    const parts = rawValue.split('.')
    if (parts.length > 2) rawValue = `${parts[0]}.${parts.slice(1).join('')}`
    if (!rawValue) {
      setFromAmount('')
      setToAmount('')
      setRateInfo(null)
      return
    }
    const formatted = `${parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${parts.length > 1 ? `.${parts[1]}` : ''}`
    setFromAmount(formatted)
    if (Number(rawValue) <= 0) {
      setToAmount('')
      setRateInfo(null)
    }
  }

  const handleSwap = () => {
    isSwapRef.current = true
    setFromCurrency(toCurrency)
    setToCurrency(fromCurrency)
    setFromAmount(toAmount && toAmount !== CALCULATION_ERROR ? toAmount : '')
  }

  const mascotMessages = useMemo(() => {
    if (changeRate === null) {
      return [t('calculator.mascotDefault'), t('calculator.mascotQuick'), t('calculator.mascotHelp')]
    }
    if (changeRate === 0) {
      return [t('calculator.mascotSame'), t('calculator.mascotQuick'), t('calculator.mascotHelp')]
    }
    return [
      t('calculator.mascotChange', { rate: Math.abs(changeRate), direction: t(changeRate > 0 ? 'calculator.increase' : 'calculator.decrease') }),
      t('calculator.mascotQuick'),
      t('calculator.mascotHelp'),
    ]
  }, [changeRate, t])

  const formatHistoryTime = (value?: string) => {
    if (!value) return ''
    const date = new Date(value.endsWith('Z') || value.includes('+') ? value : `${value}Z`)
    return Number.isNaN(date.getTime())
      ? ''
      : new Intl.DateTimeFormat(locale, { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(date)
  }

  const currencySelector = (
    selected: string,
    isOpen: boolean,
    onToggle: () => void,
    onSelect: (currency: string) => void,
    selectRef: React.RefObject<HTMLDivElement | null>,
  ) => (
    <div className={styles.customSelect} ref={selectRef}>
      <button className={styles.currencySelectWrap} type="button" aria-expanded={isOpen} onClick={onToggle}>
        <div className={styles.flagWrap}>
          <img src={`/assets/icons/currencies/currency-${selected.toLowerCase()}.png`} alt="" aria-hidden="true" />
          <span>{selected}</span>
        </div>
        <span className={styles.chevronDown} aria-hidden="true" />
      </button>
      {isOpen && (
        <div className={styles.currencyMenu} role="listbox">
          {currencies.map((currency) => (
            <button key={currency} type="button" role="option" aria-selected={selected === currency} onClick={() => onSelect(currency)}>
              <img src={`/assets/icons/currencies/currency-${currency.toLowerCase()}.png`} alt="" aria-hidden="true" />
              <span>{currency}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <section className={styles.page}>
      <div className={styles.pageHeader}>
        <h1>{t('calculator.title')}</h1>
        <p>{t('calculator.description')}</p>
      </div>

      <div className={styles.contentWrapper}>
        <div className={styles.exchangeArea}>
          <div className={styles.calcCard}>
            <h2 className={styles.cardTitle}>From</h2>
            {currencySelector(fromCurrency, isFromOpen, () => { setIsFromOpen((open) => !open); setIsToOpen(false) }, (currency) => { setFromCurrency(currency); setIsFromOpen(false) }, fromSelectRef)}
            <div className={styles.inputGroup}>
              <span className={styles.inputLabel}>{t('calculator.amount')}</span>
              <div className={styles.amountBox}><input type="text" value={fromAmount} onChange={handleAmountChange} /></div>
            </div>
            <div className={styles.quickButtons}>
              {[100, 500, 1000].map((amount) => <button key={amount} type="button" className={styles.quickBtn} onClick={() => setFromAmount(((Number(fromAmount.replaceAll(',', '')) || 0) + amount).toLocaleString(locale))}>+ {amount}</button>)}
              <button type="button" className={styles.quickBtn} onClick={() => { setFromAmount(''); setToAmount(''); setRateInfo(null) }}>{t('calculator.clear')}</button>
            </div>
          </div>

          <button type="button" aria-label={t('calculator.swap')} onClick={handleSwap} className={styles.swapBtn}>
            <img src="/assets/icons/actions/exchange-button.png" alt="" aria-hidden="true" className={styles.swapIcon} />
          </button>

          <div className={styles.calcCard}>
            <h2 className={styles.cardTitle}>To</h2>
            {currencySelector(toCurrency, isToOpen, () => { setIsToOpen((open) => !open); setIsFromOpen(false) }, (currency) => { setToCurrency(currency); setIsToOpen(false) }, toSelectRef)}
            <div className={styles.inputGroup}>
              <span className={styles.inputLabel}>{t('calculator.result')}</span>
            <div className={styles.amountBox}><input type="text" value={toAmount === CALCULATION_ERROR ? t('calculator.error') : toAmount} readOnly /></div>
            </div>
            {isQuoteLoading && <p className={styles.statusMessage} role="status">환율을 계산하고 있어요.</p>}
            {quoteError && <p className={styles.statusMessage} role="alert">{quoteError}</p>}
            <div className={styles.statusMessage} style={{ visibility: rateInfo ? 'visible' : 'hidden' }}>
              <span className={styles.statusDot} />
              <span>{rateInfo ? t('calculator.rateApplied', { date: rateInfo.date.replaceAll('-', '.') }) : ''}</span>
            </div>
          </div>
        </div>

        <div className={styles.historyArea}>
          <div className={styles.historyHeader}>
            <h2>{t('calculator.history')}</h2>
            <button type="button" className={styles.viewAllBtn} onClick={() => setIsHistoryModalOpen(true)}>{t('calculator.viewAll')} <span className={styles.chevronRight} /></button>
          </div>
          <div className={styles.historyList}>
            {isHistoryLoading ? <p className={styles.historyMessage} role="status">최근 계산 내역을 불러오는 중이에요.</p> : historyError ? (
              <p className={styles.historyMessage} role="alert">{historyError} <button type="button" onClick={() => { setHistoryError(''); setIsHistoryLoading(true); fetchHistory() }}>다시 시도</button></p>
            ) : historyList.length === 0 ? (
              <div className={styles.historyEmptyState}>
                <img src="/assets/illustrations/mascot-checklist.png" alt="" aria-hidden="true" />
                <strong>{t('calculator.noHistory')}</strong>
                <p>{t('calculator.noHistoryDescription')}</p>
              </div>
            ) : historyList.slice(0, 3).map((item, index) => (
              <div key={item.id ?? index} className={`${styles.historyItem} ${index === 0 ? styles.active : ''}`}>
                <div className={styles.historyInfo}>
                  <img src={`/assets/icons/currencies/currency-${(item.fromCurrency || 'default').toLowerCase()}.png`} alt="" aria-hidden="true" onError={(event) => { event.currentTarget.src = '/assets/icons/currencies/currency-default.png' }} />
                  <div className={styles.historyText}>
                    <span className={styles.historySource}>{(item.amount ?? 0).toLocaleString(locale)} {item.fromCurrency}</span>
                    <span className={styles.historyArrow} aria-hidden="true">→</span>
                    <span className={styles.historyResult}>
                      <span>{(item.convertedAmount ?? 0).toLocaleString(locale, { maximumFractionDigits: 2 })}</span>
                      <span>{item.toCurrency}</span>
                    </span>
                  </div>
                </div>
                <span className={styles.historyTime}>{formatHistoryTime(item.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isHistoryModalOpen && <ModalShell title={t('calculator.history')} titleId="history-modal-title" closeLabel={t('calculator.closeHistory')} width="52rem" onClose={() => setIsHistoryModalOpen(false)}>
        <div className={styles.modalHistoryContainer}>
          <div className={styles.modalHistoryList}>
            {isHistoryLoading ? <p className={styles.historyMessage} role="status">최근 계산 내역을 불러오는 중이에요.</p> : historyError ? (
              <p className={styles.historyMessage} role="alert">{historyError} <button type="button" onClick={() => { setHistoryError(''); setIsHistoryLoading(true); fetchHistory() }}>다시 시도</button></p>
            ) : historyList.length === 0 ? (
              <div className={styles.modalHistoryEmptyState}>
                <img src="/assets/illustrations/mascot-checklist.png" alt="" aria-hidden="true" />
                <strong>{t('calculator.noHistory')}</strong>
                <p>{t('calculator.noHistoryDescription')}</p>
              </div>
            ) : historyList.map((item, index) => (
              <div key={`history-${item.id ?? index}`} className={styles.modalHistoryItem}>
                <div className={styles.modalHistoryInfo}>
                  <img src={`/assets/icons/currencies/currency-${(item.fromCurrency || 'default').toLowerCase()}.png`} alt="" aria-hidden="true" onError={(event) => { event.currentTarget.src = '/assets/icons/currencies/currency-default.png' }} />
                  <div className={styles.currencyTextGroup}><span className={styles.currencyCodeText}>{item.fromCurrency}</span><span className={styles.currencySubText}>{item.fromCurrency ? t(`currency.${item.fromCurrency}`) : ''}</span></div>
                  <div className={styles.modalHistoryCalcText}>{(item.amount ?? 0).toLocaleString(locale)} {item.fromCurrency}<span>→</span><span className={styles.resultText}>{(item.convertedAmount ?? 0).toLocaleString(locale, { maximumFractionDigits: 2 })} {item.toCurrency}</span></div>
                </div>
                <span className={styles.modalHistoryTime}>{formatHistoryTime(item.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      </ModalShell>}

      <div className={styles.mascotArea}><FloatingMascot messages={mascotMessages} imageSrc="/assets/illustrations/mascot-check.png" /></div>
    </section>
  )
}

export default CalculatorPage
