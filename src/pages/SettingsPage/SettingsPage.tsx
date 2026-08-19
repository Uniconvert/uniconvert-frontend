import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { getEmailReportPreview } from '@/features/settings/api/emailReports'
import { getSessionUser, saveSessionUser, updateSessionUser } from '@/auth/session'
import Toast from '@/components/common/Toast/Toast'
import { useToastQueue } from '@/components/common/Toast/useToastQueue'
import { useSessionUser } from '@/hooks/useSessionUser'
import { useMyUserQuery } from '@/hooks/useMyUserQuery'
import { getProfileImageKeyBySrc } from '@/constants/profileOptions'
import { getApiErrorNotice } from '@/utils/apiError'
import { useI18n } from '@/i18n/I18nContext'
import styles from '@/features/settings/settings.module.css'
import { ReportEmailSendError, sendReportEmail, type SendReportEmailInput } from '@/features/report/emailReportSender'
import { captureReportImage, ReportImageCaptureError } from '@/features/report/reportImageCapture'
import { executeManualEmailReport } from '@/features/report/manualEmailReport'
import LoadingState from '@/components/common/LoadingState/LoadingState'
import EmailReportSettingsSection, { type ReportCycle } from '@/features/settings/components/EmailReportSettingsSection'
import EmailReportPreview from '@/features/settings/components/EmailReportPreview'
import ProfileSettingsSection from '@/features/settings/components/ProfileSettingsSection'
import { useEmailReportSetting } from '@/features/settings/hooks/useEmailReportSetting'
import { emailReportKeys } from '@/features/settings/emailReportKeys'

