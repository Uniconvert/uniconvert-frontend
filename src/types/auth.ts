export type MockDataMode = 'onboarding-empty' | 'demo-seeded'

export interface LoginCredentials {
  email: string
  password: string
}

/** 백엔드 POST /auth/login 및 /auth/reissue 응답의 data 형식입니다. */
export interface LoginResponseDto {
  userId: number
  email: string
  nickname: string
  accessToken: string
  refreshToken: string
}

/** 백엔드 GET /users/me 응답의 data 형식입니다. */
export interface UserMeResponseDto {
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
}

export interface MockAuthUser {
  userId: number
  email: string
  password: string
  nickname: string
  profileImage: string
  isEmailVerified: boolean
  isOnboardingCompleted: boolean
  mockDataMode: MockDataMode
}

export interface AuthUser {
  userId: number
  email: string
  nickname: string
  profileImage: string
  isEmailVerified: boolean
  isOnboardingCompleted: boolean
  /** 실제 API 응답에는 없고, 프론트 Mock 시나리오 구분에만 사용합니다. */
  mockDataMode?: MockDataMode
}

export interface LoginResult {
  accessToken: string
  refreshToken: string
  user: AuthUser
}
