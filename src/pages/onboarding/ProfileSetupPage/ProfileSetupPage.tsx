import { useState } from 'react'
import { useNavigate } from 'react-router'
import { saveOnboarding } from '@/api/onboarding'
import { updateMyProfile } from '@/api/users'
import AuthPanelShell from '@/components/auth/AuthPanelShell/AuthPanelShell'
import Button from '@/components/common/Button/Button'
import Toast from '@/components/common/Toast/Toast'
import { useToastQueue } from '@/components/common/Toast/useToastQueue'
import { getOnboardingSettings, updateOnboardingSettings, updateSessionUser } from '@/auth/session'
import {
  findProfileImageOption,
  getProfileImageSrc,
  getRandomProfileImageOption,
  PROFILE_GOAL_OPTIONS,
} from '@/constants/profileOptions'
import { ROUTE_PATHS } from '@/routes/routePaths'
import { getApiErrorNotice } from '@/utils/apiError'
import styles from './ProfileSetupPage.module.css'
import { useI18n } from '@/i18n/I18nContext'

const PROFILE_SETUP_MIN_LOADING_DURATION_MS = 3000

function ProfileSetupPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [nickname, setNickname] = useState('')
  const [profileImageKey, setProfileImageKey] = useState(
    () => getRandomProfileImageOption().key,
  )
  const [statusMessage, setStatusMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast, showToast, closeToast } = useToastQueue()
  const [goals, setGoals] = useState<string[]>(() => {
    const savedGoals = getOnboardingSettings().profileGoals ?? []
    return savedGoals.length > 0 ? [savedGoals[0]] : []
  })

  const selectGoal = (goalId: string) => setGoals([goalId])

  const handleShuffleProfileImage = () => {
    setProfileImageKey((currentKey) => getRandomProfileImageOption(currentKey).key)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting) return

    const normalizedNickname = nickname.trim()
    const settings = getOnboardingSettings()
    const homeCurrencyCode = settings.baseCurrency?.trim().toUpperCase()
    const localCurrencyCode = settings.localCurrencies?.[0]?.trim().toUpperCase()
    const monthlyLimitHome = settings.monthlyBudget
    const timezone = settings.timeZone?.trim()

    if (!homeCurrencyCode || !localCurrencyCode || !monthlyLimitHome || !timezone) {
      setStatusMessage('이전 단계의 통화·예산·시간대 정보를 다시 확인해 주세요.')
      return
    }

    setIsSubmitting(true)
    setStatusMessage('')
    const loadingStartedAt = Date.now()

    try {
      // 닉네임은 온보딩 완료 요청과 분리된 사용자 API로 저장합니다.
      await updateMyProfile({ nickname: normalizedNickname })

      const onboarding = await saveOnboarding(
        {
          homeCurrencyCode,
          localCurrencyCode,
          monthlyLimitHome,
          timezone,
          profileImageKey,
          primaryGoal: goals[0],
        },
      )

      if (!onboarding.onboardingCompleted) {
        throw new Error('온보딩 완료 상태를 확인하지 못했습니다. 다시 시도해 주세요.')
      }

      const remainingLoadingTime = PROFILE_SETUP_MIN_LOADING_DURATION_MS - (Date.now() - loadingStartedAt)
      if (remainingLoadingTime > 0) {
        await new Promise<void>((resolve) => { window.setTimeout(resolve, remainingLoadingTime) })
      }

      sessionStorage.setItem('uniconvert.profileGoals', JSON.stringify(goals))
      updateOnboardingSettings({ profileGoals: goals })
      updateSessionUser({
        nickname: normalizedNickname,
        isOnboardingCompleted: true,
        profileImageKey: onboarding.profileImageKey ?? profileImageKey,
        profileImage: getProfileImageSrc(onboarding.profileImageKey ?? profileImageKey),
        primaryGoal: onboarding.primaryGoal ?? goals[0],
      })
      navigate(ROUTE_PATHS.home)
    } catch (error) {
      showToast({
        variant: 'error',
        ...getApiErrorNotice(error, '온보딩 정보를 저장하지 못했습니다.'),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className={styles.page} aria-labelledby="profile-title">
      {toast && <Toast key={toast.id} {...toast} onClose={closeToast} />}
      <img className={styles.coinDecoration} src="/assets/icons/login_coin.png" alt="" aria-hidden="true" />
      <img className={styles.exchangeDecoration} src="/assets/icons/login_exchange.png" alt="" aria-hidden="true" />

      <AuthPanelShell
        as="form"
        width="47.5rem"
        showBookmark={false}
        className={styles.card}
        ariaLabelledBy="profile-title"
        onSubmit={handleSubmit}
      >
        <div className={styles.headingRow}><h1 id="profile-title">{t('onboarding.profileTitle')}</h1><p>{t('onboarding.profileDescription')}</p></div>

        <div className={styles.avatarArea}>
          <div className={styles.avatar}>
            <img
              src={findProfileImageOption(profileImageKey)?.src}
              alt="선택한 프로필"
            />
          </div>
          <button
            type="button"
            className={styles.changeAvatar}
            aria-label="프로필 이미지 무작위 변경"
            onClick={handleShuffleProfileImage}
          >
            <img
              src="/assets/icons/actions/exchange-button.png"
              alt=""
              aria-hidden="true"
            />
          </button>
        </div>

        <label className={styles.nicknameField}>
          <span>{t('onboarding.nickname')}</span>
          <span className={styles.nicknameInput}>
            <img src="/assets/icons/profile-user.png" alt="" aria-hidden="true" />
            <input value={nickname} placeholder={t('onboarding.nicknamePlaceholder')} onChange={(event) => { setNickname(event.target.value); setStatusMessage('') }} maxLength={20} required />
          </span>
        </label>

        <fieldset className={styles.goals}>
          <legend>{t('onboarding.goalQuestion')}</legend>
          <div>{PROFILE_GOAL_OPTIONS.map((goal) => (
            <label key={goal.id} className={`${styles.goalOption} ${goals.includes(goal.id) ? styles.selectedGoal : ''}`}>
              <input
                type="radio"
                name="profile-goal"
                checked={goals.includes(goal.id)}
                onChange={() => selectGoal(goal.id)}
              />
              <img className={styles.goalIcon} src={goal.iconSrc} alt="" aria-hidden="true" />
              <span>{t(`profileGoal.${goal.id}`)}</span>
              <b aria-hidden="true">✓</b>
            </label>
          ))}</div>
        </fieldset>

        {statusMessage && (
          <p className={styles.status} role="alert" aria-live="polite">
            {statusMessage}
          </p>
        )}

        <Button
          type="submit"
          fullWidth
          disabled={!nickname.trim() || goals.length === 0 || isSubmitting}
          isLoading={isSubmitting}
        >
          {t('onboarding.create')}
        </Button>
      </AuthPanelShell>
    </section>
  )
}

export default ProfileSetupPage
