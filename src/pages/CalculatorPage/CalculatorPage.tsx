import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import styles from './CalculatorPage.module.css'
import ModalShell from '@/components/common/ModalShell/ModalShell'
import FloatingMascot from '@/components/common/FloatingMascot/FloatingMascot'
import { getCurrentExchangeRate, getExchangeQuote, getExchangeQuoteHistory } from '@/api/exchangeRates'
import { useI18n } from '@/i18n/I18nContext'
import { useExchangeRateQuery } from '@/hooks/useExchangeRateQuery'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { getOnboardingSettings } from '@/auth/session'
import { getCachedExchangeRate, setCachedExchangeRate } from '@/features/calculator/exchangeRateCache'
import LoadingState from '@/components/common/LoadingState/LoadingState'
import EmptyState from '@/components/common/EmptyState/EmptyState'
import ErrorState from '@/components/common/ErrorState/ErrorState'
import { useListboxKeyboard } from '@/hooks/useListboxKeyboard'
import { normalizeCurrencyCode, type CurrencyCode } from '@/types/currency'
import { ROUTE_PATHS } from '@/routes/routePaths'

const currencies: readonly CurrencyCode[] = ['USD', 'EUR', 'JPY', 'KRW', 'CNY']
const INITIAL_CACHE_CURRENCIES: readonly CurrencyCode[] = ['USD', 'EUR', 'JPY', 'CNY']
const SUPPORTED_LOCALES = ['ko-kr', 'en-us', 'ja-jp', 'zh-cn']

const CALCULATION_ERROR = '__CALCULATION_ERROR__'

