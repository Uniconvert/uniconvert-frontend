import { useState } from 'react'
import { useNavigate } from 'react-router'
import { isUsingMockOnboardingApi, saveOnboarding } from '@/api/onboarding'
import { updateMyProfile } from '@/api/users'
import AuthPanelShell from '@/components/auth/AuthPanelShell/AuthPanelShell'
import Button from '@/components/common/Button/Button'
import { ensureMockOnboardingSession, getOnboardingSettings, updateOnboardingSettings, updateSessionUser } from '@/auth/session'
import { ROUTE_PATHS } from '@/routes/routePaths'
import styles from './ProfileSetupPage.module.css'

const PROFILE_IMAGE_OPTIONS = [
  '/assets/profiles/profile-827.png',
  '/assets/profiles/profile-941.png',
  '/assets/profiles/profile-942.png',
  '/assets/profiles/profile-943.png',
  '/assets/profiles/profile-944.png',
  '/assets/profiles/profile-945.png',
]

const getRandomProfileImage = (currentImage = '') => {
  const candidates = PROFILE_IMAGE_OPTIONS.filter((imageSrc) => imageSrc !== currentImage)
  return candidates[Math.floor(Math.random() * candidates.length)] ?? PROFILE_IMAGE_OPTIONS[0]
}

function ProfileSetupPage() {
  const navigate = useNavigate()
  const [nickname, setNickname] = useState('')
  const [previewSrc, setPreviewSrc] = useState(() => getRandomProfileImage())
  const [statusMessage, setStatusMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [goals, setGoals] = useState<string[]>(() => {
    const savedGoals = getOnboardingSettings().profileGoals ?? []
    return savedGoals.length > 0 ? [savedGoals[0]] : []
  })

  const goalOptions = [
    { id: 'travel', iconSrc: '/assets/images/goals/goal-travel.png', label: '여행, 취미' },
    { id: 'saving', iconSrc: '/assets/images/goals/goal-saving.png', label: '저축' },
    { id: 'education', iconSrc: '/assets/images/goals/goal-education.png', label: '학업비' },
  ]

  const selectGoal = (goalId: string) => setGoals([goalId])

  const handleShuffleProfileImage = () => {
    setPreviewSrc((currentImage) => getRandomProfileImage(currentImage))
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

    try {
      if (isUsingMockOnboardingApi) {
        ensureMockOnboardingSession()
      } else {
        // 닉네임은 온보딩 완료 요청과 분리된 사용자 API로 저장합니다.
        await updateMyProfile(
          { nickname: normalizedNickname },
          { useMock: false },
        )
      }

      const onboarding = await saveOnboarding(
        {
          homeCurrencyCode,
          localCurrencyCode,
          monthlyLimitHome,
          timezone,
        },
        { useMock: isUsingMockOnboardingApi },
      )

      if (!onboarding.onboardingCompleted) {
        throw new Error('온보딩 완료 상태를 확인하지 못했습니다. 다시 시도해 주세요.')
      }

      // 목표와 기본 프로필 이미지는 대응 API가 생길 때까지 브라우저에서만 사용합니다.
      sessionStorage.setItem('uniconvert.profileGoals', JSON.stringify(goals))
      updateOnboardingSettings({ profileGoals: goals })
      updateSessionUser({
        nickname: normalizedNickname,
        isOnboardingCompleted: true,
        ...(previewSrc ? { profileImage: previewSrc } : {}),
      })
      navigate(ROUTE_PATHS.home)
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : '온보딩 정보를 저장하지 못했습니다. 다시 시도해 주세요.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className={styles.page} aria-labelledby="profile-title">
      <img className={styles.coinDecoration} src="/assets/icons/login_coin.png" alt="" aria-hidden="true" />
      <img className={styles.exchangeDecoration} src="/assets/icons/login_exchange.png" alt="" aria-hidden="true" />

      <AuthPanelShell
        as="form"
        width="47.5rem"
        height="58.375rem"
        className={styles.card}
        ariaLabelledBy="profile-title"
        onSubmit={handleSubmit}
      >
        <div className={styles.headingRow}><h1 id="profile-title">프로필을 설정해볼까요?</h1><p>더 나에게 맞는 서비스를 위해 정보를 입력해주세요</p></div>

        <div className={styles.avatarArea}>
          <div className={styles.avatar} aria-label={previewSrc ? undefined : '선택된 프로필 이미지 없음'}>
            {previewSrc ? <img src={previewSrc} alt="선택한 프로필" /> : <span aria-hidden="true">＋</span>}
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
          <span>닉네임</span>
          <span className={styles.nicknameInput}>
            <img src="/assets/icons/profile-user.png" alt="" aria-hidden="true" />
            <input value={nickname} placeholder="닉네임을 입력하세요" onChange={(event) => { setNickname(event.target.value); setStatusMessage('') }} maxLength={20} required />
          </span>
        </label>

        <fieldset className={styles.goals}>
          <legend>내가 가장 관리하고 싶은 목표는 무엇인가요?</legend>
          <div>{goalOptions.map((goal) => (
            <label key={goal.id} className={`${styles.goalOption} ${goals.includes(goal.id) ? styles.selectedGoal : ''}`}>
              <input
                type="radio"
                name="profile-goal"
                checked={goals.includes(goal.id)}
                onChange={() => selectGoal(goal.id)}
              />
              <img className={styles.goalIcon} src={goal.iconSrc} alt="" aria-hidden="true" />
              <span>{goal.label}</span>
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
          생성하기
        </Button>
      </AuthPanelShell>
    </section>
  )
}

export default ProfileSetupPage
