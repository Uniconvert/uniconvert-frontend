import { getOnboardingSettings, getSessionUser } from '@/auth/session'
import type { MockDataMode } from '@/types/auth'

export function getMockDataMode(): MockDataMode {
  return getSessionUser()?.mockDataMode ?? 'onboarding-empty'
}

export function isSeededMockUser() {
  return getMockDataMode() === 'demo-seeded'
}

export function getMockStorageKey(name: string) {
  const userId = getSessionUser()?.userId ?? 'anonymous'
  return `${name}.${userId}`
}

export function getMockMonthlyBudget() {
  const storedBudget = getOnboardingSettings().monthlyBudget
  if (typeof storedBudget === 'number' && Number.isFinite(storedBudget) && storedBudget > 0) return storedBudget
  if (isSeededMockUser()) return 1_250_000
  return 0
}

export function getMockHomeCurrency() {
  if (isSeededMockUser()) return 'KRW'
  return getOnboardingSettings().baseCurrency || 'KRW'
}
