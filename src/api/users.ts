import { getSessionUser } from '@/auth/session'
import type { AuthUser, UserMeResponseDto } from '@/types/auth'
import { apiRequest } from './client'

interface GetMyUserOptions {
  useMock?: boolean
}

export interface UpdateMyProfileInput {
  nickname: string
  imageUrl: string
}

function toAuthUser(response: UserMeResponseDto): AuthUser {
  return {
    userId: response.userId,
    email: response.email,
    nickname: response.nickname,
    profileImage: response.imageUrl ?? '',
    // 현재 백엔드에는 이메일 인증 상태 필드와 인증 API가 구현되어 있지 않습니다.
    isEmailVerified: true,
    isOnboardingCompleted: response.onboardingCompleted,
  }
}

export async function getMyUser(options: GetMyUserOptions = {}) {
  const sessionUser = getSessionUser()
  const mockResponse: UserMeResponseDto = {
    userId: sessionUser?.userId ?? 0,
    email: sessionUser?.email ?? '',
    nickname: sessionUser?.nickname ?? '',
    imageUrl: sessionUser?.profileImage ?? '',
    onboardingCompleted: sessionUser?.isOnboardingCompleted ?? false,
  }

  const response = await apiRequest<UserMeResponseDto>(
    '/users/me',
    { data: mockResponse },
    { useMock: options.useMock },
  )
  return toAuthUser(response)
}

export async function updateMyProfile(input: UpdateMyProfileInput) {
  const sessionUser = getSessionUser()
  const mockResponse: UserMeResponseDto = {
    userId: sessionUser?.userId ?? 0,
    email: sessionUser?.email ?? '',
    nickname: input.nickname,
    imageUrl: input.imageUrl,
    onboardingCompleted: sessionUser?.isOnboardingCompleted ?? false,
  }

  const response = await apiRequest<UserMeResponseDto>(
    '/users/me',
    { data: mockResponse },
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
)
  return toAuthUser(response)
}
