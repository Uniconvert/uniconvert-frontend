import { useState } from 'react'
import { useNavigate } from 'react-router'
import Button from '@/components/common/Button/Button'
import CurrencySelection, { type CurrencyOption } from '@/components/onboarding/CurrencySelection/CurrencySelection'
import { ROUTE_PATHS } from '@/routes/routePaths'
import styles from '../CurrencySetupPage.module.css'

const currencies: CurrencyOption[] = [
  { code: 'KRW', name: '대한민국 원', symbol: '₩' },
  { code: 'USD', name: '미국 달러', symbol: '$' },
  { code: 'EUR', name: '유로', symbol: '€' },
  { code: 'JPY', name: '일본 엔', symbol: '¥' },
  { code: 'CNY', name: '중국 위안', symbol: '¥' },
]

function BaseCurrencyPage() {
  const navigate = useNavigate()
  const [selectedCodes, setSelectedCodes] = useState<string[]>([])

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const selectedCurrency = selectedCodes[0]
    if (!selectedCurrency) return

    sessionStorage.setItem('uniconvert.baseCurrency', selectedCurrency)
    // TODO: Swagger 확정 후 선택한 기본 통화 저장 API를 연결합니다.
    navigate(ROUTE_PATHS.onboardingLocalCurrencies)
  }

  return (
    <section className={styles.page} aria-labelledby="base-currency-title">
      <img className={styles.coinDecoration} src="/assets/icons/login_coin.png" alt="" aria-hidden="true" />
      <img className={styles.exchangeDecoration} src="/assets/icons/login_exchange.png" alt="" aria-hidden="true" />
      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.progress} aria-label="온보딩 3단계 중 1단계">
          <span className={styles.active} /><span /><span />
        </div>
        <h1 id="base-currency-title">기본 통화를 선택하세요</h1>
        <p className={styles.description}>예산을 관리할 기준 통화를 선택해주세요.</p>
        <CurrencySelection currencies={currencies} selectedCodes={selectedCodes} selectionMode="single" onChange={setSelectedCodes} />
        <Button className={styles.nextButton} type="submit" fullWidth disabled={selectedCodes.length === 0}>다음</Button>
      </form>
    </section>
  )
}

export default BaseCurrencyPage
