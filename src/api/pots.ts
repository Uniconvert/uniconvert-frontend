import { createStoredPot, deleteStoredPot, getStoredPots, updateStoredPot } from '@/mocks/potStore'
import {
  getDefaultPotRepresentativeImageKey,
  getPotRepresentativeImageKeyBySrc,
  getPotRepresentativeImageSrc,
} from '@/constants/potRepresentativeImages'
import type { CreatePotInput, Pot, PotsData, UpdatePotInput } from '@/types/pot'
import { getBudget } from './budgets'
import { apiRequest, isUsingMockApi } from './client'
import { getExpenseHistory } from './expenses'

interface PotResponseDto {
  potId?: number
  name?: string | null
  goalCategory?: string | null
  representativeImageKey?: string | null
  targetAmount?: number
  savedAmount?: number
  monthlyAllocation?: number
  thisMonthAmount?: number
  archived?: boolean
  displayOrder?: number
  createdAt?: string | null
  updatedAt?: string | null
}

interface PotAllocationResponseDto {
  allocationId?: number
  potId?: number
  potName?: string | null
  yearMonth?: string | null
  amount?: number
}

export const isUsingMockPotsApi = isUsingMockApi

function getCurrentYearMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function toClientGoalCategory(value?: string | null) {
  const normalized = value?.trim().toLowerCase() || 'savings'
  return normalized === 'saving' ? 'savings' : normalized
}

function toServerGoalCategory(value: string) {
  const normalized = value.trim().toUpperCase()
  return normalized === 'SAVINGS' ? 'SAVING' : normalized
}

function toPot(response: PotResponseDto, fallback?: Partial<Pot>): Pot {
  const icon = toClientGoalCategory(response.goalCategory ?? fallback?.icon)
  const representativeImageKey = response.representativeImageKey
    ?? fallback?.representativeImageKey
    ?? getPotRepresentativeImageKeyBySrc(fallback?.imageSrc)
    ?? getDefaultPotRepresentativeImageKey(icon)
  return {
    potId: String(response.potId ?? fallback?.potId ?? ''),
    name: response.name?.trim() || fallback?.name || '이름 없는 Pot',
    icon,
    representativeImageKey,
    imageSrc: getPotRepresentativeImageSrc(representativeImageKey),
    targetAmount: response.targetAmount ?? fallback?.targetAmount ?? 0,
    savedAmount: response.savedAmount ?? fallback?.savedAmount ?? 0,
    monthlyContribution: response.monthlyAllocation ?? fallback?.monthlyContribution ?? 0,
    thisMonthAmount: response.thisMonthAmount ?? fallback?.thisMonthAmount ?? 0,
    archived: response.archived ?? fallback?.archived ?? false,
    displayOrder: response.displayOrder ?? fallback?.displayOrder ?? 0,
    autoSavingRate: fallback?.autoSavingRate ?? 0,
    autoSavingEnabled: fallback?.autoSavingEnabled ?? false,
  }
}

export async function getPots(): Promise<PotsData> {
  if (isUsingMockPotsApi) return getStoredPots()

  const yearMonth = getCurrentYearMonth()
  const [responses, expenseHistory, budget] = await Promise.all([
    apiRequest<PotResponseDto[]>(
      '/pots?includeArchived=false',
      { data: [] },
      { useMock: false },
    ),
    getExpenseHistory(yearMonth, 'month').catch(() => null),
    getBudget(yearMonth, { useMock: false }).catch(() => null),
  ])

  const pots = responses.map((response) => toPot(response))
  const activeAllocation = pots.reduce(
    (sum, pot) => sum + Math.max(pot.thisMonthAmount, 0),
    0,
  )
  const serverDerivedAllocation = Math.max(
    (expenseHistory?.monthlyBudgetHome ?? 0)
      - (expenseHistory?.monthlyExpenseHome ?? 0)
      - (expenseHistory?.remainingBudgetHome ?? 0),
    0,
  )
  const allocatedAmount = Math.max(activeAllocation, serverDerivedAllocation)
  const totalAssets = expenseHistory?.monthlyBudgetHome
    ?? budget?.monthlyLimitHome
    ?? 0
  const monthlyExpense = Math.max(expenseHistory?.monthlyExpenseHome ?? 0, 0)

  return {
    homeCurrency: expenseHistory?.homeCurrency ?? 'KRW',
    monthlyBudget: totalAssets,
    totalAssets,
    monthlyExpense,
    allocatedAmount,
    availableAmount: Math.max(totalAssets - monthlyExpense - allocatedAmount, 0),
    pots,
  }
}

export async function createPot(input: CreatePotInput): Promise<Pot> {
  if (isUsingMockPotsApi) return createStoredPot(input)

  const response = await apiRequest<PotResponseDto>(
    '/pots',
    { data: { name: input.name, targetAmount: input.targetAmount, savedAmount: 0 } },
    {
      method: 'POST',
      body: JSON.stringify({
        name: input.name,
        goalCategory: toServerGoalCategory(input.icon),
        representativeImageKey: input.representativeImageKey,
        targetAmount: input.targetAmount,
        monthlyAllocation: input.monthlyContribution,
      }),
      useMock: false,
    },
  )

  const created = toPot(response, input)
  if (input.savedAmount <= 0) return created
  return allocatePotAmount(created, input.savedAmount)
}

export async function updatePot(potId: string, input: UpdatePotInput) {
  if (isUsingMockPotsApi) return updateStoredPot(potId, input)

  const response = await apiRequest<PotResponseDto>(
    `/pots/${encodeURIComponent(potId)}`,
    { data: { potId: Number(potId), name: input.name, targetAmount: input.targetAmount } },
    {
      method: 'PATCH',
      body: JSON.stringify({
        name: input.name,
        goalCategory: input.icon ? toServerGoalCategory(input.icon) : undefined,
        representativeImageKey: input.representativeImageKey,
        targetAmount: input.targetAmount,
        monthlyAllocation: input.monthlyContribution,
        displayOrder: input.displayOrder,
      }),
      useMock: false,
    },
  )

  return toPot(response, { potId, ...input })
}

export async function allocatePotAmount(pot: Pot, amountToAdd: number): Promise<Pot> {
  if (amountToAdd <= 0) return pot

  if (isUsingMockPotsApi) {
    const updated = updateStoredPot(pot.potId, {
      savedAmount: pot.savedAmount + amountToAdd,
      thisMonthAmount: pot.thisMonthAmount + amountToAdd,
    })
    if (!updated) throw new Error('Pot allocation failed')
    return updated
  }

  const nextThisMonthAmount = pot.thisMonthAmount + amountToAdd
  const allocation = await apiRequest<PotAllocationResponseDto>(
    `/pots/${encodeURIComponent(pot.potId)}/allocations`,
    { data: { potId: Number(pot.potId), yearMonth: getCurrentYearMonth(), amount: nextThisMonthAmount } },
    {
      method: 'POST',
      body: JSON.stringify({ yearMonth: getCurrentYearMonth(), amount: nextThisMonthAmount }),
      useMock: false,
    },
  )

  return {
    ...pot,
    savedAmount: pot.savedAmount + amountToAdd,
    thisMonthAmount: allocation.amount ?? nextThisMonthAmount,
  }
}

export async function archivePot(potId: string) {
  if (isUsingMockPotsApi) return deleteStoredPot(potId)

  await apiRequest<PotResponseDto>(
    `/pots/${encodeURIComponent(potId)}/archive`,
    { data: { potId: Number(potId), archived: true } },
    {
      method: 'PATCH',
      body: JSON.stringify({ archived: true }),
      useMock: false,
    },
  )
  return true
}
