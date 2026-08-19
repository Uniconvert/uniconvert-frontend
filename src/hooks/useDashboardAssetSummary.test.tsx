import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { useBudgetQueryMock, useMyUserQueryMock } = vi.hoisted(() => ({
  useBudgetQueryMock: vi.fn(),
  useMyUserQueryMock: vi.fn(),
}))

vi.mock('./useBudgetQuery', () => ({ useBudgetQuery: useBudgetQueryMock }))
vi.mock('./useMyUserQuery', () => ({ useMyUserQuery: useMyUserQueryMock }))

import { useDashboardAssetSummary } from './useDashboardAssetSummary'

function Probe({ enabled }: { enabled: boolean }) {
  useDashboardAssetSummary({
    yearMonth: '2026-08',
    enabled,
    onError: vi.fn(),
  })
  return null
}

describe('dashboard summary query enablement', () => {
  beforeEach(() => {
    useBudgetQueryMock.mockReturnValue({ data: null, isLoading: false, isFetching: false })
    useMyUserQueryMock.mockReturnValue({ data: null, isLoading: false, isFetching: false })
  })

  it('disables budget and user queries when the memo route disables the summary', () => {
    renderToStaticMarkup(<Probe enabled={false} />)

    expect(useBudgetQueryMock).toHaveBeenCalledWith('2026-08', false)
    expect(useMyUserQueryMock).toHaveBeenCalledWith(false)
  })

  it('keeps both summary queries enabled on dashboard routes', () => {
    renderToStaticMarkup(<Probe enabled />)

    expect(useBudgetQueryMock).toHaveBeenCalledWith('2026-08', true)
    expect(useMyUserQueryMock).toHaveBeenCalledWith(true)
  })
})
