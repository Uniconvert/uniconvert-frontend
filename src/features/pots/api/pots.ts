import {
  getDefaultPotRepresentativeImageKey,
  getPotRepresentativeImageKeyBySrc,
  getPotRepresentativeImageSrc,
} from '@/features/pots/potRepresentativeImages'
import type { MascotMessage } from '@/types/expense'
import type { CreatePotInput, Pot, PotsData, UpdatePotInput } from '@/features/pots/types'
import { getBudget } from '@/api/budgets'
import { apiRequest } from '@/api/client'
import { getExpenseHistory } from '@/api/expenses'
import { getSessionUser } from '@/auth/session'

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

interface PotListResponseDto {
  pots?: PotResponseDto[]
  uniMessages?: {
    entryMessages?: Array<Partial<MascotMessage>>
    randomMessages?: Array<Partial<MascotMessage>>
  }
}

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

function toMascotMessages(response: PotListResponseDto): MascotMessage[] {
  const messages = [
    ...(response.uniMessages?.entryMessages ?? []),
    ...(response.uniMessages?.randomMessages ?? []),
  ]

  return messages.flatMap((item, index) => {
    const message = item.message?.trim()
    if (!message) return []

    const type = item.type === 'ENTRY' || item.type === 'INSIGHT' || item.type === 'RANDOM'
      ? item.type
      : 'RANDOM'

    return [{
      key: item.key?.trim() || `pots-message-${index}`,
      message,
      type,
    }]
  })
}

export async function getPots(): Promise<PotsData> {
  const yearMonth = getCurrentYearMonth()
  const [response, expenseHistory, budget] = await Promise.all([
    apiRequest<PotListResponseDto>('/pots?includeArchived=false'),
    getExpenseHistory(yearMonth, 'month', (() => { const user = getSessionUser(); return user ? { homeCurrencyCode: user.homeCurrencyCode } : null })()).catch(() => null),
    getBudget(yearMonth).catch(() => null),
  ])

  const pots = (response.pots ?? []).map((pot) => toPot(pot))
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
    mascotMessages: toMascotMessages(response),
  }
}

export async function createPot(input: CreatePotInput): Promise<Pot> {
  const response = await apiRequest<PotResponseDto>(
    '/pots',
    {
      method: 'POST',
      body: JSON.stringify({
        name: input.name,
        goalCategory: toServerGoalCategory(input.icon),
        representativeImageKey: input.representativeImageKey,
        targetAmount: input.targetAmount,
        monthlyAllocation: input.monthlyContribution,
      }),
    },
  )

  const created = toPot(response, input)
  if (input.savedAmount <= 0) return created
  return allocatePotAmount(created, input.savedAmount)
}

export async function updatePot(potId: string, input: UpdatePotInput) {
  const response = await apiRequest<PotResponseDto>(
    `/pots/${encodeURIComponent(potId)}`,
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
    },
  )

  return toPot(response, { potId, ...input })
}

export async function allocatePotAmount(pot: Pot, amountToAdd: number): Promise<Pot> {
  if (amountToAdd <= 0) return pot

  const nextThisMonthAmount = pot.thisMonthAmount + amountToAdd
  const allocation = await apiRequest<PotAllocationResponseDto>(
    `/pots/${encodeURIComponent(pot.potId)}/allocations`,
    {
      method: 'POST',
      body: JSON.stringify({ yearMonth: getCurrentYearMonth(), amount: nextThisMonthAmount }),
    },
  )

  return {
    ...pot,
    savedAmount: pot.savedAmount + amountToAdd,
    thisMonthAmount: allocation.amount ?? nextThisMonthAmount,
  }
}

export async function archivePot(potId: string) {
  await apiRequest<PotResponseDto>(
    `/pots/${encodeURIComponent(potId)}/archive`,
    {
      method: 'PATCH',
      body: JSON.stringify({ archived: true }),
    },
  )
  return true
}
