export interface MonthlyExpensePoint {
  yearMonth: string
  amountHome: number
}

export interface DailyExpensePoint {
  date: string
  amountHome: number
}

export interface ReportCategory {
  categoryId: string | number
  name: string
  amountHome: number
  percent: number
  iconKey: string
}

/** 서버가 현재 언어에 맞춰 내려주는 유니 말풍선 문구입니다. */
export interface UniMessage {
  key: string
  message: string
  type: 'ENTRY' | 'RANDOM' | 'INSIGHT'
}

/** 화면에서 바로 사용할 수 있도록 API 응답을 정규화한 월별 리포트 모델입니다. */
export interface MonthlyReportData {
  yearMonth: string
  homeCurrency: string
  totalExpenseHome: number
  dailyExpenses: DailyExpensePoint[]
  monthlyExpenses: MonthlyExpensePoint[]
  categoryBreakdown: ReportCategory[]
  mascotMessages: UniMessage[]
}
