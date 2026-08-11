import type { AuthUser } from '@/types/auth'

export interface OnboardingSettings {
  baseCurrency?: string
  localCurrencies?: string[]
  monthlyBudget?: number
  timeZone?: string
  profileGoals?: string[]
}

const SESSION_KEYS = {
  user: 'uniconvert.user',
  accessToken: 'uniconvert.accessToken',
  refreshToken: 'uniconvert.refreshToken',
} as const

const ONBOARDING_KEYS = [
  'uniconvert.baseCurrency',
  'uniconvert.localCurrencies',
  'uniconvert.monthlyBudget',
  'uniconvert.timeZone',
  'uniconvert.profileGoals',
] as const

export const SESSION_USER_CHANGED_EVENT = 'uniconvert:session-user-changed'

export interface SessionTokens {
  accessToken: string
  refreshToken: string
}

function notifySessionUserChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SESSION_USER_CHANGED_EVENT))
  }
}

function getStoredValue(key: keyof typeof SESSION_KEYS) {
  return sessionStorage.getItem(SESSION_KEYS[key])
}

export function saveSessionUser(user: AuthUser) {
  ONBOARDING_KEYS.forEach((key) => sessionStorage.removeItem(key))
  sessionStorage.setItem(SESSION_KEYS.user, JSON.stringify(user))
  notifySessionUserChanged()
  return user
}

/** 사용자 정보 조회 전에도 인증 요청을 보낼 수 있도록 토큰을 먼저 저장합니다. */
export function saveSessionTokens(tokens: SessionTokens) {
  sessionStorage.setItem(SESSION_KEYS.accessToken, tokens.accessToken)
  sessionStorage.setItem(SESSION_KEYS.refreshToken, tokens.refreshToken)
}

export function getAccessToken() {
  return getStoredValue('accessToken')
}

export function getRefreshToken() {
  return getStoredValue('refreshToken')
}

export function clearSession() {
  Object.values(SESSION_KEYS).forEach((key) => sessionStorage.removeItem(key))
  ONBOARDING_KEYS.forEach((key) => sessionStorage.removeItem(key))
  notifySessionUserChanged()
}

function readStringArray(key: string) {
  const storedValue = sessionStorage.getItem(key)
  if (!storedValue) return undefined

  try {
    const parsedValue = JSON.parse(storedValue) as unknown
    return Array.isArray(parsedValue)
      ? parsedValue.filter((value): value is string => typeof value === 'string')
      : undefined
  } catch {
    return undefined
  }
}

/** 온보딩 도중 입력한 값은 실제 API 전송 전까지 현재 브라우저 세션에 보관합니다. */
function readPendingOnboardingSettings(): OnboardingSettings {
  const baseCurrency = sessionStorage.getItem('uniconvert.baseCurrency') ?? undefined
  const localCurrencies = readStringArray('uniconvert.localCurrencies')
  const storedBudget = sessionStorage.getItem('uniconvert.monthlyBudget')
  const monthlyBudget = storedBudget ? Number(storedBudget) : undefined
  const timeZone = sessionStorage.getItem('uniconvert.timeZone') ?? undefined
  const profileGoals = readStringArray('uniconvert.profileGoals')

  return {
    baseCurrency,
    localCurrencies,
    monthlyBudget: Number.isFinite(monthlyBudget) ? monthlyBudget : undefined,
    timeZone,
    profileGoals,
  }
}

export function getOnboardingSettings(): OnboardingSettings {
  return readPendingOnboardingSettings()
}

export function updateOnboardingSettings(updates: Partial<OnboardingSettings>) {
  const onboarding = { ...readPendingOnboardingSettings(), ...updates }
  if (onboarding.baseCurrency) sessionStorage.setItem('uniconvert.baseCurrency', onboarding.baseCurrency)
  if (onboarding.localCurrencies) sessionStorage.setItem('uniconvert.localCurrencies', JSON.stringify(onboarding.localCurrencies))
  if (onboarding.monthlyBudget !== undefined) sessionStorage.setItem('uniconvert.monthlyBudget', String(onboarding.monthlyBudget))
  if (onboarding.timeZone) sessionStorage.setItem('uniconvert.timeZone', onboarding.timeZone)
  if (onboarding.profileGoals) sessionStorage.setItem('uniconvert.profileGoals', JSON.stringify(onboarding.profileGoals))
  return onboarding
}

export function getSessionUser(): AuthUser | null {
  const storedUser = getStoredValue('user')
  if (!storedUser) return null

  try {
    return JSON.parse(storedUser) as AuthUser
  } catch {
    sessionStorage.removeItem(SESSION_KEYS.user)
    return null
  }
}

export function updateSessionUser(updates: Partial<AuthUser>): AuthUser | null {
  const currentUser = getSessionUser()
  if (!currentUser) return null

  const updatedUser = { ...currentUser, ...updates }
  sessionStorage.setItem(SESSION_KEYS.user, JSON.stringify(updatedUser))

  notifySessionUserChanged()
  return updatedUser
}
