import { getSessionUser } from '@/auth/session'
import { getProfileImageSrc } from '@/constants/profileOptions'
import type { AuthUser, UserMeResponseDto } from '@/types/auth'
import { apiRequest } from './client'

export interface UpdateMyProfileInput {
  nickname?: string
  profileImageKey?: string
  primaryGoal?: string
}

export interface EmailReportSettingDto {
  enabled?: boolean
  frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  sendTime?: string
}

let cachedUser: AuthUser | null = null
let userRequest: Promise<AuthUser> | null = null

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
  if (cachedUser) return cachedUser
  if (userRequest) return userRequest
  const sessionUser = getSessionUser()
  userRequest = apiRequest<UserMeResponseDto>('/users/me')
    .then((response) => {
      cachedUser = toAuthUser(response, sessionUser?.profileImage ?? '')
      return cachedUser
    })
    .finally(() => { userRequest = null })
  return userRequest
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
  cachedUser = toAuthUser(response, sessionUser?.profileImage ?? '')
  return cachedUser
}

export function getEmailReportSetting() {
  return apiRequest<EmailReportSettingDto>('/users/me/email-report-setting')
}

export function updateEmailReportSetting(data: EmailReportSettingDto) {
  return apiRequest<EmailReportSettingDto>('/users/me/email-report-setting', {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}