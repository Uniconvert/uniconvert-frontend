import { useCallback, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { getCategories, getFallbackCategories } from '@/api/categories'
import { getExpenseHistory } from '@/api/expenses'
import { getExchangeRate } from '@/utils/exchangeRate'
import { useExchangeRateQuery } from '@/hooks/useExchangeRateQuery'
import { getSessionUser } from '@/auth/session'
import type { CurrencyCode } from '@/types/currency'
import { expenseKeys } from '@/hooks/expenseKeys'

export type ExchangeRateStatus = 'idle' | 'loading' | 'ready' | 'error'
export type BudgetStatus = 'loading' | 'ready' | 'error'

interface BudgetSummary {
  homeCurrency: string
  monthlyBudgetHome: number
  monthlyExpenseHome: number
  remainingBudgetHome: number
}

interface UseExpenseInputDataOptions {
  yearMonth: string
  currency: CurrencyCode
  onWarning: (message: string) => void
}

function isUsableRate(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

const fallbackCategories = getFallbackCategories()
const emptyBudgetSummary: BudgetSummary = {
  homeCurrency: '',
  monthlyBudgetHome: 0,
  monthlyExpenseHome: 0,
  remainingBudgetHome: 0,
}

export function useExpenseInputData({
  yearMonth,
  currency,
  onWarning,
}: UseExpenseInputDataOptions) {
  const categoryQuery = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    retry: false,
  })
  const [categoryIdOverride, setCategoryIdOverride] = useState<string | undefined>()
  const sessionUser = getSessionUser()
  const budgetQuery = useQuery({
    queryKey: expenseKeys.historyFor(yearMonth, 'month'),
    queryFn: () => getExpenseHistory(yearMonth, 'month', sessionUser ? { homeCurrencyCode: sessionUser.homeCurrencyCode } : null),
    staleTime: 0,
    refetchOnMount: 'always' as const,
    refetchOnWindowFocus: false,
    retry: false,
  })
  const categories = categoryQuery.data && categoryQuery.data.length > 0 ? categoryQuery.data : fallbackCategories
  const categoryId = categoryIdOverride && categories.some((category) => category.id === categoryIdOverride)
    ? categoryIdOverride
    : categories[0]?.id ?? fallbackCategories[0].id
  const budgetSummary: BudgetSummary = budgetQuery.data
    ? {
      homeCurrency: budgetQuery.data.homeCurrency,
      monthlyBudgetHome: budgetQuery.data.monthlyBudgetHome,
      monthlyExpenseHome: budgetQuery.data.monthlyExpenseHome,
      remainingBudgetHome: budgetQuery.data.remainingBudgetHome,
    }
    : emptyBudgetSummary
  const budgetStatus: BudgetStatus = budgetQuery.data
    ? 'ready'
    : budgetQuery.error
      ? 'error'
      : 'loading'
  const rateQuery = useExchangeRateQuery(currency, budgetQuery.data?.homeCurrency ?? '')

  const queriedRate = rateQuery.data?.available === true && isUsableRate(rateQuery.data.rate)
    ? rateQuery.data.rate
    : undefined
  const hasUsableRate = queriedRate !== undefined
  const rateStatus: ExchangeRateStatus = budgetStatus === 'loading'
    ? 'loading'
    : budgetStatus === 'error'
      ? 'error'
      : !currency || !budgetSummary.homeCurrency
        ? 'idle'
        : rateQuery.isLoading || rateQuery.isFetching
          ? 'loading'
          : rateQuery.error || !hasUsableRate
            ? 'error'
            : 'ready'

  const displayRate = budgetStatus === 'ready' && budgetSummary.homeCurrency
    ? queriedRate ?? getExchangeRate(currency, budgetSummary.homeCurrency)
    : 0

  const refetchBudget = useCallback(async () => {
    const result = await budgetQuery.refetch()
    if (result.error || !result.data) throw result.error ?? new Error('예산 정보를 불러오지 못했어요')
    return result.data
  }, [budgetQuery])

  useEffect(() => {
    if (categoryQuery.error) onWarning('카테고리를 불러오지 못해 기본 목록을 사용해요')
  }, [categoryQuery.error, onWarning])

  useEffect(() => {
    if (budgetQuery.error) onWarning('예산 정보를 불러오지 못했어요')
  }, [budgetQuery.error, onWarning])

  useEffect(() => {
    if (rateQuery.error) onWarning('실시간 환율을 불러오지 못했어요')
  }, [onWarning, rateQuery.error])


  return {
    categories,
    categoryId,
    setCategoryId: setCategoryIdOverride,
    budgetSummary,
    rate: displayRate,
    isTemporaryRate: false,
    budgetStatus,
    rateStatus,
    isRateLoading: rateStatus === 'loading',
    isRateError: rateStatus === 'error',
    retryRate: rateQuery.refetch,
    refetchBudget,
  }
}
