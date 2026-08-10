const SPECIAL_CATEGORY_ICONS: Record<string, string> = {
  other: '/assets/icons/actions/action-more.png',
  medical: '/assets/icons/categories/category-medical.png',
  housing: '/assets/icons/pots/categories/pot-category-housing.png',
  savings: '/assets/icons/pots/categories/pot-category-savings.png',
  shopping: '/assets/icons/categories/category-shopping.png',
}

const CATEGORY_ICON_ALIASES: Record<string, string> = {
  academic: 'education',
  etc: 'other',
  telecom: 'communication',
}

export function normalizeCategoryIconKey(iconKey?: string | null) {
  const normalized = iconKey?.trim().toLowerCase().replace(/^icon_/, '') || 'other'
  return CATEGORY_ICON_ALIASES[normalized] ?? normalized
}

export function getCategoryIconPath(iconKey?: string | null) {
  const normalized = normalizeCategoryIconKey(iconKey)
  return SPECIAL_CATEGORY_ICONS[normalized]
    ?? `/assets/icons/categories/category-${normalized}.png`
}
