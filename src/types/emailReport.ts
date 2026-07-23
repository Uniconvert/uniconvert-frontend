export interface EmailReportCategory {
  categoryId: string
  categoryName: string
  amountHome: number
  ratio: number
  iconKey: string
}

export interface EmailReportData {
  isEnabled: boolean
  yearMonth: string
  homeCurrency: string
  totalExpenseHome: number
  categories: EmailReportCategory[]
}
