import { getSessionUser } from '@/auth/session'
import { getProfileImageSrc } from '@/constants/profileOptions'
import type { AuthUser, UserMeResponseDto } from '@/types/auth'
import { apiRequest } from './client'

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

export async function getMyUser() {
  const sessionUser = getSessionUser()
  const response = await apiRequest<UserMeResponseDto>('/users/me')
  return toAuthUser(response, sessionUser?.profileImage ?? '')
}

export async function updateMyProfile(input: UpdateMyProfileInput) {
  const sessionUser = getSessionUser()
  const response = await apiRequest<UserMeResponseDto>(
    '/users/me',
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  )
  return toAuthUser(response, sessionUser?.profileImage ?? '')
}
