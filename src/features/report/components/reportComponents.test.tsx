import { renderToStaticMarkup } from 'react-dom/server'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import type { ExpenseListItem } from '@/types/expense'

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

vi.mock('@/components/common/Button/Button', () => ({
  default: ({ children, className, disabled }: { children: ReactNode; className?: string; disabled?: boolean }) => (
    <button className={className} type="button" disabled={disabled}>{children}</button>
  ),
}))

import EmailReportDialog from './EmailReportDialog'
import ReportTransactionList from './ReportTransactionList'
import ReportBarChart from './ReportBarChart'
import settingsStyles from '@/features/settings/settings.module.css'

const transaction: ExpenseListItem = {
  expenseId: '1',
  merchantName: 'Cafe',
  categoryName: 'Food',
  convertedAmountHome: 8_500,
  iconKey: 'food',
  spentAt: '2026-08-18T12:30:00',
}

describe('ReportPage 분리 컴포넌트', () => {
  it('거래 목록은 loading, empty, data 상태를 구분한다', () => {
    expect(renderToStaticMarkup(
      <ReportTransactionList transactions={[]} isLoading localSymbol="₩" userHomeCurrency="KRW" />,
    )).toContain('report.loadingTransactions')
    expect(renderToStaticMarkup(
      <ReportTransactionList transactions={[]} isLoading={false} localSymbol="₩" userHomeCurrency="KRW" />,
    )).toContain('report.noTodayExpenses')
    expect(renderToStaticMarkup(
      <ReportTransactionList transactions={[transaction]} isLoading={false} localSymbol="₩" userHomeCurrency="KRW" />,
    )).toContain('Cafe')
  })

  it('EmailReportDialog는 요약, 거래 목록, 전송 action을 렌더링한다', () => {
    const onSend = vi.fn()
    const markup = renderToStaticMarkup(
      <EmailReportDialog
        captureRef={createRef<HTMLElement>()}
        targetDate="2026-08-18"
        targetAmount={8_500}
        remainingBudgetHome={100_000}
        localSymbol="₩"
        homeSymbol="₩"
        userLocalCurrency="KRW"
        userHomeCurrency="KRW"
        transactions={[transaction]}
        isLoadingTransactions={false}
        timeData={[{ dateStr: '2026-08-18', label: '18', amount: 8_500 }]}
        isSending={false}
        onClose={vi.fn()}
        onSend={onSend}
      />,
    )

    expect(markup).toContain('report.todayReport')
    expect(markup).toContain('Cafe')
    expect(markup).toContain('report.send')
    expect(markup).toContain('report.mvpNotice')
    expect(markup).toContain(settingsStyles.reportPanel)
    expect(markup).toContain(settingsStyles.reportCard)
    expect(markup).toContain(settingsStyles.sendReportButton)
  })

  it('EmailReportDialog는 잔여 예산 조회 실패를 실제 0과 구분한다', () => {
    const markup = renderToStaticMarkup(
      <EmailReportDialog
        captureRef={createRef<HTMLElement>()}
        targetDate="2026-08-18"
        targetAmount={8_500}
        remainingBudgetHome={null}
        remainingBudgetError="expense history unavailable"
        localSymbol="₩"
        homeSymbol="₩"
        userLocalCurrency="KRW"
        userHomeCurrency="KRW"
        transactions={[]}
        isLoadingTransactions={false}
        timeData={[]}
        isSending={false}
        onClose={vi.fn()}
        onSend={vi.fn()}
      />,
    )

    expect(markup).toContain('—')
    expect(markup).toContain('expense history unavailable')
    expect(markup).not.toContain('USD 0.00')
  })

  it('ReportBarChart는 시각 차트와 별도로 실제 데이터의 accessible summary를 제공한다', () => {
    const markup = renderToStaticMarkup(
      <ReportBarChart
        titlePrefix="08.12 - 08.18"
        titleSuffix=" 지출"
        data={[{ label: '08.18', amount: 8_500 }]}
        chartClass="timeBarChart"
        type="date"
        selectorText="2026.08.18"
        selectedDate="2026-08-18"
        selectedMonth="2026-08"
        monthlyList={['2026-08']}
        onDateChange={vi.fn()}
        onMonthChange={vi.fn()}
        isOpen={false}
        onToggle={vi.fn()}
      />,
    )

    expect(markup).toContain('report-chart-summary')
    expect(markup).toContain('08.18: 8,500')
    expect(markup).toContain('data-testid="report-visual-chart"')
    expect(markup).toContain('aria-hidden="true"')

    const openMarkup = renderToStaticMarkup(
      <ReportBarChart
        titlePrefix="08.12 - 08.18"
        titleSuffix=" 지출"
        data={[{ label: '08.18', amount: 8_500 }]}
        chartClass="timeBarChart"
        type="date"
        selectorText="2026.08.18"
        selectedDate="2026-08-18"
        selectedMonth="2026-08"
        monthlyList={['2026-08']}
        onDateChange={vi.fn()}
        onMonthChange={vi.fn()}
        isOpen
        onToggle={vi.fn()}
      />,
    )

    expect(openMarkup).toContain('aria-label="August 18, 2026"')
    expect(openMarkup).toContain('aria-current="date"')
  })
})
