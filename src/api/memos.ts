import { apiRequest } from '@/api/client'
import { ApiError } from '@/api/client'
import type { ExpenseResponseDto } from '@/types/expense'
import type {
  ExpenseMemo,
  ExpenseMemoDto,
  ExpenseMemoPage,
  ExpenseMemoPageDto,
  ExpenseMemoApiResponse,
  ExpenseMemoQuery,
} from '@/types/memo'

function toExpenseMemoFromDto(memo: ExpenseMemoDto): ExpenseMemo {
  const raw = memo as ExpenseMemoDto & Record<string, unknown>
  const text = String(raw.memo ?? raw.note ?? raw.description ?? raw.content ?? raw.text ?? '')
  const categoryName = String(raw.categoryName ?? raw.category ?? '기타')
  return {
    expenseId: String(raw.expenseId ?? raw.id ?? ''),
    categoryName: categoryName.trim() || '기타',
    iconKey: String(raw.iconKey ?? 'other').trim() || 'other',
    merchantName: String(raw.merchantName ?? raw.storeName ?? '').trim(),
    memo: text.trim(),
    spentAt: String(raw.spentAt ?? raw.date ?? raw.createdAt ?? ''),
  }
}

function requireExpenseId(expenseId: string) {
  const id = Number(expenseId)
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error('올바르지 않은 지출 ID입니다.')
  }
  return id
}

function buildMemoParams(query: ExpenseMemoQuery) {
  const params = new URLSearchParams()
  const keyword = query.keyword?.trim()
  if (keyword) params.set('keyword', keyword)
  params.set('sort', query.sort ?? 'latest')
  params.set('page', String(query.page ?? 0))
  return params
}

export function getExpenseMemos(query: ExpenseMemoQuery = {}): Promise<ExpenseMemoPage> {
  const params = buildMemoParams(query)
  const normalize = (response: ExpenseMemoApiResponse): ExpenseMemoPage => {
    const first = 'data' in response && response.data != null ? response.data : response
    const nested = !Array.isArray(first) && typeof first === 'object' && first !== null && 'data' in first && first.data != null
      ? first.data
      : first
    const pageSource = !Array.isArray(nested) && typeof nested === 'object' && nested !== null && 'memos' in nested
      ? nested.memos
      : nested
    const page = (Array.isArray(pageSource) ? { content: pageSource } : pageSource) as ExpenseMemoPageDto & {
      items?: ExpenseMemoDto[]
      results?: ExpenseMemoDto[]
    }
    const content = page?.content ?? page?.items ?? page?.results ?? []
    return {
      items: content.map(toExpenseMemoFromDto),
      totalElements: page?.totalElements ?? content.length,
      totalPages: page?.totalPages ?? 1,
      page: page?.number ?? query.page ?? 0,
    }
  }
  return apiRequest<ExpenseMemoApiResponse>(`/expenses/memos?${params.toString()}`)
    .then(async (response) => {
      const result = normalize(response)
      return result
    })
    .catch(async (error: unknown) => {
      if (!(error instanceof ApiError) || error.status !== 404) throw error
      throw error
    })
}

export async function updateExpenseMemo(expense: ExpenseMemo, memo: string) {
  const normalizedMemo = memo.trim()
  const expenseId = requireExpenseId(expense.expenseId)
  const detail = await apiRequest<ExpenseResponseDto>(`/expenses/${expenseId}`)
  if (detail.originalAmount === undefined || !detail.originalCurrency || !detail.spentAt || detail.categoryId === undefined) {
    throw new Error('메모 수정에 필요한 지출 상세 정보가 부족합니다.')
  }
  const updated = await apiRequest<ExpenseResponseDto>(`/expenses/${expenseId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      originalAmount: detail.originalAmount,
      originalCurrency: detail.originalCurrency,
      spentAt: detail.spentAt,
      categoryId: detail.categoryId,
      merchantName: detail.merchantName || undefined,
      memo: normalizedMemo,
      potId: detail.potId ?? undefined,
    }),
  })
  return { ...expense, memo: updated.memo ?? normalizedMemo }
}

export async function deleteExpenseMemos(expenseIds: string[]) {
  const ids = expenseIds.map(requireExpenseId)
  await apiRequest<void>('/expenses/memos', {
    method: 'DELETE',
    body: JSON.stringify({ expenseIds: ids }),
  })
  return true
}
