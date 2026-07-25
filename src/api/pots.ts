import { createStoredPot, deleteStoredPot, getStoredPots, updateStoredPot } from '@/mocks/potStore'
import { getMockHomeCurrency } from '@/mocks/mockScenario'
import type { CreatePotInput, Pot, PotsData, UpdatePotInput } from '@/types/pot'
import { apiRequest, isUsingMockApi } from './client'

interface SubWalletResponse {
  subWalletId: number
  name: string
  currentBalance: number
  targetAmount: number | null
  progressPercent: number | null
  iconKey: string | null
}

interface SubWalletListResponse {
  summary: {
    monthlyBudgetHome: number
    potsAllocatedAmountHome: number
    availableAmountHome: number
  }
  subWallets: SubWalletResponse[]
}

function toPot(wallet: SubWalletResponse): Pot {
  return {
    potId: String(wallet.subWalletId),
    name: wallet.name,
    icon: wallet.iconKey ?? '💰',
    imageSrc: '',
    targetAmount: wallet.targetAmount ?? 0,
    savedAmount: wallet.currentBalance,
    monthlyContribution: 0,
    autoSavingRate: 0,
    autoSavingEnabled: false,
  }
}

export function getPots() {
  if (isUsingMockApi) return Promise.resolve(getStoredPots())

  return apiRequest<SubWalletListResponse>('/sub-wallets', {
    data: {
      summary: { monthlyBudgetHome: 0, potsAllocatedAmountHome: 0, availableAmountHome: 0 },
      subWallets: [],
    },
  }).then((response): PotsData => {
    const pots = response.subWallets.map(toPot)
    const allocatedAmount = pots.reduce((sum, pot) => sum + pot.targetAmount, 0)
    return {
      homeCurrency: getMockHomeCurrency(),
      monthlyBudget: response.summary.monthlyBudgetHome,
      allocatedAmount,
      availableAmount: Math.max(response.summary.monthlyBudgetHome - allocatedAmount, 0),
      pots,
    }
  })
}

export function createPot(input: CreatePotInput) {
  if (isUsingMockApi) return Promise.resolve(createStoredPot(input))

  return apiRequest<SubWalletResponse>('/sub-wallets', {
    data: {
      subWalletId: 0,
      name: input.name,
      currentBalance: input.savedAmount,
      targetAmount: input.targetAmount,
      progressPercent: 0,
      iconKey: input.icon,
    },
  }, {
    method: 'POST',
    body: JSON.stringify({
      walletType: 'POT',
      name: input.name,
      currentBalance: input.savedAmount,
      isLocked: false,
      targetAmount: input.targetAmount,
      iconKey: input.icon,
    }),
  }).then((response) => ({ ...input, ...toPot(response) }))
}

export function updatePot(potId: string, input: UpdatePotInput) {
  if (isUsingMockApi) return Promise.resolve(updateStoredPot(potId, input))

  return apiRequest<SubWalletResponse>(`/sub-wallets/${potId}`, {
    data: {
      subWalletId: Number(potId),
      name: input.name ?? '',
      currentBalance: input.savedAmount ?? 0,
      targetAmount: input.targetAmount ?? null,
      progressPercent: null,
      iconKey: input.icon ?? null,
    },
  }, {
    method: 'PATCH',
    body: JSON.stringify({
      name: input.name,
      targetAmount: input.targetAmount,
      iconKey: input.icon,
    }),
  }).then(toPot)
}

export function deletePot(potId: string) {
  if (isUsingMockApi) return Promise.resolve(deleteStoredPot(potId))

  // Swagger 초안에는 Pot 삭제 API가 없으므로 잘못된 요청을 보내지 않습니다.
  return Promise.reject(new Error('Pots 삭제 API가 아직 확정되지 않았습니다.'))
}
