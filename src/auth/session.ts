import type { AuthUser } from '@/types/auth'

const MOCK_USER_KEY = 'uniconvert.mockUser'

export function getSessionUser(): AuthUser | null {
  const storedUser = sessionStorage.getItem(MOCK_USER_KEY)
  if (!storedUser) return null

  try {
    return JSON.parse(storedUser) as AuthUser
  } catch {
    sessionStorage.removeItem(MOCK_USER_KEY)
    return null
  }
}

export function updateSessionUser(updates: Partial<AuthUser>): AuthUser | null {
  const currentUser = getSessionUser()
  if (!currentUser) return null

  const updatedUser = { ...currentUser, ...updates }
  sessionStorage.setItem(MOCK_USER_KEY, JSON.stringify(updatedUser))
  return updatedUser
}
