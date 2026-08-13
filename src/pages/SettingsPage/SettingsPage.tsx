import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getEmailReportPreview } from '@/api/emailReports'
import { sendMonthlyReport } from '@/api/reports'
import { getSessionUser, saveSessionUser, updateSessionUser } from '@/auth/session'
import Button from '@/components/common/Button/Button'
import Toast from '@/components/common/Toast/Toast'
import { useToastQueue } from '@/components/common/Toast/useToastQueue'
import { useSessionUser } from '@/hooks/useSessionUser'
import { useMyUserQuery } from '@/hooks/useMyUserQuery'
import { getProfileImageKeyBySrc, getProfileImageSrc, getRandomProfileImageOption } from '@/constants/profileOptions'
import type { EmailReportData } from '@/types/emailReport'
import { getApiErrorNotice } from '@/utils/apiError'
import { getCategoryIconPath } from '@/utils/categoryIcon'
import { formatCurrencyAmount } from '@/utils/currency'
import { useI18n } from '@/i18n/I18nContext'
import styles from './SettingsPage.module.css'

function SettingsPage() {
  const { t } = useI18n()
  const sessionUser = useSessionUser()
  const { data: queriedUser, update: updateQueriedUser } = useMyUserQuery()
  const [isEmailReportEnabled, setIsEmailReportEnabled] = useState(false)
  const [savedNickname, setSavedNickname] = useState(() => getSessionUser()?.nickname ?? '')
  const [nickname, setNickname] = useState(() => getSessionUser()?.nickname ?? '')
  const [savedProfileImageKey, setSavedProfileImageKey] = useState(() => getSessionUser()?.profileImageKey ?? getProfileImageKeyBySrc(getSessionUser()?.profileImage) ?? '')
  const [profileImageKey, setProfileImageKey] = useState(savedProfileImageKey)
  const [savedPrimaryGoal, setSavedPrimaryGoal] = useState(() => getSessionUser()?.primaryGoal ?? '')
  const [primaryGoal, setPrimaryGoal] = useState(savedPrimaryGoal)
  const emailReportQuery = useQuery<EmailReportData>({ queryKey: ['email-report-preview'], queryFn: getEmailReportPreview })
  const emailReport = emailReportQuery.data ?? null
  const reportError = emailReportQuery.error ? t('settings.previewError') : ''
  const [reportCycle, setReportCycle] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [reportTime, setReportTime] = useState('09:00')
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false)
  const [tempSelectedTime, setTempSelectedTime] = useState(reportTime)
  const [timePage, setTimePage] = useState(0)
  const [isSendingReport, setIsSendingReport] = useState(false)
  const { toast, showToast, closeToast } = useToastQueue()

  useEffect(() => {
    if (queriedUser) {
      const user = queriedUser
      saveSessionUser(user)
      window.setTimeout(() => {
        setSavedNickname(user.nickname); setNickname(user.nickname)
        setSavedProfileImageKey(user.profileImageKey ?? ''); setProfileImageKey(user.profileImageKey ?? '')
        setSavedPrimaryGoal(user.primaryGoal ?? ''); setPrimaryGoal(user.primaryGoal ?? '')
      }, 0)
    }
  }, [queriedUser])

  const handleSave = async () => {
    const nextNickname = nickname.trim()
    if (!nextNickname) return
    try {
      const updatedUser = await updateQueriedUser({ nickname: nextNickname, profileImageKey: profileImageKey || undefined, primaryGoal: primaryGoal || undefined })
      setSavedNickname(updatedUser.nickname); setNickname(updatedUser.nickname)
      setSavedProfileImageKey(updatedUser.profileImageKey ?? ''); setProfileImageKey(updatedUser.profileImageKey ?? '')
      setSavedPrimaryGoal(updatedUser.primaryGoal ?? ''); setPrimaryGoal(updatedUser.primaryGoal ?? '')
      updateSessionUser(updatedUser)
      showToast({ variant: 'success', title: t('settings.profileUpdated') })
    } catch (error) {
      showToast({ variant: 'error', ...getApiErrorNotice(error, t('settings.profileUpdateError')) })
    }
  }

  const handleSendReport = async () => {
    if (isSendingReport) return
    setIsSendingReport(true)
    try { await sendMonthlyReport(); showToast({ variant: 'success', title: t('report.sendSuccess') }) }
    catch (error) { showToast({ variant: 'error', ...getApiErrorNotice(error, t('settings.reportSendError')) }) }
    finally { setIsSendingReport(false) }
  }

  const allTimes = Array.from({ length: 24 }, (_, index) => `${String(index + 1).padStart(2, '0')}:00`)
  const itemsPerPage = 6
  const displayedTimes = allTimes.slice(timePage * itemsPerPage, (timePage + 1) * itemsPerPage)
  const totalTimePages = Math.ceil(allTimes.length / itemsPerPage)

  return <section className={styles.page} aria-labelledby="settings-title">
    {toast && <Toast key={toast.id} {...toast} onClose={closeToast} />}
    <h1 id="settings-title">{t('settings.title')}</h1>
    <div className={styles.leftColumn}>
      <section className={styles.emailSetting} aria-labelledby="email-report-setting-title">
        <div className={styles.emailSettingHeader}>
          <span className={styles.emailIcon} aria-hidden="true"><img src="/assets/icons/email.png" alt="" /></span>
          <div><h2 id="email-report-setting-title">{t('settings.emailReportTitle')}</h2><p>{t('settings.emailReportDescription')}</p></div>
          <button className={`${styles.toggle} ${isEmailReportEnabled ? styles.toggleOn : ''}`} type="button" role="switch" aria-checked={isEmailReportEnabled} aria-label={t('settings.emailReportToggle')} onClick={() => setIsEmailReportEnabled((value) => !value)}><span /></button>
        </div>
        {isEmailReportEnabled && <div className={styles.emailSubOptions}>
          <div className={styles.optionRow}><span className={styles.optionLabel}>{t('settings.receiveTime')}</span><div className={styles.selectWrapper}>
            <button type="button" className={styles.timeSelectButton} onClick={() => { setTempSelectedTime(reportTime); setIsTimeDropdownOpen((open) => !open) }}><span className={styles.timeButtonContent}><img src="/assets/icons/time-setting.png" alt="" aria-hidden="true" />{reportTime}</span><span className={styles.Chevrondown} aria-hidden="true" /></button>
            {isTimeDropdownOpen && <div className={styles.timeDropdownPopup}>
              <button type="button" className={styles.popupArrowUp} aria-label={t('memo.previousPage')} onClick={() => setTimePage((page) => Math.max(page - 1, 0))} />
              <div className={styles.timeRadioList}>{displayedTimes.map((time) => <label key={time} className={styles.timeRadioItem}><input type="radio" name="reportTimeRadio" value={time} checked={tempSelectedTime === time} onChange={(event) => setTempSelectedTime(event.target.value)} /><span className={styles.timeText}>{time}</span></label>)}</div>
              <button type="button" className={styles.popupArrowDown} aria-label={t('memo.nextPage')} onClick={() => setTimePage((page) => Math.min(page + 1, totalTimePages - 1))} />
              <div className={styles.popupActions}><Button variant="outline" onClick={() => setIsTimeDropdownOpen(false)}>{t('common.cancel')}</Button><Button onClick={() => { setReportTime(tempSelectedTime); setIsTimeDropdownOpen(false) }}>{t('common.save')}</Button></div>
            </div>}
          </div></div>
          <div className={styles.optionRow}><span className={styles.optionLabel}>{t('settings.sendCycle')}</span><div className={styles.cycleButtonGroup}>
            {(['daily', 'weekly', 'monthly'] as const).map((cycle) => <button key={cycle} type="button" className={reportCycle === cycle ? styles.activeCycle : ''} onClick={() => setReportCycle(cycle)}>{t(`settings.${cycle}`)}</button>)}
          </div></div>
          <div className={styles.optionDescription}><img src="/assets/icons/info.png" alt="" aria-hidden="true" /><span>{t('settings.scheduleDescription')}</span><div className={styles.optionActions}><Button onClick={handleSave} disabled={!nickname.trim()}>{t('common.save')}</Button></div></div>
        </div>}
      </section>
      <section className={styles.profileCard} aria-labelledby="profile-title">
        <h2 id="profile-title">{t('settings.profile')}</h2>
        <div className={styles.avatarWrap}><div className={styles.profileAvatar}>{getProfileImageSrc(profileImageKey) ? <img src={getProfileImageSrc(profileImageKey)} alt={t('settings.profileImage')} /> : <span aria-hidden="true">{nickname.trim().charAt(0).toUpperCase()}</span>}</div><button type="button" className={styles.changePhotoButton} aria-label={t('settings.shuffleProfile')} onClick={() => setProfileImageKey((key) => getRandomProfileImageOption(key).key)}><img src="/assets/icons/actions/exchange-button.png" alt="" aria-hidden="true" /></button></div>
        <div className={styles.profileFields}><label><span>{t('settings.nickname')}</span><input value={nickname} maxLength={20} onChange={(event) => setNickname(event.target.value)} /></label><label><span>{t('settings.email')}</span><input value={sessionUser?.email ?? ''} placeholder={t('settings.noEmail')} readOnly aria-readonly="true" /></label></div>
        <div className={styles.profileActions}><Button variant="outline" onClick={() => { setNickname(savedNickname); setProfileImageKey(savedProfileImageKey); setPrimaryGoal(savedPrimaryGoal) }}>{t('common.cancel')}</Button><Button onClick={handleSave} disabled={!nickname.trim()}>{t('common.save')}</Button></div>
      </section>
    </div>
    <aside className={styles.reportPanel} aria-label={t('settings.preview')}><img className={styles.emailIllustration} src="/assets/illustrations/email-report.png" alt="" aria-hidden="true" /><section className={styles.reportCard}>
      <h2>{t('settings.preview')}</h2>{reportError && <p role="alert">{reportError}</p>}<p className={styles.reportMonth}>{emailReport?.yearMonth.replace('-', '.') ?? '-'}</p><div className={styles.reportTotal}><span>{t('report.totalExpense')}</span><strong>{emailReport ? formatCurrencyAmount(emailReport.totalExpenseHome, emailReport.homeCurrency) : '-'}</strong></div><hr /><h3>{t('settings.categorySpending')}</h3>
      <ul className={styles.reportList}>{emailReport?.categories.map((category) => <li key={category.categoryId}><span className={styles.reportCategoryIcon}><img src={getCategoryIconPath(category.iconKey)} alt="" aria-hidden="true" /></span><span className={styles.reportCategoryInfo}><span><b>{category.categoryName}</b><strong>{formatCurrencyAmount(category.amountHome, emailReport.homeCurrency)}</strong></span><span className={styles.reportProgress}><i style={{ width: `${category.ratio}%` }} /></span></span></li>)}</ul>
      <Button className={styles.sendReportButton} fullWidth disabled={isSendingReport} onClick={handleSendReport}><img src="/assets/icons/email.png" alt="" aria-hidden="true" />{isSendingReport ? t('report.sending') : t('report.send')}</Button>
    </section></aside>
  </section>
}

export default SettingsPage
