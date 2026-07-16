import authUsersMock from '@/mocks/auth-users.json'
import type { ApiResponse } from '@/types/api'
import type { LoginCredentials, LoginResult, MockAuthUser } from '@/types/auth'
import { apiRequest, isUsingMockApi } from './client'

function toLoginResult(user: MockAuthUser): LoginResult {
  return {
    accessToken: `mock-access-token-${user.userId}`,
    refreshToken: `mock-refresh-token-${user.userId}`,
    user: {
      userId: user.userId,
      email: user.email,
      nickname: user.nickname,
      profileImage: user.profileImage,
      isEmailVerified: user.isEmailVerified,
      isOnboardingCompleted: user.isOnboardingCompleted,
    },
  }
}

export function login(credentials: LoginCredentials) {
  if (isUsingMockApi) {
    const normalizedEmail = credentials.email.trim().toLowerCase()
    const user = (authUsersMock.users as MockAuthUser[]).find(
      (candidate) => candidate.email.toLowerCase() === normalizedEmail,
    )

    if (!user || user.password !== credentials.password) {
      return Promise.reject(new Error('이메일 또는 비밀번호를 확인해주세요.'))
    }

    return Promise.resolve(toLoginResult(user))
  }

  const emptyMockResponse: ApiResponse<LoginResult> = {
    success: true,
    data: {
      accessToken: '',
      refreshToken: '',
      user: {
        userId: 0,
        email: '',
        nickname: '',
        profileImage: '',
        isEmailVerified: false,
        isOnboardingCompleted: false,
      },
    },
  }

  return apiRequest('/auth/local/login', emptyMockResponse, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  })
}
