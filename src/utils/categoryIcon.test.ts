import { describe, expect, it } from 'vitest'

import { getCategoryIconPath, normalizeCategoryIconKey } from './categoryIcon'

describe('category icon mapping', () => {
  it.each([
    ['icon_telecom', 'communication'],
    ['icon_academic', 'education'],
    ['icon_etc', 'other'],
    ['icon_food', 'food'],
  ])('normalizes server icon key %s', (serverKey, expected) => {
    expect(normalizeCategoryIconKey(serverKey)).toBe(expected)
  })

  it('returns an existing special asset path for the other category', () => {
    expect(getCategoryIconPath('icon_etc')).toBe('/assets/icons/actions/action-more.png')
  })
})
