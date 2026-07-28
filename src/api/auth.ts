import authUsersMock from '@/mocks/auth-users.json'
import {
  clearSession,
  getRefreshToken,
  saveSessionTokens,
} from '@/auth/session'
import type {
  LoginCredentials,
  LoginResponseDto,
  LoginResult,
  MockAuthUser,
} from '@/types/auth'
import { apiRequest, isUsingMockApi } from './client'
import { getMyUser } from './users'

export const isUsingMockAuthApi =
  isUsingMockApi && import.meta.env.VITE_USE_REAL_AUTH_API !== 'true'

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
      mockDataMode: user.mockDataMode,
    },
  }
}

export async function login(credentials: LoginCredentials): Promise<LoginResult> {
  if (isUsingMockAuthApi) {
    const normalizedEmail = credentials.email.trim().toLowerCase()
    const user = (authUsersMock.users as MockAuthUser[]).find(
      (candidate) => candidate.email.toLowerCase() === normalizedEmail,
    )

    if (!user || user.password !== credentials.password) {
      throw new Error('이메일 또는 비밀번호를 확인해주세요.')
    }

    return toLoginResult(user)
  }

  const response = await apiRequest<LoginResponseDto>(
    '/auth/login',
    {
      data: {
        userId: 0,
        email: '',
        nickname: '',
        accessToken: '',
        refreshToken: '',
      },
    },
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: credentials.email.trim(),
        password: credentials.password,
      }),
      useMock: false,
      skipAuth: true,
    },
  )

  saveSessionTokens(response)

  try {
    const user = await getMyUser({ useMock: false })
    return {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      user,
    }
  } catch (error) {
    clearSession()
    throw error
  }
}

export async function logout() {
  if (isUsingMockAuthApi) return

  const refreshToken = getRefreshToken()
  if (!refreshToken) return

  await apiRequest<void>(
    '/auth/logout',
    { data: undefined },
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      useMock: false,
      skipAuth: true,
      retryOnUnauthorized: false,
    },
  )
}
