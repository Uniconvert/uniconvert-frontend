import type { AuthUser, LoginResult } from '@/types/auth'

export interface OnboardingSettings {
  baseCurrency?: string
  localCurrencies?: string[]
  monthlyBudget?: number
  timeZone?: string
  profileGoals?: string[]
  termsAgreements?: {
    terms: boolean
    privacy: boolean
    marketing: boolean
  }
}

interface StoredMockUserState {
  user?: Partial<Pick<AuthUser, 'nickname' | 'profileImage' | 'isEmailVerified' | 'isOnboardingCompleted'>>
  onboarding?: OnboardingSettings
}

const SESSION_KEYS = {
  user: 'uniconvert.user',
  accessToken: 'uniconvert.accessToken',
  refreshToken: 'uniconvert.refreshToken',
} as const

const LEGACY_SESSION_KEYS = {
  user: 'uniconvert.mockUser',
  accessToken: 'uniconvert.mockAccessToken',
  refreshToken: 'uniconvert.mockRefreshToken',
} as const

const ONBOARDING_KEYS = [
  'uniconvert.baseCurrency',
  'uniconvert.localCurrencies',
  'uniconvert.monthlyBudget',
  'uniconvert.timeZone',
  'uniconvert.profileGoals',
  'uniconvert.termsAgreements',
] as const

const MOCK_USER_STATE_KEY = 'uniconvert.mockUserState.v1'

function readMockUserStates(): Record<string, StoredMockUserState> {
  try {
    return JSON.parse(localStorage.getItem(MOCK_USER_STATE_KEY) ?? '{}') as Record<string, StoredMockUserState>
  } catch {
    localStorage.removeItem(MOCK_USER_STATE_KEY)
    return {}
  }
}

function getStoredMockUserState(userId: number) {
  return readMockUserStates()[String(userId)]
}

function saveStoredMockUserState(userId: number, state: StoredMockUserState) {
  const states = readMockUserStates()
  states[String(userId)] = state
  localStorage.setItem(MOCK_USER_STATE_KEY, JSON.stringify(states))
}

function hydrateMockUser(user: AuthUser): AuthUser {
  if (!user.mockDataMode) return user
  return { ...user, ...(getStoredMockUserState(user.userId)?.user ?? {}) }
}

function getStoredValue(key: keyof typeof SESSION_KEYS) {
  const value = sessionStorage.getItem(SESSION_KEYS[key])
  if (value) return value

  // 기존 Mock 로그인 상태를 유지하면서 새 세션 키로 한 번만 이전합니다.
  const legacyValue = sessionStorage.getItem(LEGACY_SESSION_KEYS[key])
  if (!legacyValue) return null

  sessionStorage.setItem(SESSION_KEYS[key], legacyValue)
  sessionStorage.removeItem(LEGACY_SESSION_KEYS[key])
  return legacyValue
}

export function saveSession(result: LoginResult) {
  const user = hydrateMockUser(result.user)
  const onboarding = getStoredMockUserState(user.userId)?.onboarding

  ONBOARDING_KEYS.forEach((key) => sessionStorage.removeItem(key))
  if (onboarding?.baseCurrency) sessionStorage.setItem('uniconvert.baseCurrency', onboarding.baseCurrency)
  if (onboarding?.localCurrencies) sessionStorage.setItem('uniconvert.localCurrencies', JSON.stringify(onboarding.localCurrencies))
  if (onboarding?.monthlyBudget) sessionStorage.setItem('uniconvert.monthlyBudget', String(onboarding.monthlyBudget))
  if (onboarding?.timeZone) sessionStorage.setItem('uniconvert.timeZone', onboarding.timeZone)
  if (onboarding?.profileGoals) sessionStorage.setItem('uniconvert.profileGoals', JSON.stringify(onboarding.profileGoals))
  if (onboarding?.termsAgreements) sessionStorage.setItem('uniconvert.termsAgreements', JSON.stringify(onboarding.termsAgreements))

  sessionStorage.setItem(SESSION_KEYS.user, JSON.stringify(user))
  sessionStorage.setItem(SESSION_KEYS.accessToken, result.accessToken)
  sessionStorage.setItem(SESSION_KEYS.refreshToken, result.refreshToken)
  return user
}

/** 회원가입 API가 연결되기 전 약관부터 시작하는 Mock 사용자를 만듭니다. */
export function ensureMockOnboardingSession() {
  const currentUser = getSessionUser()
  if (currentUser) return currentUser

  const userId = Date.now()
  const result: LoginResult = {
    accessToken: `mock-access-token-${userId}`,
    refreshToken: `mock-refresh-token-${userId}`,
    user: {
      userId,
      email: '',
      nickname: '임시 회원',
      profileImage: '',
      isEmailVerified: true,
      isOnboardingCompleted: false,
      mockDataMode: 'onboarding-empty',
    },
  }

  saveSession(result)
  return result.user
}

export function createMockSignupSession(email: string) {
  const userId = Date.now()
  const result: LoginResult = {
    accessToken: `mock-signup-access-token-${userId}`,
    refreshToken: `mock-signup-refresh-token-${userId}`,
    user: {
      userId,
      email,
      nickname: '',
      profileImage: '',
      isEmailVerified: true,
      isOnboardingCompleted: false,
      mockDataMode: 'onboarding-empty',
    },
  }

  saveSession(result)
  return result.user
}

export function getAccessToken() {
  return getStoredValue('accessToken')
}

export function getRefreshToken() {
  return getStoredValue('refreshToken')
}

export function clearSession() {
  Object.values(SESSION_KEYS).forEach((key) => sessionStorage.removeItem(key))
  Object.values(LEGACY_SESSION_KEYS).forEach((key) => sessionStorage.removeItem(key))
  ONBOARDING_KEYS.forEach((key) => sessionStorage.removeItem(key))
}

export function getOnboardingSettings(): OnboardingSettings {
  const user = getSessionUser()
  if (!user?.mockDataMode) return {}
  return getStoredMockUserState(user.userId)?.onboarding ?? {}
}

export function updateOnboardingSettings(updates: Partial<OnboardingSettings>) {
  const user = getSessionUser()
  if (!user?.mockDataMode) return null

  const current = getStoredMockUserState(user.userId) ?? {}
  const onboarding = { ...current.onboarding, ...updates }
  saveStoredMockUserState(user.userId, { ...current, onboarding })
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

  if (updatedUser.mockDataMode) {
    const current = getStoredMockUserState(updatedUser.userId) ?? {}
    saveStoredMockUserState(updatedUser.userId, {
      ...current,
      user: {
        ...current.user,
        nickname: updatedUser.nickname,
        profileImage: updatedUser.profileImage,
        isEmailVerified: updatedUser.isEmailVerified,
        isOnboardingCompleted: updatedUser.isOnboardingCompleted,
      },
    })
  }

  return updatedUser
}
