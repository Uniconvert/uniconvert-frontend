import { getCategoryIconPath, normalizeCategoryIconKey } from '@/utils/categoryIcon'
import { apiRequest, isUsingMockApi } from './client'

export interface ExpenseCategoryOption {
  id: string
  serverId: number
  label: string
  iconKey: string
  iconSrc: string
}

interface CategoryResponseDto {
  categoryId?: number
  name?: string | null
  iconKey?: string | null
  sortOrder?: number
}

const FALLBACK_CATEGORIES: ExpenseCategoryOption[] = [
  { id: 'food', serverId: 1, label: '식비', iconKey: 'food', iconSrc: getCategoryIconPath('food') },
  { id: 'transport', serverId: 2, label: '교통', iconKey: 'transport', iconSrc: getCategoryIconPath('transport') },
  { id: 'shopping', serverId: 3, label: '쇼핑', iconKey: 'shopping', iconSrc: getCategoryIconPath('shopping') },
  { id: 'communication', serverId: 4, label: '통신', iconKey: 'communication', iconSrc: getCategoryIconPath('communication') },
  { id: 'education', serverId: 5, label: '학업', iconKey: 'education', iconSrc: getCategoryIconPath('education') },
  { id: 'travel', serverId: 6, label: '여행', iconKey: 'travel', iconSrc: getCategoryIconPath('travel') },
  { id: 'other', serverId: 7, label: '기타', iconKey: 'other', iconSrc: getCategoryIconPath('other') },
]

export const isUsingMockCategoryApi = isUsingMockApi

export function getFallbackCategories() {
  return FALLBACK_CATEGORIES
}

export async function getCategories() {
  if (isUsingMockCategoryApi) return FALLBACK_CATEGORIES

  const response = await apiRequest<CategoryResponseDto[]>(
    '/categories',
    { data: [] },
    { useMock: false },
  )

  const categories = response
    .filter((category): category is CategoryResponseDto & { categoryId: number } => (
      typeof category.categoryId === 'number'
    ))
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((category) => {
      const iconKey = normalizeCategoryIconKey(category.iconKey)
      return {
        id: String(category.categoryId),
        serverId: category.categoryId,
        label: category.name?.trim() || '기타',
        iconKey,
        iconSrc: getCategoryIconPath(iconKey),
      }
    })

  return categories.length > 0 ? categories : FALLBACK_CATEGORIES
}
