import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import CurrencySelection from '@/components/onboarding/CurrencySelection/CurrencySelection'
import type { CurrencyOption } from '@/components/onboarding/CurrencySelection/CurrencySelection'
import OnboardingPanel from '@/components/onboarding/OnboardingPanel/OnboardingPanel'
import { getOnboardingSettings, updateOnboardingSettings } from '@/auth/session'
import { ROUTE_PATHS } from '@/routes/routePaths'
import styles from '../CurrencySetupPage.module.css'
import { getCurrencies } from '@/api/currencies'
import { CURRENCY_OPTIONS } from '@/components/onboarding/CurrencySelection/currencyOptions'
import { useI18n } from '@/i18n/I18nContext'

function LocalCurrenciesPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([...CURRENCY_OPTIONS])
  const [selectedCodes, setSelectedCodes] = useState<string[]>(() => (
    getOnboardingSettings().localCurrencies ?? []
  ).slice(0, 1))

  useEffect(() => {
    let isActive = true
    getCurrencies().then((response) => {
      if (isActive) setCurrencies(response)
    }).catch(() => {
      // 통화 목록 조회가 실패하면 기본 목록을 유지합니다.
    })
    return () => { isActive = false }
  }, [])

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    sessionStorage.setItem('uniconvert.localCurrencies', JSON.stringify(selectedCodes))
    updateOnboardingSettings({ localCurrencies: selectedCodes })
    // 실제 저장은 마지막 프로필 단계의 POST /onboarding에서 한 번에 완료합니다.
    navigate(ROUTE_PATHS.onboardingBudget)
  }

  return (
    <section className={styles.page}>
      <img className={styles.coinDecoration} src="/assets/icons/login_coin.png" alt="" aria-hidden="true" />
      <img className={styles.exchangeDecoration} src="/assets/icons/login_exchange.png" alt="" aria-hidden="true" />
      <OnboardingPanel
        titleId="local-currencies-title"
        title={t('onboarding.localTitle')}
        description={t('onboarding.localDescription')}
        currentStep={2}
        onSubmit={handleSubmit}
        submitDisabled={selectedCodes.length === 0}
        height="49rem"
        compact
      >
        <CurrencySelection currencies={currencies} selectedCodes={selectedCodes} selectionMode="single" onChange={setSelectedCodes} />
      </OnboardingPanel>
    </section>
  )
}

export default LocalCurrenciesPage
