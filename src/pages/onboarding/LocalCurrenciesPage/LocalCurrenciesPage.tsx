import { useState } from 'react'
import { useNavigate } from 'react-router'
import CurrencySelection from '@/components/onboarding/CurrencySelection/CurrencySelection'
import OnboardingPanel from '@/components/onboarding/OnboardingPanel/OnboardingPanel'
import { getOnboardingSettings, updateOnboardingSettings } from '@/auth/session'
import { ROUTE_PATHS } from '@/routes/routePaths'
import styles from '../CurrencySetupPage.module.css'

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
    <section className={styles.page}>
      <img className={styles.coinDecoration} src="/assets/icons/login_coin.png" alt="" aria-hidden="true" />
      <img className={styles.exchangeDecoration} src="/assets/icons/login_exchange.png" alt="" aria-hidden="true" />
      <OnboardingPanel
        titleId="local-currencies-title"
        title="현지에서 사용하는 통화를 선택해주세요"
        description="자주 사용하는 통화를 여러 개 선택할 수 있습니다."
        currentStep={2}
        onSubmit={handleSubmit}
        submitDisabled={selectedCodes.length === 0}
        height="49rem"
        compact
      >
        <CurrencySelection selectedCodes={selectedCodes} selectionMode="multiple" onChange={setSelectedCodes} />
      </OnboardingPanel>
    </section>
  )
}

export default LocalCurrenciesPage
