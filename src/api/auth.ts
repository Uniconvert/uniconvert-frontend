import {
  clearSession,
  getRefreshToken,
  saveSessionUser,
  saveSessionTokens,
} from '@/auth/session'
import type {
  AuthUser,
  LoginCredentials,
  LoginResponseDto,
  LoginResult,
  SignUpCredentials,
} from '@/types/auth'
import { apiRequest } from './client'
import { getMyUser } from './users'

function establishSession(result: LoginResult) {
  saveSessionTokens(result)
  return saveSessionUser(result.user)
}

/** 온보딩 프로필 저장 전까지만 사용하는, 백엔드 20자 제한 이내의 충돌 방지용 닉네임입니다. */
function createTemporaryNickname() {
  const uniquePart = globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID().replaceAll('-', '')
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`
  return `pending-${uniquePart.slice(0, 12)}`
}

export async function login(credentials: LoginCredentials): Promise<AuthUser> {
  const response = await apiRequest<LoginResponseDto>(
    '/auth/login',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: credentials.email.trim(),
        password: credentials.password,
      }),
      skipAuth: true,
    },
  )

  return createAuthenticatedUser(response)
}

export async function googleLogin(idToken: string): Promise<AuthUser> {
  const normalizedIdToken = idToken.trim()
  if (!normalizedIdToken) {
    throw new Error('Google 인증 정보가 비어 있습니다.')
  }

  const googleAuthPath =
    String(import.meta.env.VITE_GOOGLE_AUTH_PATH ?? '/auth/social/google').trim() ||
    '/auth/social/google'
  const response = await apiRequest<LoginResponseDto>(
    googleAuthPath,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: normalizedIdToken }),
      skipAuth: true,
    },
  )

  return createAuthenticatedUser(response)
}

/** 로그인 토큰을 저장한 뒤 서버의 최신 사용자·온보딩 상태까지 세션에 반영합니다. */
async function createAuthenticatedUser(response: LoginResponseDto): Promise<AuthUser> {
  saveSessionTokens(response)

  try {
    const user = await getMyUser()
    return saveSessionUser(user)
  } catch (error) {
    clearSession()
    throw error
  }
}

export async function signUp(credentials: SignUpCredentials): Promise<AuthUser> {
  const normalizedEmail = credentials.email.trim().toLowerCase()
  const temporaryNickname = createTemporaryNickname()

  const response = await apiRequest<LoginResponseDto>(
    '/auth/signup',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: normalizedEmail,
        password: credentials.password,
        nickname: temporaryNickname,
      }),
      skipAuth: true,
    },
  )

  // 계정 생성 성공과 후속 사용자 조회 실패를 분리합니다. 신규 회원은 온보딩 미완료로 시작하므로
  // /users/me를 다시 호출하지 않고 회원가입 응답만으로 초기 세션을 만들 수 있습니다.
  return establishSession({
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    user: {
      userId: response.userId,
      email: response.email,
      nickname: response.nickname,
      profileImage: '',
      isEmailVerified: true,
      isOnboardingCompleted: response.onboardingCompleted ?? false,
    },
  })
}

export async function logout() {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return

  await apiRequest<void>(
    '/auth/logout',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      skipAuth: true,
      retryOnUnauthorized: false,
    },
  )
}
