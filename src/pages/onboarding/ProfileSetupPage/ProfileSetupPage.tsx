import { useState } from 'react'
import { useNavigate } from 'react-router'
import AuthPanelShell from '@/components/auth/AuthPanelShell/AuthPanelShell'
import Button from '@/components/common/Button/Button'
import { ensureMockOnboardingSession, getOnboardingSettings, updateOnboardingSettings, updateSessionUser } from '@/auth/session'
import { ROUTE_PATHS } from '@/routes/routePaths'
import styles from './ProfileSetupPage.module.css'

function ProfileSetupPage() {
  const navigate = useNavigate()
  const [nickname, setNickname] = useState('')
  const [previewSrc, setPreviewSrc] = useState('')
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

  const handleProfileImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') setPreviewSrc(reader.result)
    })
    reader.readAsDataURL(file)
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    sessionStorage.setItem('uniconvert.profileGoals', JSON.stringify(goals))
    ensureMockOnboardingSession()
    updateOnboardingSettings({ profileGoals: goals })
    updateSessionUser({
      nickname: nickname.trim(),
      isOnboardingCompleted: true,
      ...(previewSrc ? { profileImage: previewSrc } : {}),
    })
    // TODO: Swagger 연동 시 프로필 생성 요청 성공 후 홈으로 이동합니다.
    navigate(ROUTE_PATHS.home)
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
          <label className={styles.changeAvatar}>
            <input type="file" accept="image/*" onChange={handleProfileImage} />
            <span aria-hidden="true">⇄</span>
            <span className={styles.visuallyHidden}>프로필 이미지 변경</span>
          </label>
        </div>

        <label className={styles.nicknameField}>
          <span>닉네임</span>
          <span className={styles.nicknameInput}>
            <img src="/assets/icons/profile-user.png" alt="" aria-hidden="true" />
            <input value={nickname} placeholder="닉네임을 입력하세요" onChange={(event) => setNickname(event.target.value)} maxLength={20} required />
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

        <Button type="submit" fullWidth disabled={!nickname.trim() || goals.length === 0}>생성하기</Button>
      </AuthPanelShell>
    </section>
  )
}

export default ProfileSetupPage
