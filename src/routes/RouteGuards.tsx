import { Navigate, Outlet, useLocation } from 'react-router'
import { getSessionUser } from '@/auth/session'
import { ROUTE_PATHS } from './routePaths'

function redirectForProtectedRoute() {
  const user = getSessionUser()
  if (!user) return ROUTE_PATHS.login
  if (!user.isEmailVerified) return ROUTE_PATHS.verifyEmail
  if (!user.isOnboardingCompleted) return ROUTE_PATHS.onboardingBaseCurrency
  return null
}

export function DashboardRouteGuard() {
  const location = useLocation()
  const redirectPath = redirectForProtectedRoute()
  return redirectPath
    ? <Navigate to={redirectPath} replace state={{ from: location.pathname }} />
    : <Outlet />
}

export function OnboardingRouteGuard() {
  const user = getSessionUser()
  if (!user) return <Navigate to={ROUTE_PATHS.login} replace />
  if (!user.isEmailVerified) return <Navigate to={ROUTE_PATHS.verifyEmail} replace />
  if (user.isOnboardingCompleted) return <Navigate to={ROUTE_PATHS.home} replace />
  return <Outlet />
}

export function EmailVerificationRouteGuard() {
  const user = getSessionUser()
  if (!user) return <Navigate to={ROUTE_PATHS.login} replace />
  if (user.isEmailVerified) {
    return <Navigate to={user.isOnboardingCompleted ? ROUTE_PATHS.home : ROUTE_PATHS.onboardingBaseCurrency} replace />
  }
  return <Outlet />
}

export function GuestRouteGuard() {
  const user = getSessionUser()
  if (!user) return <Outlet />
  if (!user.isEmailVerified) return <Navigate to={ROUTE_PATHS.verifyEmail} replace />
  return <Navigate to={user.isOnboardingCompleted ? ROUTE_PATHS.home : ROUTE_PATHS.onboardingBaseCurrency} replace />
}
