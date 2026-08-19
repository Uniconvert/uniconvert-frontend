import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import CurrencyDropdown from './CurrencyDropdown'

vi.mock('@/i18n/I18nContext', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

describe('CurrencyDropdown', () => {
  it('renders the selected currency with the listbox trigger contract', () => {
    const markup = renderToStaticMarkup(
      <CurrencyDropdown value="USD" onChange={vi.fn()} />,
    )

    expect(markup).toContain('>USD</strong>')
    expect(markup).toContain('aria-haspopup="listbox"')
    expect(markup).toContain('aria-expanded="false"')
    expect(markup).toContain('aria-controls=')
  })
})
