export const reportKeys = {
  all: ['monthly-report'] as const,
  monthly: (yearMonth: string) => [...reportKeys.all, yearMonth] as const,
  transactions: (targetDate: string) => ['report-transactions', targetDate] as const,
}
