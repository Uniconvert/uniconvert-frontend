import { useCallback, useEffect, useState } from 'react'

import { getExpenseHistory } from '@/api/expenses'
import { getMonthlyReport } from '@/api/reports'
import type { ExpenseHistoryData } from '@/types/expense'
import type { MonthlyReportData } from '@/types/report'
import { getApiErrorNotice } from '@/utils/apiError'

interface UseMonthlyReportDataOptions {
  reportYearMonth: string
  budgetYearMonth: string
}

interface ReportResult {
  yearMonth: string
  data: MonthlyReportData | null
  errorMessage: string
}

export function useMonthlyReportData({
  reportYearMonth,
  budgetYearMonth,
}: UseMonthlyReportDataOptions) {
  const [reportResult, setReportResult] = useState<ReportResult>({
    yearMonth: '',
    data: null,
    errorMessage: '',
  })
  const [expenseHistory, setExpenseHistory] = useState<ExpenseHistoryData | null>(null)
  const [reloadVersion, setReloadVersion] = useState(0)

  useEffect(() => {
    let isActive = true

    getMonthlyReport(reportYearMonth)
      .then((response) => {
        if (!isActive) return
        setReportResult({ yearMonth: reportYearMonth, data: response, errorMessage: '' })
      })
      .catch((error) => {
        if (!isActive) return
        setReportResult({
          yearMonth: reportYearMonth,
          data: null,
          errorMessage: getApiErrorNotice(error, '리포트를 불러오지 못했습니다.').title,
        })
      })

    return () => {
      isActive = false
    }
  }, [reloadVersion, reportYearMonth])

  useEffect(() => {
    let isActive = true

    getExpenseHistory(budgetYearMonth, 'month')
      .then((response) => {
        if (isActive) setExpenseHistory(response)
      })
      .catch(() => {
        // 리포트 본문과 독립된 보조 정보이므로 실패해도 리포트는 계속 표시합니다.
      })

    return () => {
      isActive = false
    }
  }, [budgetYearMonth, reloadVersion])

  const isCurrentReport = reportResult.yearMonth === reportYearMonth
  const retry = useCallback(() => {
    setReportResult({ yearMonth: '', data: null, errorMessage: '' })
    setExpenseHistory(null)
    setReloadVersion((current) => current + 1)
  }, [])

  return {
    report: isCurrentReport ? reportResult.data : null,
    expenseHistory,
    errorMessage: isCurrentReport ? reportResult.errorMessage : '',
    isLoading: !isCurrentReport,
    retry,
  }
}
