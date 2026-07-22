export interface MonthlyExpensePoint {
  yearMonth: string
  amountHome: number
}

export interface ReportCategory {
  categoryId: string | number
  name: string
  amountHome: number
  percent: number
  iconKey: string
}

/** 화면에서 바로 사용할 수 있도록 API 응답을 정규화한 월별 리포트 모델입니다. */
export interface MonthlyReportData {
  yearMonth: string
  homeCurrency: string
  totalExpenseHome: number
  monthlyExpenses: MonthlyExpensePoint[]
  categoryBreakdown: ReportCategory[]
}
