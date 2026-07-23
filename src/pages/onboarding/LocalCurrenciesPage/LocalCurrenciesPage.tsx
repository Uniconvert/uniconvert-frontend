import { useState } from 'react'
import { useNavigate } from 'react-router'
import Button from '@/components/common/Button/Button'
import CurrencySelection, { type CurrencyOption } from '@/components/onboarding/CurrencySelection/CurrencySelection'
import { getOnboardingSettings, updateOnboardingSettings } from '@/auth/session'
import { ROUTE_PATHS } from '@/routes/routePaths'
import styles from '../CurrencySetupPage.module.css'

const currencies: CurrencyOption[] = [
  { code: 'KRW', name: '대한민국 원', symbol: '₩' },
  { code: 'USD', name: '미국 달러', symbol: '$' },
  { code: 'EUR', name: '유로', symbol: '€' },
  { code: 'JPY', name: '일본 엔', symbol: '¥' },
  { code: 'CNY', name: '중국 위안', symbol: '¥' },
]

function LocalCurrenciesPage() {
  const navigate = useNavigate()
  const [selectedCodes, setSelectedCodes] = useState<string[]>(() => getOnboardingSettings().localCurrencies ?? [])

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    sessionStorage.setItem('uniconvert.localCurrencies', JSON.stringify(selectedCodes))
    updateOnboardingSettings({ localCurrencies: selectedCodes })
    // TODO: Swagger 확정 후 선택한 현지 통화 목록 저장 API를 연결합니다.
    navigate(ROUTE_PATHS.onboardingBudget)
  }

  return (
    <section className={styles.page} aria-labelledby="local-currencies-title">
      <img className={styles.coinDecoration} src="/assets/icons/login_coin.png" alt="" aria-hidden="true" />
      <img className={styles.exchangeDecoration} src="/assets/icons/login_exchange.png" alt="" aria-hidden="true" />
      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.progress} aria-label="온보딩 4단계 중 2단계">
          <span className={styles.active} /><span className={styles.active} /><span /><span />
        </div>
        <h1 id="local-currencies-title">현지에서 사용하는 통화를 선택해주세요</h1>
        <p className={styles.description}>자주 사용하는 통화를 여러 개 선택할 수 있습니다.</p>
        <CurrencySelection currencies={currencies} selectedCodes={selectedCodes} selectionMode="multiple" onChange={setSelectedCodes} />
        <Button className={styles.nextButton} type="submit" fullWidth disabled={selectedCodes.length === 0}>다음</Button>
      </form>
    </section>
  )
}

export default LocalCurrenciesPage
