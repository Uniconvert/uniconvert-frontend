import { apiRequest } from '@/api/client'
import type { ExpenseResponseDto } from '@/types/expense'
import type {
  ExpenseMemo,
  ExpenseMemoDto,
  ExpenseMemoPage,
  ExpenseMemoPageDto,
  ExpenseMemoQuery,
} from '@/types/memo'

function toExpenseMemoFromDto(memo: ExpenseMemoDto): ExpenseMemo {
  const categoryName = memo.categoryName?.trim() || '기타'

  return {
    expenseId: String(memo.id ?? ''),
    categoryName,
    iconKey: memo.iconKey?.trim() || 'other',
    // 메모 목록 응답에는 상점명이 없으므로 화면 검색용 빈 값으로 둡니다.
    merchantName: '',
    memo: memo.memo?.trim() || '',
    spentAt: memo.spentAt || '',
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
  return apiRequest<ExpenseMemoPageDto>(
    `/expenses/memos?${params.toString()}`,
  ).then((response) => ({
    items: (response.content ?? []).map(toExpenseMemoFromDto),
    totalElements: response.totalElements ?? 0,
    totalPages: response.totalPages ?? 0,
    page: response.number ?? query.page ?? 0,
  }))
}

export async function updateExpenseMemo(expense: ExpenseMemo, memo: string) {
  const normalizedMemo = memo.trim()

  const expenseId = requireExpenseId(expense.expenseId)
  const detail = await apiRequest<ExpenseResponseDto>(
    `/expenses/${expenseId}`,
  )

  if (
    detail.originalAmount === undefined ||
    !detail.originalCurrency ||
    !detail.spentAt ||
    detail.categoryId === undefined
  ) {
    throw new Error('메모 수정에 필요한 지출 상세 정보가 부족합니다.')
  }

  const updated = await apiRequest<ExpenseResponseDto>(
    `/expenses/${expenseId}`,
    {
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
    },
  )

  return { ...expense, memo: updated.memo ?? normalizedMemo }
}

export async function deleteExpenseMemos(expenseIds: string[]) {
  const ids = expenseIds.map(requireExpenseId)
  await apiRequest<void>(
    '/expenses/memos',
    {
      method: 'DELETE',
      body: JSON.stringify({ expenseIds: ids }),
    },
  )
  return true
}
