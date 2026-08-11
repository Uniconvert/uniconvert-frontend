export interface LoginCredentials {
  email: string
  password: string
}

export type SignUpCredentials = LoginCredentials

/** 백엔드 POST /auth/login 및 /auth/reissue 응답의 data 형식입니다. */
export interface LoginResponseDto {
  userId: number
  email: string
  nickname: string
  onboardingCompleted?: boolean
  accessToken: string
  refreshToken: string
}

/** 백엔드 GET /users/me 응답의 data 형식입니다. */
export interface UserMeResponseDto {
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
}

export interface AuthUser {
  userId: number
  email: string
  nickname: string
  profileImage: string
  profileImageKey?: string
  primaryGoal?: string
  isEmailVerified: boolean
  isOnboardingCompleted: boolean
  homeCurrencyCode?: string
  localCurrencyCode?: string
  timezone?: string
}

export interface LoginResult {
  accessToken: string
  refreshToken: string
  user: AuthUser
}
