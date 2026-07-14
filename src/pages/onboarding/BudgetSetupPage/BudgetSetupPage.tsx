import { useState } from 'react'
import { useNavigate } from 'react-router'
import Button from '@/components/common/Button/Button'
import { ROUTE_PATHS } from '@/routes/routePaths'
import styles from './BudgetSetupPage.module.css'

const currencyDetails: Record<string, { name: string; symbol: string; locale: string }> = {
  KRW: { name: '대한민국 원', symbol: '₩', locale: 'ko-KR' },
  USD: { name: '미국 달러', symbol: '$', locale: 'en-US' },
  EUR: { name: '유로', symbol: '€', locale: 'de-DE' },
  JPY: { name: '일본 엔', symbol: '¥', locale: 'ja-JP' },
  CNY: { name: '중국 위안', symbol: '¥', locale: 'zh-CN' },
}

function BudgetSetupPage() {
  const navigate = useNavigate()
  const [budget, setBudget] = useState('')
  const baseCurrencyCode = sessionStorage.getItem('uniconvert.baseCurrency') ?? ''
  const baseCurrency = currencyDetails[baseCurrencyCode]
  const formattedBudget = budget && baseCurrency
    ? Number(budget).toLocaleString(baseCurrency.locale)
    : budget

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    navigate(ROUTE_PATHS.onboardingProfile)
  }

  return (
    <section className={styles.page} aria-labelledby="budget-title">
      <img className={styles.coinDecoration} src="/assets/icons/login_coin.png" alt="" aria-hidden="true" />
      <img className={styles.exchangeDecoration} src="/assets/icons/login_exchange.png" alt="" aria-hidden="true" />
      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.progress} aria-label="온보딩 3단계 중 3단계">
          <span /><span /><span />
        </div>
        <h1 id="budget-title">이번 달 예산을 설정하세요</h1>
        <p className={styles.description}>
          {baseCurrency
            ? `기준 통화(${baseCurrencyCode} · ${baseCurrency.name})를 기준으로 예산을 설정합니다.`
            : '앞에서 선택한 기준 통화로 예산을 설정합니다.'}
        </p>
        <label className={styles.budgetLabel} htmlFor="monthly-budget">월 예산</label>
        <p className={styles.notice}>예산을 초과하면 알려드릴게요</p>
        <div className={styles.amountField}>
          <span>{baseCurrency?.symbol ?? ''}</span>
          <input
            id="monthly-budget"
            value={formattedBudget}
            inputMode="numeric"
            placeholder="예산 금액을 입력하세요"
            onChange={(event) => setBudget(event.target.value.replace(/\D/g, ''))}
          />
        </div>
        <div className={styles.help}>
          <strong>ⓘ 도움말</strong>
          <p>고정 지출과 변동 지출을 구분해 예산을 설정하면 더욱 효율적으로 지출을 관리할 수 있습니다.</p>
        </div>
        <Button type="submit" fullWidth disabled={!baseCurrency || Number(budget) <= 0}>프로필 생성하기</Button>
      </form>
    </section>
  )
}

export default BudgetSetupPage
