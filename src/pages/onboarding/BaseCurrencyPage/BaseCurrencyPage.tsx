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

function BaseCurrencyPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([...CURRENCY_OPTIONS])
  const [selectedCodes, setSelectedCodes] = useState<string[]>(() => {
    const storedCurrency = getOnboardingSettings().baseCurrency
    return storedCurrency ? [storedCurrency] : []
  })

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
    const selectedCurrency = selectedCodes[0]
    if (!selectedCurrency) return

    sessionStorage.setItem('uniconvert.baseCurrency', selectedCurrency)
    updateOnboardingSettings({ baseCurrency: selectedCurrency })
    // 실제 저장은 마지막 프로필 단계의 POST /onboarding에서 한 번에 완료합니다.
    navigate(ROUTE_PATHS.onboardingLocalCurrencies)
  }

  return (
    <section className={styles.page}>
      <img className={styles.coinDecoration} src="/assets/icons/login_coin.png" alt="" aria-hidden="true" />
      <img className={styles.exchangeDecoration} src="/assets/icons/login_exchange.png" alt="" aria-hidden="true" />
      <OnboardingPanel
        titleId="base-currency-title"
        title={t('onboarding.baseTitle')}
        description={t('onboarding.baseDescription')}
        currentStep={1}
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

export default BaseCurrencyPage
