import { describe, expect, it } from 'vitest'
import { getMobileBudgetMetrics } from './mobileBudgetSummary'

describe('getMobileBudgetMetrics', () => {
  it('uses the actual Expense History usage and remaining values', () => {
    expect(getMobileBudgetMetrics({ budgetUsagePercent: 37.5, remainingBudgetHome: 625 })).toEqual({
      usagePercent: 37.5,
      remainingBudgetHome: 625,
    })
  })

  it('keeps a zero-budget response as a valid zero usage/remaining state', () => {
    expect(getMobileBudgetMetrics({ budgetUsagePercent: 0, remainingBudgetHome: 0 })).toEqual({
      usagePercent: 0,
      remainingBudgetHome: 0,
    })
  })

  it('returns no metrics when the Expense History data is unavailable', () => {
    expect(getMobileBudgetMetrics(null)).toBeNull()
    expect(getMobileBudgetMetrics({ budgetUsagePercent: Number.NaN, remainingBudgetHome: 0 })).toBeNull()
  })
})
