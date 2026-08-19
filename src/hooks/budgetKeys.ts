export const budgetKeys = {
  all: ['budget'] as const,
  forMonth: (yearMonth: string) => [...budgetKeys.all, yearMonth] as const,
}
