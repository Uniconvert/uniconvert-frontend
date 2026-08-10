import { useEffect, useState } from 'react'

import {
  getExchangeQuote,
  getExchangeQuoteHistory,
  type ExchangeQuoteDto,
  type ExchangeQuoteHistoryDto,
} from '@/api/exchangeRates'

interface UseExchangeCalculatorDataOptions {
  fromCurrency: string
  toCurrency: string
  amount: number
}

export function useExchangeCalculatorData({
  fromCurrency,
  toCurrency,
  amount,
}: UseExchangeCalculatorDataOptions) {
  const [quote, setQuote] = useState<ExchangeQuoteDto | null>(null)
  const [quoteError, setQuoteError] = useState('')
  const [historyItems, setHistoryItems] = useState<ExchangeQuoteHistoryDto[]>([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState('')

  useEffect(() => {
    let isActive = true

    getExchangeQuoteHistory(0, 10)
      .then((items) => {
        if (!isActive) return
        setHistoryItems(items)
        setHistoryError('')
      })
      .catch(() => {
        if (isActive) {
          setHistoryItems([])
          setHistoryError('계산 내역을 불러오지 못했습니다.')
        }
      })
      .finally(() => {
        if (isActive) setIsHistoryLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    if (amount <= 0) return

    let isActive = true
    const timer = window.setTimeout(() => {
      setQuote(null)
      setQuoteError('')
      getExchangeQuote(fromCurrency, toCurrency, amount)
        .then((response) => {
          if (!isActive) return
          setQuote(response)
          setQuoteError(
            response.available === false
              ? '현재 사용할 수 있는 환율 정보가 없습니다.'
              : '',
          )
        })
        .catch(() => {
          if (isActive) {
            setQuote(null)
            setQuoteError('환율 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')
          }
        })
    }, 350)

    return () => {
      isActive = false
      window.clearTimeout(timer)
    }
  }, [amount, fromCurrency, toCurrency])

  return {
    quote,
    quoteError: amount > 0 ? quoteError : '',
    historyItems,
    isHistoryLoading,
    historyError,
  }
}
