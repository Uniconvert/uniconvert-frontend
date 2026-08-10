import { apiRequest, isUsingMockApi } from '@/api/client'
import { getStoredExpenses, updateStoredExpense } from '@/mocks/expenseStore'
import type { ExpenseResponseDto } from '@/types/expense'
import type {
  ExpenseMemo,
  ExpenseMemoDto,
  ExpenseMemoPage,
  ExpenseMemoPageDto,
  ExpenseMemoQuery,
} from '@/types/memo'

const MEMO_PAGE_SIZE = 6

function toExpenseMemo(expense: ReturnType<typeof getStoredExpenses>[number]): ExpenseMemo {
  return {
    expenseId: expense.expenseId,
    categoryName: expense.categoryName,
    iconKey: expense.iconKey,
    merchantName: expense.merchantName,
    memo: expense.memo,
    spentAt: expense.spentAt,
  }
}

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
  if (isUsingMockApi) {
    const keyword = query.keyword?.trim().toLocaleLowerCase('ko-KR') || ''
    const page = query.page ?? 0
    const memos = getStoredExpenses()
      .filter((expense) => expense.memo.trim().length > 0)
      .map(toExpenseMemo)
      .filter((memo) => !keyword || [memo.memo, memo.categoryName, memo.merchantName]
        .some((value) => value.toLocaleLowerCase('ko-KR').includes(keyword)))
      .sort((a, b) => {
        const comparison = a.spentAt.localeCompare(b.spentAt)
        return query.sort === 'oldest' ? comparison : -comparison
      })

    return Promise.resolve({
      items: memos.slice(page * MEMO_PAGE_SIZE, (page + 1) * MEMO_PAGE_SIZE),
      totalElements: memos.length,
      totalPages: Math.ceil(memos.length / MEMO_PAGE_SIZE),
      page,
    })
  }

  const params = buildMemoParams(query)
  return apiRequest<ExpenseMemoPageDto>(
    `/expenses/memos?${params.toString()}`,
    { data: { content: [], totalElements: 0, totalPages: 0, number: query.page ?? 0 } },
    { useMock: false },
  ).then((response) => ({
    items: (response.content ?? []).map(toExpenseMemoFromDto),
    totalElements: response.totalElements ?? 0,
    totalPages: response.totalPages ?? 0,
    page: response.number ?? query.page ?? 0,
  }))
}

export async function updateExpenseMemo(expense: ExpenseMemo, memo: string) {
  const normalizedMemo = memo.trim()

  if (isUsingMockApi) {
    const updated = updateStoredExpense(expense.expenseId, { memo: normalizedMemo })
    return Promise.resolve(updated ? toExpenseMemo(updated) : null)
  }

  const expenseId = requireExpenseId(expense.expenseId)
  const detail = await apiRequest<ExpenseResponseDto>(
    `/expenses/${expenseId}`,
    { data: {} },
    { useMock: false },
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
    { data: detail },
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
      useMock: false,
    },
  )

  return { ...expense, memo: updated.memo ?? normalizedMemo }
}

export async function deleteExpenseMemos(expenseIds: string[]) {
  if (isUsingMockApi) {
    expenseIds.forEach((expenseId) => updateStoredExpense(expenseId, { memo: '' }))
    return true
  }

  const ids = expenseIds.map(requireExpenseId)
  await apiRequest<void>(
    '/expenses/memos',
    { data: undefined },
    {
      method: 'DELETE',
      body: JSON.stringify({ expenseIds: ids }),
      useMock: false,
    },
  )
  return true
}
