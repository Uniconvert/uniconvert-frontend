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
  user?: Partial<Pick<AuthUser, 'nickname' | 'profileImage' | 'profileImageKey' | 'primaryGoal' | 'isEmailVerified' | 'isOnboardingCompleted'>>
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
const FRESH_ONBOARDING_MOCK_EMAIL = 'onboarding@uniconvert.com'
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

function clearStoredMockUserState(userId: number) {
  const states = readMockUserStates()
  delete states[String(userId)]

  if (Object.keys(states).length === 0) {
    localStorage.removeItem(MOCK_USER_STATE_KEY)
    return
  }

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

export function saveSessionUser(userToSave: AuthUser) {
  if (
    userToSave.mockDataMode === 'onboarding-empty'
    && userToSave.email === FRESH_ONBOARDING_MOCK_EMAIL
  ) {
    clearStoredMockUserState(userToSave.userId)
  }

  const user = hydrateMockUser(userToSave)
  const onboarding = user.mockDataMode
    ? getStoredMockUserState(user.userId)?.onboarding
    : undefined

  ONBOARDING_KEYS.forEach((key) => sessionStorage.removeItem(key))
  if (onboarding?.baseCurrency) sessionStorage.setItem('uniconvert.baseCurrency', onboarding.baseCurrency)
  if (onboarding?.localCurrencies) sessionStorage.setItem('uniconvert.localCurrencies', JSON.stringify(onboarding.localCurrencies))
  if (onboarding?.monthlyBudget) sessionStorage.setItem('uniconvert.monthlyBudget', String(onboarding.monthlyBudget))
  if (onboarding?.timeZone) sessionStorage.setItem('uniconvert.timeZone', onboarding.timeZone)
  if (onboarding?.profileGoals) sessionStorage.setItem('uniconvert.profileGoals', JSON.stringify(onboarding.profileGoals))
  if (onboarding?.termsAgreements) sessionStorage.setItem('uniconvert.termsAgreements', JSON.stringify(onboarding.termsAgreements))

  sessionStorage.setItem(SESSION_KEYS.user, JSON.stringify(user))
  notifySessionUserChanged()
  return user
}

/** 사용자 정보 조회 전에도 인증 요청을 보낼 수 있도록 토큰을 먼저 저장합니다. */
export function saveSessionTokens(tokens: SessionTokens) {
  sessionStorage.setItem(SESSION_KEYS.accessToken, tokens.accessToken)
  sessionStorage.setItem(SESSION_KEYS.refreshToken, tokens.refreshToken)
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

  saveSessionTokens(result)
  return saveSessionUser(result.user)
}

/** Mock과 실제 회원가입이 동일한 세션 저장 흐름을 사용하도록 결과만 생성합니다. */
export function createMockSignupResult(email: string, temporaryNickname: string): LoginResult {
  const userId = Date.now()
  return {
    accessToken: `mock-signup-access-token-${userId}`,
    refreshToken: `mock-signup-refresh-token-${userId}`,
    user: {
      userId,
      email,
      nickname: temporaryNickname,
      profileImage: '',
      isEmailVerified: true,
      isOnboardingCompleted: false,
      mockDataMode: 'onboarding-empty',
    },
  }
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
  const user = getSessionUser()
  const pendingSettings = readPendingOnboardingSettings()
  if (!user?.mockDataMode) return pendingSettings

  return {
    ...pendingSettings,
    ...(getStoredMockUserState(user.userId)?.onboarding ?? {}),
  }
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
        profileImageKey: updatedUser.profileImageKey,
        primaryGoal: updatedUser.primaryGoal,
        isEmailVerified: updatedUser.isEmailVerified,
        isOnboardingCompleted: updatedUser.isOnboardingCompleted,
      },
    })
  }

  notifySessionUserChanged()
  return updatedUser
}
