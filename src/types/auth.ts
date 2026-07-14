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
}

export interface AuthUser {
  userId: number
  email: string
  nickname: string
  profileImage: string
  isEmailVerified: boolean
  isOnboardingCompleted: boolean
}

export interface LoginResult {
  accessToken: string
  refreshToken: string
  user: AuthUser
}
