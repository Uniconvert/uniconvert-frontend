import { useCallback, useEffect, useState } from 'react'

import {
  getExpenseHistory,
  getExpensesForMonth,
  getRecentExpenses,
} from '@/api/expenses'
import type { ExpenseHistoryData, SavedExpense } from '@/types/expense'
import { getApiErrorNotice } from '@/utils/apiError'

interface UseExpenseHistoryDataOptions {
  yearMonth: string
  range: string
  isRecentModalOpen: boolean
  recentModalYearMonth: string
}

export function useExpenseHistoryData({
  yearMonth,
  range,
  isRecentModalOpen,
  recentModalYearMonth,
}: UseExpenseHistoryDataOptions) {
  const [data, setData] = useState<ExpenseHistoryData | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [recentExpenses, setRecentExpenses] = useState<SavedExpense[]>([])
  const [recentExpensesError, setRecentExpensesError] = useState('')
  const [reloadVersion, setReloadVersion] = useState(0)
  const [modalResult, setModalResult] = useState<{
    yearMonth: string
    expenses: SavedExpense[]
    errorMessage: string
  }>({ yearMonth: '', expenses: [], errorMessage: '' })

  useEffect(() => {
    let isActive = true

    getExpenseHistory(yearMonth, range)
      .then((response) => {
        if (!isActive) return
        setData(response)
        setErrorMessage('')
      })
      .catch((error) => {
        if (!isActive) return
        setErrorMessage(getApiErrorNotice(error, '지출 내역을 불러오지 못했습니다.').title)
      })

    return () => {
      isActive = false
    }
  }, [range, reloadVersion, yearMonth])

  useEffect(() => {
    let isActive = true

    getRecentExpenses()
      .then((expenses) => {
        if (!isActive) return
        setRecentExpenses(expenses)
        setRecentExpensesError('')
      })
      .catch((error) => {
        if (!isActive) return
        setRecentExpenses([])
        setRecentExpensesError(
          getApiErrorNotice(error, '최근 지출을 불러오지 못했습니다.').title,
        )
      })

    return () => {
      isActive = false
    }
  }, [reloadVersion])

  useEffect(() => {
    if (!isRecentModalOpen) return

    let isActive = true

    getExpensesForMonth(recentModalYearMonth)
      .then((expenses) => {
        if (!isActive) return
        setModalResult({
          yearMonth: recentModalYearMonth,
          expenses,
          errorMessage: '',
        })
      })
      .catch((error) => {
        if (!isActive) return
        setModalResult({
          yearMonth: recentModalYearMonth,
          expenses: [],
          errorMessage: getApiErrorNotice(
            error,
            '선택한 월의 지출 내역을 불러오지 못했습니다.',
          ).title,
        })
      })

    return () => {
      isActive = false
    }
  }, [isRecentModalOpen, recentModalYearMonth, reloadVersion])

  const retry = useCallback(() => {
    setData(null)
    setErrorMessage('')
    setRecentExpensesError('')
    setReloadVersion((current) => current + 1)
  }, [])

  const isModalExpensesLoading = Boolean(
    isRecentModalOpen &&
    modalResult.yearMonth !== recentModalYearMonth,
  )
  const modalExpenses = modalResult.yearMonth === recentModalYearMonth
    ? modalResult.expenses
    : []
  const modalExpensesError = modalResult.yearMonth === recentModalYearMonth
    ? modalResult.errorMessage
    : ''

  return {
    data,
    errorMessage,
    recentExpenses,
    setRecentExpenses,
    recentExpensesError,
    modalExpenses,
    isModalExpensesLoading,
    modalExpensesError,
    retry,
  }
}
