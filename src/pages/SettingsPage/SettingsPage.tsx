import { useEffect, useRef, useState } from 'react'
import { getEmailReportPreview } from '@/api/emailReports'
import { getSessionUser, updateSessionUser } from '@/auth/session'
import Button from '@/components/common/Button/Button'
import type { AuthUser } from '@/types/auth'
import type { EmailReportData } from '@/types/emailReport'
import styles from './SettingsPage.module.css'

const categoryIconPath = (iconKey: string) => `/assets/icons/categories/category-${iconKey}.png`

function SettingsPage() {
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [isEmailReportEnabled, setIsEmailReportEnabled] = useState(false)
  const [sessionUser, setSessionUser] = useState<AuthUser | null>(getSessionUser)
  const [savedNickname, setSavedNickname] = useState(() => getSessionUser()?.nickname ?? '')
  const [nickname, setNickname] = useState(() => getSessionUser()?.nickname ?? '')
  const [profileImage, setProfileImage] = useState(() => getSessionUser()?.profileImage ?? '')
  const [savedMessage, setSavedMessage] = useState('')
  const [emailReport, setEmailReport] = useState<EmailReportData | null>(null)
  const [reportError, setReportError] = useState('')

  useEffect(() => {
    let isActive = true

    getEmailReportPreview()
      .then((response) => {
        if (isActive) {
          setEmailReport(response)
          setIsEmailReportEnabled(response.isEnabled)
        }
      })
      .catch(() => {
        if (isActive) setReportError('이메일 리포트를 불러오지 못했습니다.')
      })

    return () => {
      isActive = false
    }
  }, [])

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.addEventListener('load', () => {
      const nextProfileImage = String(reader.result ?? '')
      setProfileImage(nextProfileImage)
      setSessionUser(updateSessionUser({ profileImage: nextProfileImage }))
    })
    reader.readAsDataURL(file)
  }

  const handleSave = () => {
    const nextNickname = nickname.trim()
    if (!nextNickname) return

    setSavedNickname(nextNickname)
    setNickname(nextNickname)
    setSessionUser(updateSessionUser({ nickname: nextNickname }))
    setSavedMessage('프로필이 저장되었습니다.')
    // TODO: Swagger 확정 후 프로필 수정 API를 연결합니다.
  }

  const handleCancel = () => {
    setNickname(savedNickname)
    setSavedMessage('')
  }

  const handleReportToggle = () => {
    setIsEmailReportEnabled((current) => !current)
    // TODO: Swagger 확정 후 이메일 리포트 수신 설정 API를 연결합니다.
  }

  return (
    <section className={styles.page} aria-labelledby="settings-title">
      <h1 id="settings-title">설정</h1>

      <div className={styles.leftColumn}>
        <section className={styles.emailSetting} aria-labelledby="email-report-setting-title">
          <span className={styles.emailIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></svg>
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
        </section>

        <section className={styles.profileCard} aria-labelledby="profile-title">
          <h2 id="profile-title">프로필</h2>
          <div className={styles.avatarWrap}>
            <div className={styles.profileAvatar}>
              {profileImage
                ? <img src={profileImage} alt="선택한 프로필" />
                : <span aria-hidden="true">{nickname.trim().charAt(0).toUpperCase()}</span>}
            </div>
            <button type="button" className={styles.changePhotoButton} aria-label="프로필 사진 변경" onClick={() => imageInputRef.current?.click()}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5M6.1 8a7 7 0 0 1 11.5-2.1L20 8M4 16l2.4 2.1A7 7 0 0 0 17.9 16" /></svg>
            </button>
            <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageChange} />
          </div>

          <div className={styles.profileFields}>
            <label>
              <span>닉네임</span>
              <input value={nickname} maxLength={20} onChange={(event) => { setNickname(event.target.value); setSavedMessage('') }} />
            </label>
            <label>
              <span>이메일</span>
              <input value={sessionUser?.email ?? ''} placeholder="로그인된 이메일이 없습니다" readOnly aria-readonly="true" />
            </label>
          </div>

          <div className={styles.profileActions}>
            <p role="status">{savedMessage}</p>
            <Button variant="outline" onClick={handleCancel}>취소</Button>
            <Button onClick={handleSave} disabled={!nickname.trim()}>저장</Button>
          </div>
        </section>

        <p className={styles.version}>버전: 1.0.0</p>
      </div>

      {isEmailReportEnabled ? (
        <aside className={styles.reportPanel} aria-label="이메일 리포트 미리보기">
          <img className={styles.emailIllustration} src="/assets/illustrations/email-report.png" alt="" aria-hidden="true" />
          <section className={styles.reportCard}>
            <h2>리포트 미리보기</h2>
            {reportError && <p role="alert">{reportError}</p>}
            <p className={styles.reportMonth}>{emailReport?.yearMonth.replace('-', '.') ?? '-'}</p>
            <div className={styles.reportTotal}>
              <span>총 지출 금액</span>
              <strong>₩ {emailReport?.totalExpenseHome.toLocaleString('ko-KR') ?? '0'}</strong>
            </div>
            <hr />
            <h3>카테고리별 지출</h3>
            <ul className={styles.reportList}>
              {emailReport?.categories.map((category) => (
                <li key={category.categoryId}>
                  <span className={styles.reportCategoryIcon}><img src={categoryIconPath(category.iconKey)} alt="" aria-hidden="true" /></span>
                  <span className={styles.reportCategoryInfo}>
                    <span><b>{category.categoryName}</b><strong>₩ {category.amountHome.toLocaleString('ko-KR')}</strong></span>
                    <span className={styles.reportProgress}><i style={{ width: `${category.ratio}%` }} /></span>
                  </span>
                </li>
              ))}
            </ul>
            <Button className={styles.sendReportButton} fullWidth>
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></svg>
              이메일로 리포트 보내기
            </Button>
          </section>
        </aside>
      ) : (
        <aside className={styles.offVisual} aria-label="이메일 리포트가 꺼져 있습니다">
          <p>지출 환경을 설정하고 관리하세요</p>
          <span className={styles.thoughtLarge} />
          <span className={styles.thoughtSmall} />
          <img src="/assets/illustrations/mascot-check.png" alt="" aria-hidden="true" />
        </aside>
      )}
    </section>
  )
}

export default SettingsPage
