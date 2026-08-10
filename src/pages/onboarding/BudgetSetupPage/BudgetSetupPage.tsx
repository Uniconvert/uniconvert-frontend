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
        <p className={styles.notice}>예산을 초과하면 알려드릴게요</p>
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
          <strong>ⓘ 도움말</strong>
          <p>
            이번 달 사용할 금액을 입력해 주세요. 입력한 금액을 기준으로 지출이 기본 통화로 환산되며,
            귀국 항공권, 비상금처럼 따로 모아둘 돈은 Pots에서 분리할 수 있어요.
          </p>
        </div>
      </OnboardingPanel>
    </section>
  )
}

export default BudgetSetupPage
