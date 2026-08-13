export interface ExpenseMemo {
  expenseId: string
  categoryName: string
  iconKey: string
  merchantName: string
  memo: string
  spentAt: string
}

/** Swagger GET /expenses/memos의 개별 메모 응답입니다. */
export interface ExpenseMemoDto {
  id?: number
  expenseId?: number | string
  categoryId?: number
  categoryName?: string | null
  iconKey?: string | null
  merchantName?: string | null
  memo?: string | null
  spentAt?: string | null
}

/** Swagger GET /expenses/memos의 Spring Data 페이지 응답입니다. */
export interface ExpenseMemoPageDto {
  content?: ExpenseMemoDto[]
  totalElements?: number
  totalPages?: number
  size?: number
  number?: number
  numberOfElements?: number
  first?: boolean
  last?: boolean
  empty?: boolean
}

export type ExpenseMemoApiResponse = ExpenseMemoPageDto | ExpenseMemoDto[] | {
  content?: ExpenseMemoDto[]
  memos?: ExpenseMemoPageDto
  data?: ExpenseMemoPageDto | ExpenseMemoDto[] | { content?: ExpenseMemoDto[] }
}

export interface ExpenseMemoQuery {
  keyword?: string
  sort?: 'latest' | 'oldest'
  page?: number
}

export interface ExpenseMemoPage {
  items: ExpenseMemo[]
  totalElements: number
  totalPages: number
  page: number
}
