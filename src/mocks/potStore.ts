import potsMock from '@/mocks/pots.json'
import { getMockHomeCurrency, getMockMonthlyBudget, getMockStorageKey, isSeededMockUser } from '@/mocks/mockScenario'
import type { ApiResponse } from '@/types/api'
import type { CreatePotInput, Pot, PotsData, UpdatePotInput } from '@/types/pot'

const STORAGE_KEY = 'uniconvert.mockPots.v2'

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
  return {
    ...data,
    pots: data.pots.map((pot) => ({
      ...pot,
      autoSavingEnabled: pot.autoSavingEnabled ?? (pot.monthlyContribution > 0),
    })),
  }
}

export function getStoredPots(): PotsData {
  const storageKey = getMockStorageKey(STORAGE_KEY)
  const stored = localStorage.getItem(storageKey)
  if (!stored) {
    const initialData = seedData()
    localStorage.setItem(storageKey, JSON.stringify(initialData))
    return initialData
  }
  try {
    const data = JSON.parse(stored) as PotsData
    if (isSeededMockUser()) return data

    const monthlyBudget = getMockMonthlyBudget()
    const allocatedAmount = data.pots.reduce(
      (sum, pot) => sum + (pot.autoSavingEnabled ? pot.monthlyContribution : 0),
      0,
    )
    const synchronized = {
      ...data,
      homeCurrency: getMockHomeCurrency(),
      monthlyBudget,
      allocatedAmount,
      availableAmount: Math.max(monthlyBudget - allocatedAmount, 0),
    }
    localStorage.setItem(storageKey, JSON.stringify(synchronized))
    return synchronized
  } catch {
    const initialData = seedData()
    localStorage.setItem(storageKey, JSON.stringify(initialData))
    return initialData
  }
}

function saveData(data: PotsData) {
  const allocatedAmount = data.pots.reduce((sum, pot) => sum + (pot.autoSavingEnabled ? pot.monthlyContribution : 0), 0)
  localStorage.setItem(getMockStorageKey(STORAGE_KEY), JSON.stringify({
    ...data,
    allocatedAmount,
    availableAmount: Math.max(data.monthlyBudget - allocatedAmount, 0),
  }))
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
