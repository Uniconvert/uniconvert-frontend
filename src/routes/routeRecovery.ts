import { ROUTE_PATHS } from './routePaths'

export function navigateToRouteRecovery(
  navigate: (to: string, options?: { replace?: boolean }) => void,
) {
  navigate(ROUTE_PATHS.home, { replace: true })
}
