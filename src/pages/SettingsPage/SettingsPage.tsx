import { useEffect, useState } from 'react'
import { getEmailReportPreview } from '@/api/emailReports'
import { isUsingMockAuthApi } from '@/api/auth'
import { sendMonthlyReport } from '@/api/reports'
import { getMyUser, updateMyProfile } from '@/api/users'
import { getSessionUser, saveSessionUser, updateSessionUser } from '@/auth/session'
import Button from '@/components/common/Button/Button'
import Toast from '@/components/common/Toast/Toast'
import { useToastQueue } from '@/components/common/Toast/useToastQueue'
import { useSessionUser } from '@/hooks/useSessionUser'
import {
  getProfileImageKeyBySrc,
  getProfileImageSrc,
  getRandomProfileImageOption,
} from '@/constants/profileOptions'
import type { EmailReportData } from '@/types/emailReport'
import { getApiErrorNotice } from '@/utils/apiError'
import { getCategoryIconPath } from '@/utils/categoryIcon'
import { formatCurrencyAmount } from '@/utils/currency'
import styles from './SettingsPage.module.css'

function SettingsPage() {
  const [isEmailReportEnabled, setIsEmailReportEnabled] = useState(false)
  const sessionUser = useSessionUser()
  const [savedNickname, setSavedNickname] = useState(() => getSessionUser()?.nickname ?? '')
  const [nickname, setNickname] = useState(() => getSessionUser()?.nickname ?? '')
  const [savedProfileImageKey, setSavedProfileImageKey] = useState(
    () => getSessionUser()?.profileImageKey ?? getProfileImageKeyBySrc(getSessionUser()?.profileImage) ?? '',
  )
  const [profileImageKey, setProfileImageKey] = useState(() => savedProfileImageKey)
  const [savedPrimaryGoal, setSavedPrimaryGoal] = useState(() => getSessionUser()?.primaryGoal ?? '')
  const [primaryGoal, setPrimaryGoal] = useState(() => savedPrimaryGoal)
  const [emailReport, setEmailReport] = useState<EmailReportData | null>(null)
  const [reportError, setReportError] = useState('')
  const [reportCycle, setReportCycle] = useState('daily') // 'daily' | 'weekly' | 'monthly'
  const [reportTime, setReportTime] = useState('09:00')
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false)
  const [isSendingReport, setIsSendingReport] = useState(false)
  const [tempSelectedTime, setTempSelectedTime] = useState(reportTime)
  const [timePage, setTimePage] = useState(0)
  const { toast, showToast, closeToast } = useToastQueue()

  useEffect(() => {
    let isActive = true

    getMyUser({ useMock: isUsingMockAuthApi })
      .then((user) => {
        if (!isActive) return
        saveSessionUser(user)
        setSavedNickname(user.nickname)
        setNickname(user.nickname)
        setSavedProfileImageKey(user.profileImageKey ?? '')
        setProfileImageKey(user.profileImageKey ?? '')
        setSavedPrimaryGoal(user.primaryGoal ?? '')
        setPrimaryGoal(user.primaryGoal ?? '')
      })
      .catch(() => {
        // 로그인 시 저장한 세션 정보로 설정 화면을 계속 표시합니다.
      })

    return () => {
      isActive = false
    }
  }, [])
  useEffect(() => {
    let isActive = true

    getEmailReportPreview()
      .then((response) => {
        if (isActive) {
          setEmailReport(response)
          setIsEmailReportEnabled(response.isEnabled)
          // 필요시 API에서 받아온 주기/시간 설정값 반영
          // if (response.cycle) setReportCycle(response.cycle)
          // if (response.time) setReportTime(response.time)
        }
      })
      .catch(() => {
        if (isActive) setReportError('이메일 리포트를 불러오지 못했습니다.')
      })

    return () => {
      isActive = false
    }
  }, [])

  const handleShuffleProfileImage = () => {
    setProfileImageKey((currentKey) => getRandomProfileImageOption(currentKey).key)
  }

  const handleSave = async () => {
    const nextNickname = nickname.trim()
    if (!nextNickname) return

    try {
      const updatedUser = await updateMyProfile({
        nickname: nextNickname,
        profileImageKey: profileImageKey || undefined,
        primaryGoal: primaryGoal || undefined,
      }, { useMock: isUsingMockAuthApi })
      setSavedNickname(updatedUser.nickname)
      setNickname(updatedUser.nickname)
      setSavedProfileImageKey(updatedUser.profileImageKey ?? '')
      setProfileImageKey(updatedUser.profileImageKey ?? '')
      setSavedPrimaryGoal(updatedUser.primaryGoal ?? '')
      setPrimaryGoal(updatedUser.primaryGoal ?? '')
      updateSessionUser(updatedUser)
      showToast({ variant: 'success', title: '수정되었어요' })
    } catch (error) {
      showToast({
        variant: 'error',
        ...getApiErrorNotice(error, '프로필 수정에 실패했습니다.'),
      })
    }
  }

  const handleCancel = () => {
    setNickname(savedNickname)
    setProfileImageKey(savedProfileImageKey)
    setPrimaryGoal(savedPrimaryGoal)
  }

  const handleReportToggle = () => {
    setIsEmailReportEnabled((current) => !current)
    // TODO: Swagger 확정 후 이메일 리포트 수신 설정 API를 연결합니다.
  }

  const handleSendReport = async () => {
    if (isSendingReport) return
    setIsSendingReport(true)
    try {
      await sendMonthlyReport()
      showToast({ variant: 'success', title: '이메일로 리포트를 보냈어요' })
    } catch (error) {
      showToast({
        variant: 'error',
        ...getApiErrorNotice(error, '이메일 리포트를 보내지 못했습니다.'),
      })
    } finally {
      setIsSendingReport(false)
    }
  }

  const allTimes = Array.from({ length: 24 }, (_, index) => {
    const hour = String(index + 1).padStart(2, '0')
    return `${hour}:00`
  })

  const ITEMS_PER_PAGE = 6
  const displayedTimes = allTimes.slice(timePage * ITEMS_PER_PAGE, (timePage + 1) * ITEMS_PER_PAGE)

  // 위/아래 화살표 클릭 핸들러
  const handlePrevPage = () => {
    setTimePage((prev) => Math.max(prev - 1, 0)) // 첫 페이지(0) 아래로 내려가지 않음
  }

  const handleNextPage = () => {
    setTimePage((prev) => Math.min(prev + 1, Math.ceil(allTimes.length / ITEMS_PER_PAGE) - 1)) // 마지막 페이지 위로 올라가지 않음
  }

  return (
    <section className={styles.page} aria-labelledby="settings-title">
      {toast && <Toast key={toast.id} {...toast} onClose={closeToast} />}
      <h1 id="settings-title">설정</h1>

      <div className={styles.leftColumn}>
        <section className={styles.emailSetting} aria-labelledby="email-report-setting-title">
          <div className={styles.emailSettingHeader}>
            <span className={styles.emailIcon} aria-hidden="true">
              <img src="/assets/icons/email.png" alt="" aria-hidden="true" />
            </span>
            <div>
              <h2 id="email-report-setting-title">이메일로 리포트 보내기</h2>
              <p>매일 지출 내역을 이메일로 받아보세요</p>
            </div>
            <button
              className={`${styles.toggle} ${isEmailReportEnabled ? styles.toggleOn : ''}`}
              type="button"
              role="switch"
              aria-checked={isEmailReportEnabled}
              aria-label="이메일 리포트 수신"
              onClick={handleReportToggle}
            >
              <span />
            </button>
          </div>

          {isEmailReportEnabled && (
            <div className={styles.emailSubOptions}>
              <div className={styles.optionRow}>
                <span className={styles.optionLabel}>받는 시간</span>
                <div className={styles.selectWrapper}>
                  <button
                    type="button"
                    className={styles.timeSelectButton}
                    onClick={() => {
                      setTempSelectedTime(reportTime)
                      setIsTimeDropdownOpen((prev) => !prev)
                    }}
                  >
                    <span className={styles.timeButtonContent}>
                      <img src="/assets/icons/time-setting.png" alt="" aria-hidden="true" />
                      {reportTime}
                    </span>
                    <span className={styles.Chevrondown} aria-hidden="true" />
                  </button>

                  {isTimeDropdownOpen && (
                    <div className={styles.timeDropdownPopup}>
                      <button type="button" className={styles.popupArrowUp} aria-hidden="true" onClick={handlePrevPage} />

                      <div className={styles.timeRadioList}>
                        {displayedTimes.map((time) => (
                          <label key={time} className={styles.timeRadioItem}>
                            <input
                              type="radio"
                              name="reportTimeRadio"
                              value={time}
                              checked={tempSelectedTime === time}
                              onChange={(e) => setTempSelectedTime(e.target.value)}
                            />
                            <span className={styles.timeText}>{time}</span>
                          </label>
                        ))}
                      </div>

                      <button type="button" className={styles.popupArrowDown} aria-hidden="true" onClick={handleNextPage} />

                      <div className={styles.popupActions}>
                        <Button variant="outline" onClick={() => setIsTimeDropdownOpen(false)}>
                          취소
                        </Button>
                        <Button
                          onClick={() => {
                            setReportTime(tempSelectedTime)
                            setIsTimeDropdownOpen(false)
                          }}
                        >
                          확인
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.optionRow}>
                <span className={styles.optionLabel}>발송 주기</span>
                <div className={styles.cycleButtonGroup}>
                  <button
                    type="button"
                    className={reportCycle === 'daily' ? styles.activeCycle : ''}
                    onClick={() => setReportCycle('daily')}
                  >
                    매일
                  </button>
                  <button
                    type="button"
                    className={reportCycle === 'weekly' ? styles.activeCycle : ''}
                    onClick={() => setReportCycle('weekly')}
                  >
                    매주
                  </button>
                  <button
                    type="button"
                    className={reportCycle === 'monthly' ? styles.activeCycle : ''}
                    onClick={() => setReportCycle('monthly')}
                  >
                    매월
                  </button>
                </div>
              </div>

              <div className={styles.optionDescription}>
                <img src="/assets/icons/info.png" alt="" aria-hidden="true" />
                <span>선택한 시간에 지출 내역 리포트가 이메일로 발송되며, <br />
                "매주"는 무조건 매주 월요일에, <br />"매월"은 무조건 매월 1일에 발송됩니다.</span>
                <div className={styles.optionActions}>
                  <Button onClick={handleSave} disabled={!nickname.trim()}>저장</Button>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className={styles.profileCard} aria-labelledby="profile-title">
          <h2 id="profile-title">프로필</h2>
          <div className={styles.avatarWrap}>
            <div className={styles.profileAvatar}>
              {getProfileImageSrc(profileImageKey)
                ? <img src={getProfileImageSrc(profileImageKey)} alt="선택한 프로필" />
                : <span aria-hidden="true">{nickname.trim().charAt(0).toUpperCase()}</span>}
            </div>
            <button type="button" className={styles.changePhotoButton} aria-label="프로필 이미지 무작위 변경" onClick={handleShuffleProfileImage}>
              <img src="/assets/icons/actions/exchange-button.png" alt="" aria-hidden="true" />
            </button>
          </div>

          <div className={styles.profileFields}>
            <label>
              <span>닉네임</span>
              <input value={nickname} maxLength={20} onChange={(event) => setNickname(event.target.value)} />
            </label>
            <label>
              <span>이메일</span>
              <input value={sessionUser?.email ?? ''} placeholder="로그인된 이메일이 없습니다" readOnly aria-readonly="true" />
            </label>
          </div>

          <div className={styles.profileActions}>
            <Button variant="outline" onClick={handleCancel}>취소</Button>
            <Button onClick={handleSave} disabled={!nickname.trim()}>저장</Button>
          </div>
        </section>
      </div>
      <aside className={styles.reportPanel} aria-label="이메일 리포트 미리보기">
        <img className={styles.emailIllustration} src="/assets/illustrations/email-report.png" alt="" aria-hidden="true" />
        <section className={styles.reportCard}>
          <h2>리포트 미리보기</h2>
          {reportError && <p role="alert">{reportError}</p>}
          <p className={styles.reportMonth}>{emailReport?.yearMonth.replace('-', '.') ?? '-'}</p>
          <div className={styles.reportTotal}>
            <span>총 지출 금액</span>
            <strong>{emailReport ? formatCurrencyAmount(emailReport.totalExpenseHome, emailReport.homeCurrency) : '-'}</strong>
          </div>
          <hr />
          <h3>카테고리별 지출</h3>
          <ul className={styles.reportList}>
            {emailReport?.categories.map((category) => (
              <li key={category.categoryId}>
                <span className={styles.reportCategoryIcon}><img src={getCategoryIconPath(category.iconKey)} alt="" aria-hidden="true" /></span>
                <span className={styles.reportCategoryInfo}>
                  <span><b>{category.categoryName}</b><strong>{formatCurrencyAmount(category.amountHome, emailReport.homeCurrency)}</strong></span>
                  <span className={styles.reportProgress}><i style={{ width: `${category.ratio}%` }} /></span>
                </span>
              </li>
            ))}
          </ul>
          <Button
            className={styles.sendReportButton}
            fullWidth
            disabled={isSendingReport}
            onClick={handleSendReport}
          >
            <img src="/assets/icons/email.png" alt="" aria-hidden="true" />
            {isSendingReport ? '보내는 중...' : '이메일로 리포트 보내기'}
          </Button>
        </section>
      </aside>
    </section>
  )
}

export default SettingsPage
