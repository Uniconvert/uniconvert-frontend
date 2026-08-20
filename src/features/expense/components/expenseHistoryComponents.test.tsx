import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import type { ExpenseHistoryData, SavedExpense } from '@/types/expense'

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

vi.mock('@/hooks/useListboxKeyboard', () => ({
  useListboxKeyboard: () => ({
    listboxId: 'month-listbox',
    activeDescendantId: undefined,
    onTriggerKeyDown: vi.fn(),
    onTriggerClick: vi.fn(),
    getOptionId: (index: number) => `month-option-${index}`,
    onOptionPointerMove: vi.fn(),
    onOptionClick: vi.fn(),
  }),
}))

import ExpenseHistorySummary from './ExpenseHistorySummary'
import SavedExpenseDialog from './SavedExpenseDialog'

const baseData: ExpenseHistoryData = {
  yearMonth: '2026-08',
  homeCurrency: 'KRW',
  monthlyBudgetHome: 1_000_000,
  monthlyExpenseHome: 0,
  remainingBudgetHome: 1_000_000,
  budgetUsagePercent: 0,
  categories: [],
  recentExpenses: [],
  mascotMessages: [],
}

const expense: SavedExpense = {
  expenseId: 'expense-1',
  merchantName: 'Cafe',
  convertedAmountHome: 8_500,
  iconKey: 'food',
  spentAt: '2026-08-18T12:30:00',
}

const summaryProps = {
  data: baseData,
  recentExpenses: [],
  recentRange: 'day',
  recentExpensesError: '',
  filteredSavedExpenses: [],
  getCategoryLabel: (_iconKey: string, fallback: string) => fallback,
  onRecentRangeChange: vi.fn(),
  onRetry: vi.fn(),
  onOpenSavedExpenses: vi.fn(),
}

describe('ExpenseHistoryPage 분리 컴포넌트', () => {
  it('요약은 데이터 없음 상태를 Empty 문구로 구분한다', () => {
    const markup = renderToStaticMarkup(<ExpenseHistorySummary {...summaryProps} />)

    expect(markup).toContain('expenseHistory.noMonthlyExpensesTitle')
    expect(markup).toContain('expenseHistory.noRecentExpenses')
    expect(markup).toContain('aria-haspopup="listbox"')
    expect(markup).not.toContain('<select')
  })

  it('요약은 최근 지출 오류를 Empty 대신 ErrorState로 표시한다', () => {
    const markup = renderToStaticMarkup(
      <ExpenseHistorySummary {...summaryProps} recentExpensesError="expenseHistory.loadError" />,
    )

    expect(markup).toContain('expenseHistory.loadError')
    expect(markup).toContain('common.retry')
    expect(markup).not.toContain('expenseHistory.noRecentExpenses')
  })

  it('요약은 데이터가 비어도 주요 카드 레이아웃을 유지한다', () => {
    const markup = renderToStaticMarkup(<ExpenseHistorySummary {...summaryProps} />)

    expect(markup).toContain('aria-labelledby="total-assets-title"')
    expect(markup).toContain('aria-labelledby="recent-expenses-title"')
    expect(markup).toContain('aria-labelledby="monthly-expenses-title"')
    expect(markup).toContain('aria-labelledby="saved-expenses-title"')
  })

  it('저장 지출 모달은 정상 데이터를 표시한다', () => {
    const markup = renderToStaticMarkup(
      <SavedExpenseDialog
        currentYear="2026"
        selectedMonth="8"
        monthOptions={[12, 11, 10, 9, 8]}
        expenses={[expense]}
        homeCurrency="KRW"
        isLoading={false}
        errorMessage=""
        onMonthChange={vi.fn()}
        onRetry={vi.fn()}
        onDelete={vi.fn()}
        onSaveName={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(markup).toContain('Cafe')
    expect(markup).toContain('2026.08')
  })

  it('저장 지출 모달은 오류와 빈 성공을 구분한다', () => {
    const errorMarkup = renderToStaticMarkup(
      <SavedExpenseDialog
        currentYear="2026"
        selectedMonth="8"
        monthOptions={[8]}
        expenses={[]}
        homeCurrency="KRW"
        isLoading={false}
        errorMessage="expenseHistory.modalError"
        onMonthChange={vi.fn()}
        onRetry={vi.fn()}
        onDelete={vi.fn()}
        onSaveName={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    const emptyMarkup = renderToStaticMarkup(
      <SavedExpenseDialog
        currentYear="2026"
        selectedMonth="8"
        monthOptions={[8]}
        expenses={[]}
        homeCurrency="KRW"
        isLoading={false}
        errorMessage=""
        onMonthChange={vi.fn()}
        onRetry={vi.fn()}
        onDelete={vi.fn()}
        onSaveName={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(errorMarkup).toContain('expenseHistory.modalError')
    expect(errorMarkup).toContain('common.retry')
    expect(emptyMarkup).toContain('expenseHistory.emptyModal')
    expect(emptyMarkup).not.toContain('expenseHistory.modalError')
  })
})
