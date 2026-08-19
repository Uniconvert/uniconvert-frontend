import { describe, expect, it } from 'vitest'
import { mapExpenseListItemDto } from './expenses'

describe('expense DTO to domain mapping', () => {
  it('normalizes optional API fields into the ExpenseListItem model', () => {
    expect(mapExpenseListItemDto({
      id: 12,
      merchantName: '  Cafe  ',
      categoryName: '식비',
      iconKey: 'icon_food',
      convertedAmountHome: 8_500,
      spentAt: '2026-08-18T12:00:00',
    })).toEqual({
      expenseId: '12',
      merchantName: 'Cafe',
      categoryName: '식비',
      convertedAmountHome: 8_500,
      iconKey: 'food',
      spentAt: '2026-08-18T12:00:00',
    })
  })

  it('uses safe domain fallbacks when optional fields are missing', () => {
    expect(mapExpenseListItemDto({ id: 13 })).toEqual({
      expenseId: '13',
      merchantName: '기타',
      categoryName: '기타',
      convertedAmountHome: 0,
      iconKey: 'other',
      spentAt: '',
    })
  })
})
