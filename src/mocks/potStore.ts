import potsMock from '@/mocks/pots.json'
import {
  getDefaultPotRepresentativeImageKey,
  getPotRepresentativeImageKeyBySrc,
  getPotRepresentativeImageSrc,
} from '@/constants/potRepresentativeImages'
import { updateOnboardingSettings } from '@/auth/session'
import { getStoredExpenses } from '@/mocks/expenseStore'
import { getMockHomeCurrency, getMockMonthlyBudget, getMockStorageKey, isSeededMockUser } from '@/mocks/mockScenario'
import type { ApiResponse } from '@/types/api'
import type { CreatePotInput, Pot, PotsData, UpdatePotInput } from '@/types/pot'

const STORAGE_KEY = 'uniconvert.mockPots.v2'

function synchronizeSummary(data: PotsData): PotsData {
  const monthlyBudget = getMockMonthlyBudget()
  const now = new Date()
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const monthlyExpense = getStoredExpenses()
    .filter((expense) => expense.spentAt.startsWith(yearMonth))
    .reduce((sum, expense) => sum + Math.max(expense.convertedAmountHome, 0), 0)
  // Pots의 총 보유 자산은 온보딩에서 설정한 월 예산을 기준으로 고정합니다.
  const totalAssets = monthlyBudget
  const allocatedAmount = data.pots.reduce((sum, pot) => sum + Math.max(pot.thisMonthAmount, 0), 0)
  return {
    ...data,
    homeCurrency: getMockHomeCurrency(),
    monthlyBudget,
    totalAssets,
    monthlyExpense,
    allocatedAmount,
    availableAmount: Math.max(totalAssets - monthlyExpense - allocatedAmount, 0),
  }
}

function seedData(): PotsData {
  if (!isSeededMockUser()) {
    const monthlyBudget = getMockMonthlyBudget()
    return {
      homeCurrency: getMockHomeCurrency(),
      monthlyBudget,
      totalAssets: monthlyBudget,
      monthlyExpense: 0,
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
      representativeImageKey: pot.representativeImageKey
        ?? getPotRepresentativeImageKeyBySrc(pot.imageSrc)
        ?? getDefaultPotRepresentativeImageKey(pot.icon),
      imageSrc: getPotRepresentativeImageSrc(
        pot.representativeImageKey
          ?? getPotRepresentativeImageKeyBySrc(pot.imageSrc)
          ?? getDefaultPotRepresentativeImageKey(pot.icon),
      ),
      thisMonthAmount: pot.thisMonthAmount ?? pot.savedAmount,
      archived: pot.archived ?? false,
      displayOrder: pot.displayOrder ?? 0,
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
    const parsed = JSON.parse(stored) as PotsData
    const data = {
      ...parsed,
      pots: parsed.pots.map((pot) => ({
        ...pot,
        representativeImageKey: pot.representativeImageKey
          ?? getPotRepresentativeImageKeyBySrc(pot.imageSrc)
          ?? getDefaultPotRepresentativeImageKey(pot.icon),
        imageSrc: getPotRepresentativeImageSrc(
          pot.representativeImageKey
            ?? getPotRepresentativeImageKeyBySrc(pot.imageSrc)
            ?? getDefaultPotRepresentativeImageKey(pot.icon),
        ),
        thisMonthAmount: pot.thisMonthAmount ?? pot.savedAmount,
        archived: pot.archived ?? false,
        displayOrder: pot.displayOrder ?? 0,
      })),
    }
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
  const pot: Pot = {
    potId: `pot-${Date.now()}`,
    ...input,
    savedAmount: Math.min(Math.max(input.savedAmount, 0), data.availableAmount),
    thisMonthAmount: Math.min(Math.max(input.savedAmount, 0), data.availableAmount),
    archived: false,
    displayOrder: data.pots.length,
  }
  saveData({ ...data, pots: [...data.pots, pot] })
  return pot
}

export function updateStoredPot(potId: string, input: UpdatePotInput) {
  const data = getStoredPots()
  const current = data.pots.find((pot) => pot.potId === potId)
  if (!current) return null
  const requestedSavedAmount = input.savedAmount ?? current.savedAmount
  const nextSavedAmount = Math.min(
    Math.max(requestedSavedAmount, 0),
    current.savedAmount + data.availableAmount,
  )
  const nextTargetAmount = input.targetAmount ?? current.targetAmount
  const updated = {
    ...current,
    ...input,
    potId,
    representativeImageKey: input.representativeImageKey ?? current.representativeImageKey,
    imageSrc: getPotRepresentativeImageSrc(
      input.representativeImageKey ?? current.representativeImageKey,
    ),
    savedAmount: nextSavedAmount,
    thisMonthAmount: input.thisMonthAmount ?? current.thisMonthAmount,
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
