import { describe, expect, it, vi } from 'vitest'

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router')
  return { ...actual, createBrowserRouter: (routes: unknown[]) => ({ routes }) }
})

import { router } from './AppRouter'
import { ROUTE_PATHS } from './routePaths'

describe('public calculator route policy', () => {
  it('keeps the regular calculator protected and exposes only the offline calculator publicly', () => {
    type TestRoute = { path?: string; children?: TestRoute[] }
    const routes = (router as unknown as { routes: TestRoute[] }).routes
    const containsPath = (route: TestRoute, path: string): boolean => route.path === path || Boolean(route.children?.some((child) => containsPath(child, path)))
    const offlineCalculatorParents = routes.filter((route) => route.children?.some((child) => containsPath(child, ROUTE_PATHS.offlineCalculator)) || route.path === ROUTE_PATHS.offlineCalculator)
    const dashboardParent = routes.find((route) => containsPath(route, ROUTE_PATHS.home))

    expect(offlineCalculatorParents).toHaveLength(1)
    expect(ROUTE_PATHS.offlineCalculator).toBe('/offline')
    expect(dashboardParent && containsPath(dashboardParent, ROUTE_PATHS.calculator)).toBe(true)
    expect(dashboardParent && containsPath(dashboardParent, ROUTE_PATHS.offlineCalculator)).toBe(false)
  })
})
