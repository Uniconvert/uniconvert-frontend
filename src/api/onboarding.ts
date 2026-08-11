import { apiRequest } from './client'

export interface OnboardingSaveInput {
  homeCurrencyCode?: string
  localCurrencyCode?: string
  monthlyLimitHome: number
  timezone?: string
  profileImageKey?: string
  primaryGoal?: string
}

export interface OnboardingResponseDto {
  userId: number
  email: string
  nickname: string
  profileImageKey?: string | null
  primaryGoal?: string | null
  homeCurrencyCode?: string | null
  localCurrencyCode?: string | null
  timezone?: string | null
  onboardingStep?: number | null
  onboardingCompleted: boolean
  onboardingCompletedAt?: string | null
  yearMonth?: string | null
  monthlyLimitHome: number
}

export function saveOnboarding(input: OnboardingSaveInput) {
  return apiRequest<OnboardingResponseDto>(
    '/onboarding',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  )
}

export function getMyOnboarding() {
  return apiRequest<OnboardingResponseDto>('/onboarding/me')
}
