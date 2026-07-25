import potsMock from '@/mocks/pots.json'
import { updateOnboardingSettings } from '@/auth/session'
import { getMockHomeCurrency, getMockMonthlyBudget, getMockStorageKey, isSeededMockUser } from '@/mocks/mockScenario'
import type { ApiResponse } from '@/types/api'
import type { CreatePotInput, Pot, PotsData, UpdatePotInput } from '@/types/pot'

const STORAGE_KEY = 'uniconvert.mockPots.v2'

function synchronizeSummary(data: PotsData): PotsData {
  const monthlyBudget = getMockMonthlyBudget()
  const allocatedAmount = data.pots.reduce((sum, pot) => sum + Math.max(pot.targetAmount, 0), 0)
  return {
    ...data,
    homeCurrency: getMockHomeCurrency(),
    monthlyBudget,
    allocatedAmount,
    availableAmount: Math.max(monthlyBudget - allocatedAmount, 0),
  }
}

function seedData(): PotsData {
  if (!isSeededMockUser()) {
    const monthlyBudget = getMockMonthlyBudget()
    return {
      homeCurrency: getMockHomeCurrency(),
      monthlyBudget,
      allocatedAmount: 0,
      availableAmount: monthlyBudget,
      pots: [],
    }
  }

  const data = structuredClone((potsMock as ApiResponse<PotsData>).data)
  return synchronizeSummary({
    ...data,
    pots: data.pots.map((pot) => ({
      ...pot,
      autoSavingEnabled: pot.autoSavingEnabled ?? (pot.monthlyContribution > 0),
    })),
  })
}

export function getStoredPots(): PotsData {
  const storageKey = getMockStorageKey(STORAGE_KEY)
  const stored = localStorage.getItem(storageKey)
  if (!stored) {
    const initialData = synchronizeSummary(seedData())
    localStorage.setItem(storageKey, JSON.stringify(initialData))
    return initialData
  }
  try {
    const data = JSON.parse(stored) as PotsData
    const synchronized = synchronizeSummary(data)
    localStorage.setItem(storageKey, JSON.stringify(synchronized))
    return synchronized
  } catch {
    const initialData = seedData()
    localStorage.setItem(storageKey, JSON.stringify(initialData))
    return initialData
  }
}

export function updateStoredMonthlyBudget(amount: number) {
  const current = getStoredPots()
  const monthlyBudget = Math.max(0, Math.round(amount))
  updateOnboardingSettings({ monthlyBudget })
  sessionStorage.setItem('uniconvert.monthlyBudget', String(monthlyBudget))
  const updated = synchronizeSummary({
    ...current,
    monthlyBudget,
  })

  localStorage.setItem(getMockStorageKey(STORAGE_KEY), JSON.stringify(updated))
  return updated
}

function saveData(data: PotsData) {
  localStorage.setItem(getMockStorageKey(STORAGE_KEY), JSON.stringify(synchronizeSummary(data)))
}

export function createStoredPot(input: CreatePotInput) {
  const data = getStoredPots()
  const pot: Pot = { potId: `pot-${Date.now()}`, ...input }
  saveData({ ...data, pots: [...data.pots, pot] })
  return pot
}

export function updateStoredPot(potId: string, input: UpdatePotInput) {
  const data = getStoredPots()
  const current = data.pots.find((pot) => pot.potId === potId)
  if (!current) return null
  const nextSavedAmount = input.savedAmount ?? current.savedAmount
  const nextTargetAmount = input.targetAmount ?? current.targetAmount
  const updated = {
    ...current,
    ...input,
    potId,
    completedAt: nextSavedAmount >= nextTargetAmount
      ? current.completedAt ?? new Date().toISOString().slice(0, 10)
      : undefined,
  }
  saveData({ ...data, pots: data.pots.map((pot) => pot.potId === potId ? updated : pot) })
  return updated
}

export function deleteStoredPot(potId: string) {
  const data = getStoredPots()
  const pots = data.pots.filter((pot) => pot.potId !== potId)
  if (pots.length === data.pots.length) return false
  saveData({ ...data, pots })
  return true
}
