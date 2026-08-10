export const PROFILE_IMAGE_OPTIONS = [
  { key: 'profile_827', src: '/assets/profiles/profile-827.png' },
  { key: 'profile_941', src: '/assets/profiles/profile-941.png' },
  { key: 'profile_942', src: '/assets/profiles/profile-942.png' },
  { key: 'profile_943', src: '/assets/profiles/profile-943.png' },
  { key: 'profile_944', src: '/assets/profiles/profile-944.png' },
  { key: 'profile_945', src: '/assets/profiles/profile-945.png' },
] as const

export const PROFILE_GOAL_OPTIONS = [
  { id: 'travel', iconSrc: '/assets/images/goals/goal-travel.png', label: '여행, 취미' },
  { id: 'saving', iconSrc: '/assets/images/goals/goal-saving.png', label: '저축' },
  { id: 'education', iconSrc: '/assets/images/goals/goal-education.png', label: '학업비' },
] as const

export type ProfileImageKey = (typeof PROFILE_IMAGE_OPTIONS)[number]['key']
export type PrimaryGoal = (typeof PROFILE_GOAL_OPTIONS)[number]['id']

export function findProfileImageOption(key?: string | null) {
  return PROFILE_IMAGE_OPTIONS.find((option) => option.key === key)
}

export function getProfileImageSrc(key?: string | null) {
  return findProfileImageOption(key)?.src ?? ''
}

export function getProfileImageKeyBySrc(src?: string | null) {
  return PROFILE_IMAGE_OPTIONS.find((option) => option.src === src)?.key
}

export function getRandomProfileImageOption(currentKey?: string | null) {
  const candidates = PROFILE_IMAGE_OPTIONS.filter((option) => option.key !== currentKey)
  return candidates[Math.floor(Math.random() * candidates.length)] ?? PROFILE_IMAGE_OPTIONS[0]
}

