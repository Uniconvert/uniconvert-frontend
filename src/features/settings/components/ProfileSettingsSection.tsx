import { getProfileImageSrc, getRandomProfileImageOption } from '@/constants/profileOptions'
import Button from '@/components/common/Button/Button'
import ErrorState from '@/components/common/ErrorState/ErrorState'
import { useI18n } from '@/i18n/I18nContext'
import styles from '@/features/settings/settings.module.css'

interface ProfileSettingsSectionProps {
  email: string
  userError: string
  nickname: string
  profileImageKey: string
  onNicknameChange: (value: string) => void
  onProfileImageChange: (value: string) => void
  onRetry: () => void
  onCancel: () => void
  onSave: () => void | Promise<void>
  isSaving?: boolean
}

function ProfileSettingsSection({
  email,
  userError,
  nickname,
  profileImageKey,
  onNicknameChange,
  onProfileImageChange,
  onRetry,
  onCancel,
  onSave,
  isSaving = false,
}: ProfileSettingsSectionProps) {
  const { t } = useI18n()
  const profileImageSrc = getProfileImageSrc(profileImageKey)

  return (
    <section className={styles.profileCard} aria-labelledby="profile-title">
      <h2 id="profile-title">{t('settings.profile')}</h2>
      {userError && <ErrorState title={userError} retryLabel={t('common.retry')} onRetry={onRetry} variant="compact" />}
      <div className={styles.avatarWrap}>
        <div className={styles.profileAvatar}>
          {profileImageSrc
            ? <img src={profileImageSrc} alt={t('settings.profileImage')} />
            : <span aria-hidden="true">{nickname.trim().charAt(0).toUpperCase()}</span>}
        </div>
        <button
          type="button"
          className={styles.changePhotoButton}
          aria-label={t('settings.shuffleProfile')}
          onClick={() => onProfileImageChange(getRandomProfileImageOption(profileImageKey).key)}
        >
          <img src="/assets/icons/actions/exchange-button.png" alt="" aria-hidden="true" />
        </button>
      </div>
      <div className={styles.profileFields}>
        <label>
          <span>{t('settings.nickname')}</span>
          <input value={nickname} maxLength={20} onChange={(event) => onNicknameChange(event.target.value)} />
        </label>
        <label>
          <span>{t('settings.email')}</span>
          <input value={email} placeholder={t('settings.noEmail')} readOnly aria-readonly="true" />
        </label>
      </div>
      <div className={styles.profileActions}>
        <Button variant="outline" onClick={onCancel}>{t('common.cancel')}</Button>
        <Button onClick={onSave} disabled={!nickname.trim()} isLoading={isSaving}>{t('common.save')}</Button>
      </div>
    </section>
  )
}

export default ProfileSettingsSection
