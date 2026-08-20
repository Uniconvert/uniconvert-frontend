import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import AuthLayout from './AuthLayout'
import styles from './AuthLayout.module.css'

vi.mock('react-router', () => ({
  Outlet: () => <div data-testid="auth-outlet">auth content</div>,
}))

describe('AuthLayout', () => {
  it('keeps the viewport background outside the centered content scene', () => {
    const markup = renderToStaticMarkup(<AuthLayout />)

    expect(markup).toContain(`class="${styles.layout}"`)
    expect(markup).toContain(`class="${styles.scene}"`)
    expect(markup).toContain('data-testid="auth-outlet"')
  })
})
