import { createRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { EmailReportData } from '@/features/settings/types/emailReport'

vi.mock('@/i18n/I18nContext', () => ({
  useI18n: () => ({
    locale: 'en-US',
    t: (key: string) => key,
  }),
}))

import EmailReportPreview from './EmailReportPreview'
import EmailReportSettingsSection from './EmailReportSettingsSection'
import ProfileSettingsSection from './ProfileSettingsSection'

const report: EmailReportData = {
  isEnabled: true,
  yearMonth: '2026-08',
  homeCurrency: 'KRW',
  totalExpenseHome: 125_000,
  categories: [{ categoryId: 'food', categoryName: 'Food', amountHome: 80_000, ratio: 64, iconKey: 'food' }],
}

describe('SettingsPage 분리 컴포넌트', () => {
  it('프로필 설정 영역은 프로필 정보와 저장 controls를 표시한다', () => {
    const markup = renderToStaticMarkup(
      <ProfileSettingsSection
        email="user@example.com"
        userError=""
        nickname="Uni"
        profileImageKey="default"
        onNicknameChange={vi.fn()}
        onProfileImageChange={vi.fn()}
        onRetry={vi.fn()}
        onCancel={vi.fn()}
        onSave={vi.fn()}
      />,
    )

    expect(markup).toContain('settings.profile')
    expect(markup).toContain('user@example.com')
    expect(markup).toContain('common.save')
  })

  it('이메일 리포트 설정은 비활성/활성 상태에 따라 옵션을 구분한다', () => {
    const baseProps = {
      reportCycle: 'daily' as const,
      reportTime: '09:00',
      isTimeDropdownOpen: false,
      tempSelectedTime: '09:00',
      displayedTimes: ['09:00', '10:00'],
      timePage: 0,
      totalTimePages: 12,
      timeDropdownRef: createRef<HTMLDivElement>(),
      onToggle: vi.fn(),
      onToggleTimeDropdown: vi.fn(),
      onTimeChange: vi.fn(),
      onTimePageChange: vi.fn(),
      onCancelTime: vi.fn(),
      onSaveTime: vi.fn(),
      onCycleChange: vi.fn(),
      onSaveSettings: vi.fn(),
    }
    const disabledMarkup = renderToStaticMarkup(<EmailReportSettingsSection {...baseProps} isEnabled={false} />)
    const enabledMarkup = renderToStaticMarkup(<EmailReportSettingsSection {...baseProps} isEnabled />)

    expect(disabledMarkup).toContain('settings.emailReportTitle')
    expect(disabledMarkup).not.toContain('settings.sendCycle')
    expect(enabledMarkup).toContain('settings.sendCycle')
    expect(enabledMarkup).toContain('settings.daily')
  })

  it('리포트 미리보기는 성공 데이터와 빈 상태를 구분한다', () => {
    const dataMarkup = renderToStaticMarkup(
      <EmailReportPreview
        captureRef={createRef<HTMLElement>()}
        emailReport={report}
        isLoading={false}
        errorMessage=""
        isSending={false}
        onRetry={vi.fn()}
        onSend={vi.fn()}
      />,
    )
    const emptyMarkup = renderToStaticMarkup(
      <EmailReportPreview
        captureRef={createRef<HTMLElement>()}
        emailReport={null}
        isLoading={false}
        errorMessage=""
        isSending={false}
        onRetry={vi.fn()}
        onSend={vi.fn()}
      />,
    )

    expect(dataMarkup).toContain('Food')
    expect(dataMarkup).toContain('report.send')
    expect(dataMarkup).toContain('report.mvpNotice')
    expect(emptyMarkup).toContain('settings.preview')
    expect(emptyMarkup).not.toContain('report.send')
  })
})
