export interface Pot {
  potId: string
  name: string
  icon: string
  imageSrc: string
  targetAmount: number
  savedAmount: number
  monthlyContribution: number
  autoSavingRate: number
}

export interface CreatePotInput {
  name: string
  icon: string
  imageSrc: string
  targetAmount: number
  savedAmount: number
  monthlyContribution: number
  autoSavingRate: number
}

export interface PotsData {
  homeCurrency: string
  monthlyBudget: number
  allocatedAmount: number
  availableAmount: number
  pots: Pot[]
}
