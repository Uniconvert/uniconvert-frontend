import { getSessionUser } from '@/auth/session'
import { getProfileImageKeyBySrc, getProfileImageSrc } from '@/constants/profileOptions'
import type { AuthUser, UserMeResponseDto } from '@/types/auth'
import { apiRequest } from './client'

interface UserApiOptions {
  useMock?: boolean
}

export interface UpdateMyProfileInput {
  nickname?: string
  profileImageKey?: string
  primaryGoal?: string
}

function toAuthUser(response: UserMeResponseDto, fallbackProfileImage = ''): AuthUser {
  const profileImageKey = response.profileImageKey ?? undefined
  return {
    userId: response.userId,
    email: response.email,
    nickname: response.nickname,
    profileImage: getProfileImageSrc(profileImageKey) || fallbackProfileImage,
    profileImageKey,
    primaryGoal: response.primaryGoal ?? undefined,
    // 현재 백엔드에는 이메일 인증 상태 필드와 인증 API가 구현되어 있지 않습니다.
    isEmailVerified: true,
    isOnboardingCompleted: response.onboardingCompleted,
    homeCurrencyCode: response.homeCurrencyCode ?? undefined,
    localCurrencyCode: response.localCurrencyCode ?? undefined,
    timezone: response.timezone ?? undefined,
  }
}

export async function getMyUser(options: UserApiOptions = {}) {
  const sessionUser = getSessionUser()
  const mockResponse: UserMeResponseDto = {
    userId: sessionUser?.userId ?? 0,
    email: sessionUser?.email ?? '',
    nickname: sessionUser?.nickname ?? '',
    profileImageKey: sessionUser?.profileImageKey
      ?? getProfileImageKeyBySrc(sessionUser?.profileImage),
    primaryGoal: sessionUser?.primaryGoal,
    onboardingCompleted: sessionUser?.isOnboardingCompleted ?? false,
  }

  const response = await apiRequest<UserMeResponseDto>(
    '/users/me',
    { data: mockResponse },
    { useMock: options.useMock },
  )
  return toAuthUser(response, sessionUser?.profileImage ?? '')
}

export async function updateMyProfile(
  input: UpdateMyProfileInput,
  options: UserApiOptions = {},
) {
  const sessionUser = getSessionUser()
  const mockResponse: UserMeResponseDto = {
    userId: sessionUser?.userId ?? 0,
    email: sessionUser?.email ?? '',
    nickname: input.nickname ?? sessionUser?.nickname ?? '',
    profileImageKey: input.profileImageKey
      ?? sessionUser?.profileImageKey
      ?? getProfileImageKeyBySrc(sessionUser?.profileImage),
    primaryGoal: input.primaryGoal ?? sessionUser?.primaryGoal,
    onboardingCompleted: sessionUser?.isOnboardingCompleted ?? false,
  }

  const response = await apiRequest<UserMeResponseDto>(
    '/users/me',
    { data: mockResponse },
    {
      method: 'PATCH',
      body: JSON.stringify(input),
      useMock: options.useMock,
    },
)
  return toAuthUser(response, sessionUser?.profileImage ?? '')
}
