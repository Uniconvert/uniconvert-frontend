export const expenseKeys = {
  history: ['expense-history'] as const,
  historyFor: (yearMonth: string, range: string) => ['expense-history', yearMonth, range] as const,
  recent: ['recent-expenses'] as const,
  month: (yearMonth: string) => ['expenses-for-month', yearMonth] as const,
}
