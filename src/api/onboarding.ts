import { getOnboardingSettings, getSessionUser } from '@/auth/session'
import { apiRequest, isUsingMockApi } from './client'

export interface OnboardingSaveInput {
  homeCurrencyCode?: string
  localCurrencyCode?: string
  monthlyLimitHome: number
  timezone?: string
}

export interface OnboardingResponseDto {
  userId: number
  email: string
  nickname: string
  imageUrl?: string | null
  homeCurrencyCode?: string | null
  localCurrencyCode?: string | null
  timezone?: string | null
  onboardingStep?: number | null
  onboardingCompleted: boolean
  onboardingCompletedAt?: string | null
  yearMonth?: string | null
  monthlyLimitHome: number
}

interface OnboardingApiOptions {
  useMock?: boolean
}

export const isUsingMockOnboardingApi =
  isUsingMockApi && import.meta.env.VITE_USE_REAL_ONBOARDING_API !== 'true'

function createMockResponse(input?: OnboardingSaveInput): OnboardingResponseDto {
  const user = getSessionUser()
  const settings = getOnboardingSettings()
  const onboardingCompleted = input ? true : (user?.isOnboardingCompleted ?? false)

  return {
    userId: user?.userId ?? 0,
    email: user?.email ?? '',
    nickname: user?.nickname ?? '',
    imageUrl: user?.profileImage ?? '',
    homeCurrencyCode: input?.homeCurrencyCode ?? settings.baseCurrency ?? null,
    localCurrencyCode: input?.localCurrencyCode ?? settings.localCurrencies?.[0] ?? null,
    timezone: input?.timezone ?? settings.timeZone ?? null,
    onboardingStep: onboardingCompleted ? 5 : 0,
    onboardingCompleted,
    onboardingCompletedAt: onboardingCompleted ? new Date().toISOString() : null,
    yearMonth: new Date().toISOString().slice(0, 7),
    monthlyLimitHome: input?.monthlyLimitHome ?? settings.monthlyBudget ?? 0,
  }
}

export function saveOnboarding(
  input: OnboardingSaveInput,
  options: OnboardingApiOptions = {},
) {
  return apiRequest<OnboardingResponseDto>(
    '/onboarding',
    { data: createMockResponse(input) },
    {
      method: 'POST',
      body: JSON.stringify(input),
      useMock: options.useMock ?? isUsingMockOnboardingApi,
    },
  )
}

export function getMyOnboarding(options: OnboardingApiOptions = {}) {
  return apiRequest<OnboardingResponseDto>(
    '/onboarding/me',
    { data: createMockResponse() },
    { useMock: options.useMock ?? isUsingMockOnboardingApi },
  )
}
