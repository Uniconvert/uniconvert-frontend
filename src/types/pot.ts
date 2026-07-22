export interface Pot {
  potId: string
  name: string
  icon: string
  imageSrc: string
  targetAmount: number
  savedAmount: number
  monthlyContribution: number
  autoSavingRate: number
  autoSavingEnabled: boolean
  completedAt?: string
}

export interface CreatePotInput {
  name: string
  icon: string
  imageSrc: string
  targetAmount: number
  savedAmount: number
  monthlyContribution: number
  autoSavingRate: number
  autoSavingEnabled: boolean
}

export type UpdatePotInput = Partial<CreatePotInput>

export interface PotsData {
  homeCurrency: string
  monthlyBudget: number
  allocatedAmount: number
  availableAmount: number
  pots: Pot[]
}