function SettingsPage() {
  const { t } = useI18n()
  const sessionUser = useSessionUser()
  const {
    data: queriedUser,
    error: userQueryError,
    isFetching: isUserFetching,
    refetch: refetchUser,
    update: updateQueriedUser,
    isUpdating,
  } = useMyUserQuery()
  const [emailEnabledOverride, setEmailEnabledOverride] = useState<boolean | undefined>()
  const [savedNickname, setSavedNickname] = useState(() => getSessionUser()?.nickname ?? '')
  const [nickname, setNickname] = useState(() => getSessionUser()?.nickname ?? '')
  const [savedProfileImageKey, setSavedProfileImageKey] = useState(() => getSessionUser()?.profileImageKey ?? getProfileImageKeyBySrc(getSessionUser()?.profileImage) ?? '')
  const [profileImageKey, setProfileImageKey] = useState(savedProfileImageKey)
  const [savedPrimaryGoal, setSavedPrimaryGoal] = useState(() => getSessionUser()?.primaryGoal ?? '')
  const [primaryGoal, setPrimaryGoal] = useState(savedPrimaryGoal)
  const emailReportQuery = useQuery({ queryKey: emailReportKeys.preview(), queryFn: getEmailReportPreview })
  const emailSetting = useEmailReportSetting()
  const isEmailReportEnabled = emailEnabledOverride ?? emailSetting.query.data?.enabled ?? false
  const emailReport = emailReportQuery.data ?? null
  const reportError = emailReportQuery.error && !emailReport ? t('settings.previewError') : ''
  const userError = userQueryError && !queriedUser
    ? getApiErrorNotice(userQueryError, t('settings.profileUpdateError')).title
    : ''
  const [reportCycleOverride, setReportCycleOverride] = useState<ReportCycle | undefined>()
  const [reportTimeOverride, setReportTimeOverride] = useState<string | undefined>()
  const reportCycle = reportCycleOverride ?? emailSetting.query.data?.frequency?.toLowerCase() as ReportCycle | undefined ?? 'daily'
  const reportTime = reportTimeOverride ?? emailSetting.query.data?.sendTime?.slice(0, 5) ?? '09:00'
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false)
  const [tempSelectedTime, setTempSelectedTime] = useState(reportTime)
  const [timePage, setTimePage] = useState(0)
  const reportCaptureRef = useRef<HTMLElement>(null)
  const captureInProgressRef = useRef(false)
  const [isCapturingReport, setIsCapturingReport] = useState(false)
  const { toast, showToast, closeToast } = useToastQueue()
  const timeDropdownRef = useRef<HTMLDivElement>(null)
  const sendReportMutation = useMutation({ mutationFn: (input: SendReportEmailInput) => sendReportEmail(input) })

  useEffect(() => {
    if (!isTimeDropdownOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!timeDropdownRef.current?.contains(event.target as Node)) setIsTimeDropdownOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsTimeDropdownOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isTimeDropdownOpen])

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

  const handleSaveEmailSettings = async () => {
    try {
      await emailSetting.updateSetting({
        enabled: isEmailReportEnabled,
        frequency: (reportCycle.toUpperCase() as 'DAILY' | 'WEEKLY' | 'MONTHLY'),
        sendTime: reportTime.length === 5 ? `${reportTime}:00` : reportTime,
      })
      setEmailEnabledOverride(undefined)
      setReportCycleOverride(undefined)
      setReportTimeOverride(undefined)

      showToast({ variant: 'success', title: t('settings.profileUpdated') })
    } catch (error) {
      showToast({ variant: 'error', ...getApiErrorNotice(error, t('settings.profileUpdateError')) })
    }
  }

  const handleSendReport = async () => {
    if (!emailReport) return
    const recipientEmail = (sessionUser?.email ?? queriedUser?.email ?? '').trim()
    if (!recipientEmail) {
      showToast({ variant: 'error', title: t('settings.reportSendError') })
      return
    }
    if (captureInProgressRef.current || sendReportMutation.isPending) return

    captureInProgressRef.current = true
    setIsCapturingReport(true)
    try {
      await executeManualEmailReport({
        isPending: sendReportMutation.isPending,
        send: async () => {
          const reportImage = await captureReportImage(reportCaptureRef.current)
          return sendReportMutation.mutateAsync({
            toEmail: recipientEmail,
            reportPeriod: emailReport.yearMonth,
            reportImage,
          })
        },
        onSuccess: () => {
          showToast({ variant: 'success', title: t('report.sendSuccess') })
        },
        onError: (error) => {
          const isKnownReportError = error instanceof ReportEmailSendError || error instanceof ReportImageCaptureError
          showToast({
            variant: 'error',
            ...(isKnownReportError
              ? { title: t('settings.reportSendError') }
              : getApiErrorNotice(error, t('settings.reportSendError'))),
          })
        },
      })
    } finally {
      captureInProgressRef.current = false
      setIsCapturingReport(false)
    }
  }

  const allTimes = Array.from({ length: 24 }, (_, index) => `${String(index + 1).padStart(2, '0')}:00`)
  const itemsPerPage = 6
  const displayedTimes = allTimes.slice(timePage * itemsPerPage, (timePage + 1) * itemsPerPage)
  const totalTimePages = Math.ceil(allTimes.length / itemsPerPage)

  return <section className={styles.page} aria-labelledby="settings-title">
    {toast && <Toast key={toast.id} {...toast} onClose={closeToast} />}
    {isUserFetching && <LoadingState size="sm" variant="inline" />}
    <h1 id="settings-title">{t('settings.title')}</h1>
    <div className={styles.leftColumn}>
      <EmailReportSettingsSection
        isEnabled={isEmailReportEnabled}
        reportCycle={reportCycle}
        reportTime={reportTime}
        isTimeDropdownOpen={isTimeDropdownOpen}
        tempSelectedTime={tempSelectedTime}
        displayedTimes={displayedTimes}
        timePage={timePage}
        totalTimePages={totalTimePages}
        timeDropdownRef={timeDropdownRef}
        onToggle={() => setEmailEnabledOverride((value) => !(value ?? isEmailReportEnabled))}
        onToggleTimeDropdown={() => { setTempSelectedTime(reportTime); setIsTimeDropdownOpen((open) => !open) }}
        onTimeChange={setTempSelectedTime}
        onTimePageChange={setTimePage}
        onCancelTime={() => setIsTimeDropdownOpen(false)}
        onSaveTime={() => { setReportTimeOverride(tempSelectedTime); setIsTimeDropdownOpen(false) }}
        onCycleChange={setReportCycleOverride}
        onSaveSettings={handleSaveEmailSettings}
        isSaving={emailSetting.isUpdating}
      />
      <ProfileSettingsSection
        email={sessionUser?.email ?? ''}
        userError={userError}
        nickname={nickname}
        profileImageKey={profileImageKey}
        onNicknameChange={setNickname}
        onProfileImageChange={setProfileImageKey}
        onRetry={() => { void refetchUser() }}
        onCancel={() => { setNickname(savedNickname); setProfileImageKey(savedProfileImageKey); setPrimaryGoal(savedPrimaryGoal) }}
        onSave={handleSave}
        isSaving={isUpdating}
      />
    </div>
    <EmailReportPreview
      captureRef={reportCaptureRef}
      emailReport={emailReport}
      isLoading={emailReportQuery.isLoading}
      errorMessage={reportError}
      isSending={sendReportMutation.isPending || isCapturingReport}
      onRetry={() => { void emailReportQuery.refetch() }}
      onSend={handleSendReport}
    />
  </section>
}

export default SettingsPage
