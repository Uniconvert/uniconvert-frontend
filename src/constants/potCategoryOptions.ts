export interface PotCategoryOption {
  id: string
  label: string
  iconSrc: string
  displayScale: number
  legacySymbol: string
}

export const POT_CATEGORY_OPTIONS: PotCategoryOption[] = [
  { id: 'transport', label: '교통', iconSrc: '/assets/icons/pots/categories/pot-category-transport.png', displayScale: 1.03, legacySymbol: '🚌' },
  { id: 'food', label: '식비', iconSrc: '/assets/icons/pots/categories/pot-category-food.png', displayScale: 0.95, legacySymbol: '🍔' },
  { id: 'travel', label: '여행', iconSrc: '/assets/icons/pots/categories/pot-category-travel.png', displayScale: 1.31, legacySymbol: '✈️' },
  { id: 'education', label: '학업', iconSrc: '/assets/icons/pots/categories/pot-category-education.png', displayScale: 1.3, legacySymbol: '🎓' },
  { id: 'housing', label: '주거', iconSrc: '/assets/icons/pots/categories/pot-category-housing.png', displayScale: 1.24, legacySymbol: '🏠' },
  { id: 'communication', label: '통신', iconSrc: '/assets/icons/categories/category-communication.png', displayScale: 1.18, legacySymbol: '📞' },
  { id: 'shopping', label: '쇼핑', iconSrc: '/assets/icons/pots/categories/pot-category-shopping.png', displayScale: 1.28, legacySymbol: '🛍️' },
  { id: 'savings', label: '저축', iconSrc: '/assets/icons/pots/categories/pot-category-savings.png', displayScale: 1.48, legacySymbol: '🐷' },
]

export function findPotCategory(value: string) {
  return POT_CATEGORY_OPTIONS.find((option) => option.id === value || option.legacySymbol === value)
}
