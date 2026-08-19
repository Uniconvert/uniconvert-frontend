import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

const { navigateMock } = vi.hoisted(() => ({ navigateMock: vi.fn() }))

vi.mock('react-router', () => ({
  useNavigate: () => navigateMock,
  useRouteError: () => new Error('route load failed'),
}))

import RouteErrorFallback from './RouteErrorFallback'
import { navigateToRouteRecovery } from './routeRecovery'
import { ROUTE_PATHS } from './routePaths'

describe('route error recovery', () => {
  it('renders a user recovery state instead of a browser error screen', () => {
    const markup = renderToStaticMarkup(<RouteErrorFallback />)

    expect(markup).toContain('페이지를 불러오지 못했습니다.')
    expect(markup).toContain('홈으로 이동')
    expect(markup).toContain('로그인으로 이동')
  })

  it('navigates to the protected home route for recovery', () => {
    navigateToRouteRecovery(navigateMock)

    expect(navigateMock).toHaveBeenCalledWith(ROUTE_PATHS.home, { replace: true })
  })
})
