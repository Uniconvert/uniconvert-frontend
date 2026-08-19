import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'

vi.mock('@/i18n/I18nContext', () => ({
  useI18n: () => ({
    locale: 'en-US',
    t: (key: string) => key,
  }),
}))

vi.mock('@/components/common/ModalShell/ModalShell', () => ({
  default: ({ title, children }: { title: string; children: ReactNode }) => (
    <div data-modal-title={title}>{children}</div>
  ),
}))

import BudgetEditModal from './BudgetEditModal'
import LogoutDialog from './LogoutDialog'
import NavigationIcon from './NavigationIcon'

describe('DashboardLayout 분리 컴포넌트', () => {
  it('예산 모달은 현재 예산과 저장 controls를 표시한다', () => {
    const markup = renderToStaticMarkup(
      <BudgetEditModal
        initialBudget={100_000}
        maximumBudget={300_000}
        currencySymbol="₩"
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    )

    expect(markup).toContain('dashboard.budgetEdit')
    expect(markup).toContain('100,000')
    expect(markup).toContain('common.save')
  })

  it('로그아웃 다이얼로그는 진행 중 상태에 맞는 action을 표시한다', () => {
    const idleMarkup = renderToStaticMarkup(<LogoutDialog isLoggingOut={false} onClose={vi.fn()} onConfirm={vi.fn()} />)
    const loadingMarkup = renderToStaticMarkup(<LogoutDialog isLoggingOut onClose={vi.fn()} onConfirm={vi.fn()} />)

    expect(idleMarkup).toContain('dashboard.logoutDescription')
    expect(idleMarkup).toContain('nav.logout')
    expect(loadingMarkup).toContain('dashboard.loggingOut')
  })

  it('내비게이션 아이콘은 이름별 SVG를 렌더링한다', () => {
    expect(renderToStaticMarkup(<NavigationIcon name="home" />)).toContain('<svg')
    expect(renderToStaticMarkup(<NavigationIcon name="settings" />)).toContain('<svg')
  })
})
