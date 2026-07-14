import { useState } from 'react'
import { useNavigate } from 'react-router'
import Button from '@/components/common/Button/Button'
import { ROUTE_PATHS } from '@/routes/routePaths'
import styles from './ProfileSetupPage.module.css'

function ProfileSetupPage() {
  const navigate = useNavigate()
  const [nickname, setNickname] = useState('')
  const [previewSrc, setPreviewSrc] = useState('')

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
    // TODO: Swagger 연동 시 프로필 생성 요청 성공 후 홈으로 이동합니다.
    navigate(ROUTE_PATHS.home)
  }

  return (
    <section className={styles.page} aria-labelledby="profile-title">
      <img className={styles.coinDecoration} src="/assets/icons/login_coin.png" alt="" aria-hidden="true" />
      <img className={styles.exchangeDecoration} src="/assets/icons/login_exchange.png" alt="" aria-hidden="true" />

      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.headingRow}>
          <span aria-hidden="true" />
          <h1 id="profile-title">프로필</h1>
          <button type="button" onClick={() => navigate(ROUTE_PATHS.home)}>건너뛰기</button>
        </div>

        <div className={styles.avatarArea}>
          <div className={styles.avatar} aria-label={previewSrc ? undefined : '선택된 프로필 이미지 없음'}>
            {previewSrc ? <img src={previewSrc} alt="선택한 프로필" /> : null}
          </div>
          <label className={styles.changeAvatar}>
            <input type="file" accept="image/*" onChange={handleProfileImage} />
            <span aria-hidden="true">↻</span>
            <span className={styles.visuallyHidden}>프로필 이미지 변경</span>
          </label>
        </div>

        <div className={styles.fields}>
          <label>
            <span>닉네임</span>
            <input value={nickname} placeholder="닉네임을 입력하세요" onChange={(event) => setNickname(event.target.value)} maxLength={20} required />
          </label>
          <label>
            <span>이메일</span>
            <input value="" placeholder="회원가입한 이메일이 표시됩니다" readOnly aria-readonly="true" />
          </label>
        </div>

        <Button type="submit" fullWidth disabled={!nickname.trim()}>생성하기</Button>
      </form>
    </section>
  )
}

export default ProfileSetupPage
