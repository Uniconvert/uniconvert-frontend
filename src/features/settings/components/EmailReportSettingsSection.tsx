import type { RefObject } from 'react'
import Button from '@/components/common/Button/Button'
import { useI18n } from '@/i18n/I18nContext'
import styles from '@/features/settings/settings.module.css'

export type ReportCycle = 'daily' | 'weekly' | 'monthly'

interface EmailReportSettingsSectionProps {
  isEnabled: boolean
  reportCycle: ReportCycle
  reportTime: string
  isTimeDropdownOpen: boolean
  tempSelectedTime: string
  displayedTimes: string[]
  timePage: number
  totalTimePages: number
  timeDropdownRef: RefObject<HTMLDivElement | null>
  onToggle: () => void
  onToggleTimeDropdown: () => void
  onTimeChange: (value: string) => void
  onTimePageChange: (page: number) => void
  onCancelTime: () => void
  onSaveTime: () => void
  onCycleChange: (cycle: ReportCycle) => void
  /** Kept for compatibility with existing callers; settings are saved by the shared form action. */
  onSaveSettings?: () => void | Promise<void>
  isSaving?: boolean
}

function EmailReportSettingsSection({
  isEnabled,
  reportCycle,
  reportTime,
  isTimeDropdownOpen,
  tempSelectedTime,
  displayedTimes,
  timePage,
  totalTimePages,
  timeDropdownRef,
  onToggle,
  onToggleTimeDropdown,
  onTimeChange,
  onTimePageChange,
  onCancelTime,
  onSaveTime,
  onCycleChange,
}: EmailReportSettingsSectionProps) {
  const { t } = useI18n()

  return (
    <section className={styles.emailSetting} aria-labelledby="email-report-setting-title">
      <div className={styles.emailSettingHeader}>
        <span className={styles.emailIcon} aria-hidden="true"><img src="/assets/icons/email.png" alt="" /></span>
        <div><h2 id="email-report-setting-title">{t('settings.emailReportTitle')}</h2><p>{t('settings.emailReportDescription')}</p></div>
        <button className={`${styles.toggle} ${isEnabled ? styles.toggleOn : ''}`} type="button" role="switch" aria-checked={isEnabled} aria-label={t('settings.emailReportToggle')} onClick={onToggle}><span /></button>
      </div>
      {isEnabled && <div className={styles.emailSubOptions}>
        <div className={styles.optionRow}>
          <span className={styles.optionLabel}>{t('settings.receiveTime')}</span>
          <div className={styles.selectWrapper} ref={timeDropdownRef}>
            <button type="button" className={styles.timeSelectButton} aria-label={t('settings.receiveTime')} aria-haspopup="dialog" aria-expanded={isTimeDropdownOpen} aria-controls="settings-time-dropdown" onClick={onToggleTimeDropdown}>
              <span className={styles.timeButtonContent}><img src="/assets/icons/time-setting.png" alt="" aria-hidden="true" />{reportTime}</span>
              <span className={styles.Chevrondown} aria-hidden="true" />
            </button>
            {isTimeDropdownOpen && <div id="settings-time-dropdown" className={styles.timeDropdownPopup} role="dialog" aria-label={t('settings.receiveTime')}>
              <button type="button" className={styles.popupArrowUp} aria-label={t('memo.previousPage')} onClick={() => onTimePageChange(Math.max(timePage - 1, 0))} />
              <div className={styles.timeRadioList}>
                {displayedTimes.map((time) => <label key={time} className={styles.timeRadioItem}><input type="radio" name="reportTimeRadio" value={time} checked={tempSelectedTime === time} onChange={(event) => onTimeChange(event.target.value)} /><span className={styles.timeText}>{time}</span></label>)}
              </div>
              <button type="button" className={styles.popupArrowDown} aria-label={t('memo.nextPage')} onClick={() => onTimePageChange(Math.min(timePage + 1, totalTimePages - 1))} />
              <div className={styles.popupActions}>
                <Button variant="outline" onClick={onCancelTime}>{t('common.cancel')}</Button>
                <Button onClick={onSaveTime}>{t('common.save')}</Button>
              </div>
            </div>}
          </div>
        </div>
        <div className={styles.optionRow}>
          <span className={styles.optionLabel}>{t('settings.sendCycle')}</span>
          <div className={styles.cycleButtonGroup}>
            {(['daily', 'weekly', 'monthly'] as const).map((cycle) => <button key={cycle} type="button" className={reportCycle === cycle ? styles.activeCycle : ''} onClick={() => onCycleChange(cycle)}>{t(`settings.${cycle}`)}</button>)}
          </div>
        </div>
        <div className={styles.optionDescription}><img src="/assets/icons/info.png" alt="" aria-hidden="true" /><span>{t('settings.scheduleDescription')}</span></div>
        <p className={styles.mvpScheduleNotice}>{t('settings.mvpScheduleNotice')}</p>
      </div>}
    </section>
  )
}

export default EmailReportSettingsSection
