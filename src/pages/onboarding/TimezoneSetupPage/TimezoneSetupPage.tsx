import { useState } from 'react'
import { useNavigate } from 'react-router'
import Button from '@/components/common/Button/Button'
import { updateOnboardingSettings } from '@/auth/session'
import { ROUTE_PATHS } from '@/routes/routePaths'
import { getBrowserTimeZone } from '@/utils/timezone'
import styles from './TimezoneSetupPage.module.css'

type TimezoneInfo = {
  flag?: string
  flagSrc?: string
  location: string
}

const timezoneLabels: Record<string, TimezoneInfo> = {
  'Asia/Seoul': { flagSrc: '/assets/icons/currencies/currency-krw.png', location: '서울, 대한민국' },
  'Asia/Tokyo': { flag: '🇯🇵', location: '도쿄, 일본' },
  'America/New_York': { flag: '🇺🇸', location: '뉴욕, 미국' },
  'Europe/London': { flag: '🇬🇧', location: '런던, 영국' },
}

function getGmtOffset(timeZone: string) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' }).formatToParts(new Date())
    return parts.find((part) => part.type === 'timeZoneName')?.value.replace('GMT', 'GMT') ?? 'GMT'
  } catch {
    return 'GMT'
  }
}

function TimezoneSetupPage() {
  const navigate = useNavigate()
  const [timeZone] = useState(getBrowserTimeZone)
  const timezoneInfo = timezoneLabels[timeZone] ?? { flag: '🌐', location: timeZone.replaceAll('_', ' ') }
  const gmtOffset = getGmtOffset(timeZone)

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    sessionStorage.setItem('uniconvert.timeZone', timeZone)
    updateOnboardingSettings({ timeZone })
    navigate(ROUTE_PATHS.onboardingProfile)
  }

  return (
    <section className={styles.page} aria-labelledby="timezone-title">
      <img className={styles.coinDecoration} src="/assets/icons/login_coin.png" alt="" aria-hidden="true" />
      <img className={styles.exchangeDecoration} src="/assets/icons/login_exchange.png" alt="" aria-hidden="true" />
      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.progress} aria-label="온보딩 4단계 중 4단계"><span /><span /><span /><span /></div>
        <h1 id="timezone-title">시간대를 설정해주세요</h1>
        <p className={styles.description}>정확한 시간 설정으로 나의 자산을 더 확실하게 관리할 수 있어요.</p>

        <h2>현재 위치 기준 시간대</h2>
        <div className={styles.timezoneCard}>
          <span className={styles.flag} aria-hidden="true">
            {timezoneInfo.flagSrc
              ? <img src={timezoneInfo.flagSrc} alt="" />
              : timezoneInfo.flag}
          </span>
          <div><strong>({gmtOffset}) {timezoneInfo.location}</strong><span>{timeZone}</span></div>
        </div>

        <div className={styles.help}>
          <strong>ⓘ 도움말</strong>
          <p>Uniconvert는 실시간 환율을 기준으로 자산을 관리합니다. 정확한 시간대를 설정해야 환율 업데이트와 자산 내역이 명확하게 반영됩니다.</p>
        </div>
        <Button type="submit" fullWidth>프로필 생성하기</Button>
      </form>
    </section>
  )
}

export default TimezoneSetupPage
