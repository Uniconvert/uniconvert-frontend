export type MockDataMode = 'onboarding-empty' | 'demo-seeded'

export interface LoginCredentials {
  email: string
  password: string
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
