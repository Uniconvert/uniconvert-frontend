import { useState } from 'react'
import { useNavigate } from 'react-router'
import CurrencySelection from '@/components/onboarding/CurrencySelection/CurrencySelection'
import OnboardingPanel from '@/components/onboarding/OnboardingPanel/OnboardingPanel'
import { getOnboardingSettings, updateOnboardingSettings } from '@/auth/session'
import { ROUTE_PATHS } from '@/routes/routePaths'
import styles from '../CurrencySetupPage.module.css'

function BaseCurrencyPage() {
  const navigate = useNavigate()
  const [selectedCodes, setSelectedCodes] = useState<string[]>(() => {
    const storedCurrency = getOnboardingSettings().baseCurrency
    return storedCurrency ? [storedCurrency] : []
  })

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const selectedCurrency = selectedCodes[0]
    if (!selectedCurrency) return

    sessionStorage.setItem('uniconvert.baseCurrency', selectedCurrency)
    updateOnboardingSettings({ baseCurrency: selectedCurrency })
    // TODO: Swagger 확정 후 선택한 기본 통화 저장 API를 연결합니다.
    navigate(ROUTE_PATHS.onboardingLocalCurrencies)
  }

  return (
    <section className={styles.page}>
      <img className={styles.coinDecoration} src="/assets/icons/login_coin.png" alt="" aria-hidden="true" />
      <img className={styles.exchangeDecoration} src="/assets/icons/login_exchange.png" alt="" aria-hidden="true" />
      <OnboardingPanel
        titleId="base-currency-title"
        title="기본 통화를 선택하세요"
        description="예산을 관리할 기준 통화를 선택해주세요."
        currentStep={1}
        onSubmit={handleSubmit}
        submitDisabled={selectedCodes.length === 0}
        height="49rem"
        compact
      >
        <CurrencySelection selectedCodes={selectedCodes} selectionMode="single" onChange={setSelectedCodes} />
      </OnboardingPanel>
    </section>
  )
}

export default BaseCurrencyPage