function isUsableRate(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function convertAmount(amount: number, rate: number | null): number | null {
  return Number.isFinite(amount) && isUsableRate(rate) ? amount * rate : null
}

interface CurrencySelectorProps {
  selected: CurrencyCode
  disabledCurrency?: CurrencyCode
  isOpen: boolean
  showAssets: boolean
  onToggle: () => void
  onSelect: (currency: CurrencyCode) => void
}

function CurrencySelector({ selected, disabledCurrency, isOpen, showAssets, onToggle, onSelect }: CurrencySelectorProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const disabledIndices = disabledCurrency === undefined ? [] : [currencies.indexOf(disabledCurrency)]
  const {
    listboxId,
    activeDescendantId,
    onTriggerClick,
    onTriggerKeyDown,
    onOptionClick,
    onOptionPointerMove,
    getOptionId,
  } = useListboxKeyboard({
    open: isOpen,
    optionCount: currencies.length,
    selectedIndex: currencies.indexOf(selected),
    disabledIndices,
    onOpen: () => { if (!isOpen) onToggle() },
    onClose: () => { if (isOpen) onToggle() },
    onSelect: (index) => onSelect(currencies[index]),
    rootRef,
  })

  return (
    <div className={styles.customSelect} ref={rootRef}>
      <button
        className={styles.currencySelectWrap}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-activedescendant={activeDescendantId}
        onKeyDown={onTriggerKeyDown}
        onClick={onTriggerClick}
      >
        <div className={styles.flagWrap}>
          {showAssets && <img src={`/assets/icons/currencies/currency-${selected.toLowerCase()}.png`} alt="" aria-hidden="true" />}
          <span>{selected}</span>
        </div>
        <span className={styles.chevronDown} aria-hidden="true" />
      </button>
      {isOpen && (
        <div id={listboxId} className={styles.currencyMenu} role="listbox" aria-label="통화 목록">
          {currencies.map((currency, index) => (
            <button
              key={currency}
              type="button"
              role="option"
              id={getOptionId(index)}
              tabIndex={-1}
              aria-selected={selected === currency}
              aria-disabled={currency === disabledCurrency}
              disabled={currency === disabledCurrency}
              onMouseEnter={() => onOptionPointerMove(index)}
              onClick={() => onOptionClick(index)}
            >
              {showAssets && <img src={`/assets/icons/currencies/currency-${currency.toLowerCase()}.png`} alt="" aria-hidden="true" />}
              <span>{currency}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function CalculatorPage() {
  const { locale, t } = useI18n()
  const isOfflineCalculatorRoute = typeof window !== 'undefined' && window.location.pathname === ROUTE_PATHS.offlineCalculator

  const mascotLocale = locale.toLowerCase()
  const mascotImagePath = SUPPORTED_LOCALES.includes(mascotLocale)
    ? `/assets/illustrations/mascot-${mascotLocale}.png`
    : '/assets/illustrations/mascot-check.png'

  const onboarding = getOnboardingSettings()
  const defaultLocal = normalizeCurrencyCode(onboarding.localCurrencies?.[0], 'USD')
  const defaultHome = normalizeCurrencyCode(onboarding.baseCurrency, 'KRW')

  const [fromCurrency, setFromCurrency] = useState<CurrencyCode>(defaultLocal)
  const [toCurrency, setToCurrency] = useState<CurrencyCode>(defaultHome)
  const [isFromOpen, setIsFromOpen] = useState(false)
  const [isToOpen, setIsToOpen] = useState(false)
  const [fromAmount, setFromAmount] = useState('')
  const [debouncedAmount, setDebouncedAmount] = useState(0)
  const isOnline = useOnlineStatus()
  const currentRateQuery = useExchangeRateQuery(fromCurrency, toCurrency, { enabled: isOnline })
  const cachedRate = getCachedExchangeRate(fromCurrency, toCurrency)
  const refetchCurrentRate = currentRateQuery.refetch
  const changeRate = currentRateQuery.data?.changeRate ?? null
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const isSwapRef = useRef(false)
  const wasOnlineRef = useRef(isOnline)
  const cachedRateSignatureRef = useRef('')
  const initialRatesLoadedRef = useRef(false)

  useEffect(() => {
    const rateData = currentRateQuery.data
    if (!isOnline || !rateData || rateData.available === false || !isUsableRate(rateData.rate)) return

    const signature = `${fromCurrency}:${toCurrency}:${rateData.rate}:${rateData.rateDate ?? ''}`
    if (cachedRateSignatureRef.current === signature) return

    if (setCachedExchangeRate(rateData)) cachedRateSignatureRef.current = signature
  }, [currentRateQuery.data, fromCurrency, isOnline, toCurrency])

  useEffect(() => {
    if (!isOfflineCalculatorRoute || !isOnline || initialRatesLoadedRef.current) return
    initialRatesLoadedRef.current = true

    const pairs = new Map<string, readonly [CurrencyCode, CurrencyCode]>()
    INITIAL_CACHE_CURRENCIES.forEach((from) => {
      if (from !== 'KRW') pairs.set(`${from}:KRW`, [from, 'KRW'])
    })
    pairs.set(`${fromCurrency}:${toCurrency}`, [fromCurrency, toCurrency])

    void Promise.all(Array.from(pairs.values()).map(async ([from, to]) => {
      try {
        const rate = await getCurrentExchangeRate(from, to)
        if (rate.available !== false && isUsableRate(rate.rate)) setCachedExchangeRate(rate)
      } catch {
        // The selected pair query owns the visible error state.
      }
    }))
  }, [fromCurrency, isOfflineCalculatorRoute, isOnline, toCurrency])

  useEffect(() => {
    if (isOnline && !wasOnlineRef.current && typeof refetchCurrentRate === 'function') {
      void refetchCurrentRate()
    }
    wasOnlineRef.current = isOnline
  }, [isOnline, refetchCurrentRate])

  const historyQuery = useQuery({
    queryKey: ['exchange-quote-history', 0, 20],
    queryFn: () => getExchangeQuoteHistory(0, 20),
    enabled: isOnline && !isOfflineCalculatorRoute,
    staleTime: 0,
    refetchOnMount: 'always' as const,
    refetchOnWindowFocus: false,
  })
  const historyList = historyQuery.data ?? []
  const historyError = isOnline && historyQuery.error ? t('calculator.historyLoadError') : ''
  const isHistoryLoading = isOnline && historyQuery.isLoading
  const isHistoryOffline = !isOnline
  const refetchHistory = historyQuery.refetch

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedAmount(Number(fromAmount.replaceAll(',', '')) || 0)
    }, 500)
    return () => window.clearTimeout(timer)
  }, [fromAmount])

  const quoteAmount = fromCurrency === 'KRW' ? Math.round(debouncedAmount) : debouncedAmount
  const quoteQuery = useQuery({
    queryKey: ['exchange-quote', fromCurrency, toCurrency, quoteAmount],
    queryFn: () => getExchangeQuote(fromCurrency, toCurrency, quoteAmount),
    enabled: isOnline && quoteAmount > 0,
    retry: false,
  })
  const isQuoteLoading = isOnline && quoteAmount > 0 && quoteQuery.isFetching
  const quoteError = isOnline && (quoteQuery.error || quoteQuery.data?.available === false) ? t('calculator.quoteLoadError') : ''
  const hasAmountInput = Number(fromAmount.replaceAll(',', '')) > 0
  const quoteResult = quoteQuery.data?.available === false ? undefined : quoteQuery.data
  const liveRate = isUsableRate(quoteResult?.appliedRate)
    ? quoteResult.appliedRate
    : isUsableRate(currentRateQuery.data?.rate)
      ? currentRateQuery.data.rate
      : null
  const liveRateDate = quoteResult?.rateDate ?? currentRateQuery.data?.rateDate ?? ''
  const currentRateError = isOnline && currentRateQuery.error ? t('calculator.rateLoadError') : ''
  const isCurrentRateLoading = isOnline && currentRateQuery.isLoading
  const offlineRate = !isOnline ? cachedRate?.rate ?? null : null
  const convertedAmount = !hasAmountInput
    ? null
    : !isOnline
      ? convertAmount(quoteAmount, offlineRate)
      : quoteError || currentRateError || !quoteResult
        ? null
        : convertAmount(quoteAmount, liveRate)
  const toAmount = !hasAmountInput
    ? ''
    : !isOnline && convertedAmount !== null
      ? convertedAmount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : quoteError || currentRateError
        ? CALCULATION_ERROR
        : convertedAmount !== null
          ? convertedAmount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : ''
  const rateInfo = isOnline && liveRate
    ? { date: liveRateDate, rate: liveRate, source: 'live' as const }
    : !isOnline && cachedRate
      ? { date: cachedRate.rateDate, rate: cachedRate.rate, source: 'cached' as const }
      : null
  const offlineRateUnavailable = !isOnline && !cachedRate

  useEffect(() => {
    if (!isOfflineCalculatorRoute && quoteQuery.data && quoteQuery.data.available !== false) void refetchHistory()
  }, [isOfflineCalculatorRoute, quoteQuery.data, refetchHistory])

  const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    let rawValue = event.target.value.replace(/[^0-9.]/g, '')
    const parts = rawValue.split('.')
    if (parts.length > 2) rawValue = `${parts[0]}.${parts.slice(1).join('')}`
    if (!rawValue) {
      setFromAmount('')
      return
    }
    const formatted = `${parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${parts.length > 1 ? `.${parts[1]}` : ''}`
    setFromAmount(formatted)
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

  return (
    <section className={styles.page}>
      <div className={styles.pageHeader}>
        <h1>{t(isOfflineCalculatorRoute ? 'calculator.offlineTitle' : 'calculator.title')}</h1>
        <p>{t(isOfflineCalculatorRoute ? 'calculator.offlineDescription' : 'calculator.description')}</p>
        {isOfflineCalculatorRoute && (
          <div className={styles.offlineToolbar} role="status" aria-live="polite">
            <span className={`${styles.connectionBadge} ${isOnline ? styles.connectionOnline : styles.connectionOffline}`}>
              {t(isOnline ? 'calculator.onlineStatus' : 'calculator.offlineStatus')}
            </span>
            <span className={styles.connectionMessage}>
              {t(isOnline ? 'calculator.onlineDescription' : 'calculator.offlineDescription')}
            </span>
            <a className={styles.homeButton} href={ROUTE_PATHS.landing}>{t('calculator.goHome')}</a>
          </div>
        )}
      </div>

      <div className={styles.contentWrapper}>
        <div className={styles.exchangeArea}>
          <div className={styles.calcCard}>
            <h2 className={styles.cardTitle}>From</h2>
            <CurrencySelector
              selected={fromCurrency}
              disabledCurrency={toCurrency}
              isOpen={isFromOpen}
              showAssets={!isOfflineCalculatorRoute}
              onToggle={() => { setIsFromOpen((open) => !open); setIsToOpen(false) }}
              onSelect={setFromCurrency}
            />
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel} htmlFor="calculator-from-amount">{t('calculator.amount')}</label>
              <div className={styles.amountBox}><input id="calculator-from-amount" type="text" value={fromAmount} onChange={handleAmountChange} /></div>
            </div>
            <div className={styles.quickButtons}>
              {[100, 500, 1000].map((amount) => <button key={amount} type="button" className={styles.quickBtn} onClick={() => setFromAmount(((Number(fromAmount.replaceAll(',', '')) || 0) + amount).toLocaleString(locale))}>+ {amount}</button>)}
              <button type="button" className={styles.quickBtn} onClick={() => setFromAmount('')}>{t('calculator.clear')}</button>
            </div>
          </div>

          <button type="button" aria-label={t('calculator.swap')} onClick={handleSwap} className={styles.swapBtn}>
            {isOfflineCalculatorRoute
              ? <span className={styles.swapText} aria-hidden="true">⇄</span>
              : <img src="/assets/icons/actions/exchange-button.png" alt="" aria-hidden="true" className={styles.swapIcon} />}
          </button>

          <div className={styles.calcCard}>
            <h2 className={styles.cardTitle}>To</h2>
            <CurrencySelector
              selected={toCurrency}
              disabledCurrency={fromCurrency}
              isOpen={isToOpen}
              showAssets={!isOfflineCalculatorRoute}
              onToggle={() => { setIsToOpen((open) => !open); setIsFromOpen(false) }}
              onSelect={setToCurrency}
            />
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel} htmlFor="calculator-to-amount">{t('calculator.result')}</label>
              <div className={styles.amountBox}><input id="calculator-to-amount" type="text" value={toAmount === CALCULATION_ERROR ? t('calculator.error') : toAmount} readOnly /></div>
            </div>
            {(isCurrentRateLoading || isQuoteLoading) && <LoadingState size="sm" variant="inline" message={t('calculator.rateLoading')} />}
            {(currentRateError || quoteError) && <p className={styles.statusMessage} role="alert">{currentRateError || quoteError}</p>}
            {offlineRateUnavailable && <p className={styles.statusMessage} role="status">{t('calculator.noRateCacheDescription')}</p>}
            <div className={styles.statusMessage} style={{ visibility: rateInfo ? 'visible' : 'hidden' }}>
              <span className={styles.statusDot} />
              <span>{rateInfo ? isOfflineCalculatorRoute
                ? `${t(rateInfo.source === 'live' ? 'calculator.liveRate' : 'calculator.cachedRate')} · ${t('calculator.rateFormat', { from: fromCurrency, rate: rateInfo.rate.toLocaleString(locale, { maximumFractionDigits: 4 }), to: toCurrency })}${rateInfo.source === 'cached' ? ` · ${t('calculator.cachedRateNotice')}` : ''}${rateInfo.date ? ` · ${t('calculator.rateApplied', { date: rateInfo.date.replaceAll('-', '.') })}` : ''}`
                : rateInfo.date ? t('calculator.rateApplied', { date: rateInfo.date.replaceAll('-', '.') }) : '' : ''}</span>
            </div>
          </div>
        </div>

        {!isOfflineCalculatorRoute && <div className={styles.historyArea}>
          <div className={styles.historyHeader}>
            <h2>{t('calculator.history')}</h2>
            <button type="button" className={styles.viewAllBtn} onClick={() => setIsHistoryModalOpen(true)}>{t('calculator.viewAll')} <span className={styles.chevronRight} /></button>
          </div>
          <div className={styles.historyList}>
            {isHistoryOffline ? <p className={styles.historyMessage} role="status">{t('calculator.historyOffline')}</p> : isHistoryLoading ? <LoadingState size="sm" message={t('calculator.historyLoading')} /> : historyError ? (
              <ErrorState title={historyError} retryLabel="다시 시도" onRetry={() => { void refetchHistory() }} variant="compact" />
            ) : historyList.length === 0 ? (
              <div className={styles.historyEmptyState}>
                <EmptyState
                  icon={<img src="/assets/illustrations/mascot-checklist.png" alt="" />}
                  title={t('calculator.noHistory')}
                  description={t('calculator.noHistoryDescription')}
                  variant="compact"
                />
              </div>
            ) : historyList.slice(0, 3).map((item, index) => (
              <div key={item.id ?? index} className={`${styles.historyItem} ${index === 0 ? styles.active : ''}`}>
                <div className={styles.historyInfo}>
                  <img src={`/assets/icons/currencies/currency-${(item.fromCurrency || 'default').toLowerCase()}.png`} alt="" aria-hidden="true" onError={(event) => { event.currentTarget.src = '/assets/icons/currencies/currency-default.png' }} />
                  <div className={styles.historyText}>
                    <span className={styles.historySource}>
                      {(() => {
                        const formattedAmount = (item.amount ?? 0).toLocaleString(locale);

                        if (formattedAmount.length >= 6) {
                          return (
                            <>
                              <span>{formattedAmount}</span>
                              <br />
                              <span>{item.fromCurrency}</span>
                            </>
                          );
                        }

                        return `${formattedAmount} ${item.fromCurrency}`;
                      })()}
                    </span>
                    <span className={styles.historyArrow} aria-hidden="true">→</span>
                    <span className={styles.historyResult}>
                      {(() => {
                        const formattedNum = (item.convertedAmount ?? 0).toLocaleString(locale, { maximumFractionDigits: 2 });

                        if (formattedNum.length >= 6) {
                          return (
                            <>
                              <span>{formattedNum}</span>
                              <span>{item.toCurrency}</span>
                            </>
                          );
                        }

                        return `${formattedNum} ${item.toCurrency}`;
                      })()}
                    </span>
                  </div>
                </div>
                <span className={styles.historyTime}>{formatHistoryTime(item.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>}
      </div>

      {isHistoryModalOpen && <ModalShell title={t('calculator.history')} titleId="history-modal-title" closeLabel={t('calculator.closeHistory')} width="52rem" onClose={() => setIsHistoryModalOpen(false)}>
        <div className={styles.modalHistoryContainer}>
          <div className={styles.modalHistoryList}>
            {isHistoryOffline ? <p className={styles.historyMessage} role="status">{t('calculator.historyOffline')}</p> : isHistoryLoading ? <LoadingState size="sm" message={t('calculator.historyLoading')} /> : historyError ? (
              <ErrorState title={historyError} retryLabel="다시 시도" onRetry={() => { void refetchHistory() }} variant="compact" />
            ) : historyList.length === 0 ? (
              <div className={styles.modalHistoryEmptyState}>
                <EmptyState
                  icon={<img src="/assets/illustrations/mascot-checklist.png" alt="" />}
                  title={t('calculator.noHistory')}
                  description={t('calculator.noHistoryDescription')}
                  variant="compact"
                />
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

      {!isOfflineCalculatorRoute && (
        <FloatingMascot
          messages={mascotMessages}
          imageSrc={mascotImagePath}
          className={styles.lowerMascot}
        />
      )}
    </section>
  )
}

export default CalculatorPage
