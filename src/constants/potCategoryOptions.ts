export interface PotCategoryOption {
  id: string
  label: string
  iconSrc: string
  legacySymbol: string
}

export const POT_CATEGORY_OPTIONS: PotCategoryOption[] = [
  { id: 'transport', label: '교통', iconSrc: '/assets/icons/pots/categories/pot-category-transport.png', legacySymbol: '🚌' },
  { id: 'food', label: '식비', iconSrc: '/assets/icons/pots/categories/pot-category-food.png', legacySymbol: '🍔' },
  { id: 'travel', label: '여행', iconSrc: '/assets/icons/pots/categories/pot-category-travel.png', legacySymbol: '✈️' },
  { id: 'education', label: '학업', iconSrc: '/assets/icons/pots/categories/pot-category-education.png', legacySymbol: '🎓' },
  { id: 'housing', label: '주거', iconSrc: '/assets/icons/pots/categories/pot-category-housing.png', legacySymbol: '🏠' },
  { id: 'communication', label: '통신', iconSrc: '/assets/icons/categories/category-communication.png', legacySymbol: '📞' },
  { id: 'shopping', label: '쇼핑', iconSrc: '/assets/icons/pots/categories/pot-category-shopping.png', legacySymbol: '🛍️' },
  { id: 'savings', label: '저축', iconSrc: '/assets/icons/pots/categories/pot-category-savings.png', legacySymbol: '🐷' },
]

export function findPotCategory(value: string) {
  return POT_CATEGORY_OPTIONS.find((option) => option.id === value || option.legacySymbol === value)
}
