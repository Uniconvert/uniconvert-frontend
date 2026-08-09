import { useCallback, useEffect, useState } from 'react'

import { getCategories, getFallbackCategories } from '@/api/categories'
import { getExpenseHistory } from '@/api/expenses'
import { getCurrentExchangeRate } from '@/api/exchangeRates'
import { getExchangeRate } from '@/utils/exchangeRate'

interface BudgetSummary {
  homeCurrency: string
  monthlyBudgetHome: number
  monthlyExpenseHome: number
}

interface UseExpenseInputDataOptions {
  yearMonth: string
  currency: string
  onWarning: (message: string) => void
}

const fallbackCategories = getFallbackCategories()
const emptyBudgetSummary: BudgetSummary = {
  homeCurrency: 'KRW',
  monthlyBudgetHome: 0,
  monthlyExpenseHome: 0,
}

export function useExpenseInputData({
  yearMonth,
  currency,
  onWarning,
}: UseExpenseInputDataOptions) {
  const [categories, setCategories] = useState(fallbackCategories)
  const [categoryId, setCategoryId] = useState(fallbackCategories[0].id)
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary>(emptyBudgetSummary)
  const [rate, setRate] = useState(() => getExchangeRate(currency, 'KRW'))

  const requestBudget = useCallback(
    () => getExpenseHistory(yearMonth, 'month'),
    [yearMonth],
  )

  const refetchBudget = useCallback(async () => {
    const history = await requestBudget()
    setBudgetSummary({
      homeCurrency: history.homeCurrency,
      monthlyBudgetHome: history.monthlyBudgetHome,
      monthlyExpenseHome: history.monthlyExpenseHome,
    })
    return history
  }, [requestBudget])

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
        if (isActive) onWarning('카테고리를 불러오지 못해 기본 목록을 사용해요')
      })

    return () => {
      isActive = false
    }
  }, [onWarning])

  useEffect(() => {
    let isActive = true

    requestBudget()
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
        setBudgetSummary(emptyBudgetSummary)
        onWarning('예산 정보를 불러오지 못했어요')
      })

    return () => {
      isActive = false
    }
  }, [onWarning, requestBudget])

  useEffect(() => {
    let isActive = true

    getCurrentExchangeRate(currency, budgetSummary.homeCurrency)
      .then((response) => {
        if (isActive && typeof response.rate === 'number' && response.rate > 0) {
          setRate(response.rate)
        }
      })
      .catch(() => {
        if (!isActive) return
        setRate(getExchangeRate(currency, budgetSummary.homeCurrency))
        onWarning('실시간 환율을 불러오지 못해 기본 환율을 사용해요')
      })

    return () => {
      isActive = false
    }
  }, [budgetSummary.homeCurrency, currency, onWarning])

  return {
    categories,
    categoryId,
    setCategoryId,
    budgetSummary,
    setBudgetSummary,
    rate,
    refetchBudget,
  }
}
