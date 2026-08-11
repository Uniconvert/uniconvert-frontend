import { useState } from 'react'
import { useNavigate } from 'react-router'
import OnboardingPanel from '@/components/onboarding/OnboardingPanel/OnboardingPanel'
import { getOnboardingSettings, updateOnboardingSettings } from '@/auth/session'
import { ROUTE_PATHS } from '@/routes/routePaths'
import styles from './BudgetSetupPage.module.css'
import { useI18n } from '@/i18n/I18nContext'

const currencyDetails: Record<string, { name: string; symbol: string; locale: string }> = {
  KRW: { name: '대한민국 원', symbol: '₩', locale: 'ko-KR' },
  USD: { name: '미국 달러', symbol: '$', locale: 'en-US' },
  EUR: { name: '유로', symbol: '€', locale: 'de-DE' },
  JPY: { name: '일본 엔', symbol: '¥', locale: 'ja-JP' },
  CNY: { name: '중국 위안', symbol: '¥', locale: 'zh-CN' },
}

function BudgetSetupPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const onboardingSettings = getOnboardingSettings()
  const [budget, setBudget] = useState(() => onboardingSettings.monthlyBudget ? String(onboardingSettings.monthlyBudget) : '')
  const baseCurrencyCode = onboardingSettings.baseCurrency ?? sessionStorage.getItem('uniconvert.baseCurrency') ?? ''
  const baseCurrency = currencyDetails[baseCurrencyCode]
  const formattedBudget = budget && baseCurrency
    ? Number(budget).toLocaleString(baseCurrency.locale)
    : budget

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    sessionStorage.setItem('uniconvert.monthlyBudget', budget)
    updateOnboardingSettings({ monthlyBudget: Number(budget) })
    navigate(ROUTE_PATHS.onboardingTimezone)
  }

  return (
    <section className={styles.page}>
      <img className={styles.coinDecoration} src="/assets/icons/login_coin.png" alt="" aria-hidden="true" />
      <img className={styles.exchangeDecoration} src="/assets/icons/login_exchange.png" alt="" aria-hidden="true" />
      <OnboardingPanel
        titleId="budget-title"
        title={t('onboarding.budgetTitle')}
        description={t('onboarding.budgetDescription')}
        currentStep={3}
        onSubmit={handleSubmit}
        submitDisabled={!baseCurrency || Number(budget) <= 0}
        submitLabel={t('onboarding.timezoneNext')}
        height="42.5rem"
        bottomAligned
      >
        <label className={styles.budgetLabel} htmlFor="monthly-budget">{t('onboarding.monthlyBudget')}</label>
        <p className={styles.notice}>{t('onboarding.overBudgetNotice')}</p>
        <div className={styles.amountField}>
          <span>{baseCurrency?.symbol ?? ''}</span>
          <input
            id="monthly-budget"
            value={formattedBudget}
            inputMode="numeric"
            placeholder={t('onboarding.budgetPlaceholder')}
            onChange={(event) => setBudget(event.target.value.replace(/\D/g, ''))}
          />
        </div>
        <div className={styles.help}>
          <strong>{t('onboarding.help')}</strong>
          <p>{t('onboarding.budgetHelp')}</p>
        </div>
      </OnboardingPanel>
    </section>
  )
}

export default BudgetSetupPage
