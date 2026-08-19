import type { MascotMessage } from '@/types/expense'

export interface Pot {
  potId: string
  name: string
  icon: string
  representativeImageKey: string
  imageSrc: string
  targetAmount: number
  savedAmount: number
  monthlyContribution: number
  /** 사용자 시간대 기준 이번 달에 실제로 배정한 금액입니다. */
  thisMonthAmount: number
  archived: boolean
  displayOrder: number
  autoSavingRate: number
  autoSavingEnabled: boolean
  completedAt?: string
}

export interface CreatePotInput {
  name: string
  icon: string
  representativeImageKey: string
  imageSrc: string
  targetAmount: number
  savedAmount: number
  monthlyContribution: number
  autoSavingRate: number
  autoSavingEnabled: boolean
}

export type UpdatePotInput = Partial<
  CreatePotInput & Pick<Pot, 'thisMonthAmount' | 'archived' | 'displayOrder'>
>

export interface PotsData {
  homeCurrency: string
  monthlyBudget: number
  totalAssets: number
  monthlyExpense: number
  allocatedAmount: number
  availableAmount: number
  pots: Pot[]
  mascotMessages: MascotMessage[]
}
