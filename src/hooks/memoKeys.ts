import type { ExpenseMemoQuery } from '@/types/memo'

export const memoKeys = {
  all: ['expense-memos'] as const,
  list: (query: Required<Pick<ExpenseMemoQuery, 'keyword' | 'sort' | 'page'>>) => [
    ...memoKeys.all,
    'list',
    query,
  ] as const,
}
