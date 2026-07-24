const SPECIAL_CATEGORY_ICONS: Record<string, string> = {
  other: '/assets/icons/actions/action-add.png',
  housing: '/assets/icons/pots/categories/pot-category-housing.png',
  shopping: '/assets/icons/categories/category-shopping.png',
}

export function getCategoryIconPath(iconKey: string) {
  return SPECIAL_CATEGORY_ICONS[iconKey]
    ?? `/assets/icons/categories/category-${iconKey}.png`
}
