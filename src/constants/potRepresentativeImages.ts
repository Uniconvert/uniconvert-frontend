export const POT_REPRESENTATIVE_IMAGE_OPTIONS = [
  { key: 'pot_sapporo_trip', src: '/assets/images/pots/0812-bus-stop.png', width: 90, height: 114 },
  { key: 'pot_education_campus', src: '/assets/images/pots/0812-window-sea.png', width: 90, height: 114 },
  { key: 'pot_shopping_mall', src: '/assets/images/pots/0812-tree.png', width: 90, height: 114 },
  { key: 'pot_travel_resort', src: '/assets/images/pots/0812-clover-garden.png', width: 90, height: 114 },
  { key: 'pot_clover', src: '/assets/images/pots/0812-pebbles.png', width: 90, height: 114 },
] as const

export type PotRepresentativeImageKey = (typeof POT_REPRESENTATIVE_IMAGE_OPTIONS)[number]['key']

const DEFAULT_KEY_BY_CATEGORY: Record<string, PotRepresentativeImageKey> = {
  travel: 'pot_sapporo_trip',
  education: 'pot_education_campus',
  shopping: 'pot_shopping_mall',
  savings: 'pot_clover',
}

export function findPotRepresentativeImage(key?: string | null) {
  return POT_REPRESENTATIVE_IMAGE_OPTIONS.find((option) => option.key === key)
}

export function getPotRepresentativeImageSrc(key?: string | null) {
  return findPotRepresentativeImage(key)?.src ?? POT_REPRESENTATIVE_IMAGE_OPTIONS[0].src
}

export function getPotRepresentativeImageKeyBySrc(src?: string | null) {
  return POT_REPRESENTATIVE_IMAGE_OPTIONS.find((option) => option.src === src)?.key
}

export function getDefaultPotRepresentativeImageKey(category?: string | null) {
  const normalizedCategory = category?.trim().toLowerCase() || 'savings'
  return DEFAULT_KEY_BY_CATEGORY[normalizedCategory] ?? POT_REPRESENTATIVE_IMAGE_OPTIONS[0].key
}

