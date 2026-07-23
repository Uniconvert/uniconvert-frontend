import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ensureMockOnboardingSession, updateOnboardingSettings } from '@/auth/session'
import Button from '@/components/common/Button/Button'
import { ROUTE_PATHS } from '@/routes/routePaths'
import styles from './TermsPage.module.css'

interface AgreementState {
  terms: boolean
  privacy: boolean
  marketing: boolean
}

const initialAgreements: AgreementState = {
  terms: false,
  privacy: false,
  marketing: false,
}

function TermsPage() {
  const navigate = useNavigate()
  const [agreements, setAgreements] = useState(initialAgreements)
  const [errorMessage, setErrorMessage] = useState('')
  const isAllChecked = Object.values(agreements).every(Boolean)
  const areRequiredAgreementsChecked = agreements.terms && agreements.privacy

  const toggleAll = () => {
    const nextValue = !isAllChecked
    setAgreements({ terms: nextValue, privacy: nextValue, marketing: nextValue })
    if (nextValue) setErrorMessage('')
  }

  const toggleAgreement = (key: keyof AgreementState) => {
    setAgreements((current) => ({ ...current, [key]: !current[key] }))
    setErrorMessage('')
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!agreements.terms || !agreements.privacy) {
      setErrorMessage('필수 약관에 모두 동의해주세요.')
      return
    }

    ensureMockOnboardingSession()
    sessionStorage.setItem('uniconvert.termsAgreements', JSON.stringify(agreements))
    updateOnboardingSettings({ termsAgreements: agreements })
    // TODO: Swagger 확정 후 약관 동의 상태 저장 API를 연결합니다.
    navigate(ROUTE_PATHS.onboardingBaseCurrency)
  }

  return (
    <section className={styles.page} aria-labelledby="terms-title">
      <img className={styles.coinDecoration} src="/assets/icons/login_coin.png" alt="" aria-hidden="true" />
      <img className={styles.exchangeDecoration} src="/assets/icons/login_exchange.png" alt="" aria-hidden="true" />

      <form className={styles.card} onSubmit={handleSubmit}>
        <h1 id="terms-title">약관 동의</h1>
        <p className={styles.description}>서비스 이용을 위해 약관에 동의해주세요</p>

        <label className={styles.allAgreement}>
          <input type="checkbox" checked={isAllChecked} onChange={toggleAll} />
          <span>전체 동의</span>
        </label>

        <div className={styles.divider} />

        <div className={styles.agreementList}>
          <div className={styles.agreementRow}>
            <label>
              <input type="checkbox" checked={agreements.terms} onChange={() => toggleAgreement('terms')} />
              <span>이용약관 동의 <b>(필수)</b></span>
            </label>
            {/* TODO: 기획에서 Notion 약관 URL을 전달받으면 링크로 교체합니다. */}
            <button type="button" title="약관 링크 연결 예정">전문보기</button>
          </div>
          <div className={styles.agreementRow}>
            <label>
              <input type="checkbox" checked={agreements.privacy} onChange={() => toggleAgreement('privacy')} />
              <span>개인정보처리방침 동의 <b>(필수)</b></span>
            </label>
            {/* TODO: 기획에서 Notion 개인정보처리방침 URL을 전달받으면 링크로 교체합니다. */}
            <button type="button" title="약관 링크 연결 예정">전문보기</button>
          </div>
          <div className={styles.agreementRow}>
            <label>
              <input type="checkbox" checked={agreements.marketing} onChange={() => toggleAgreement('marketing')} />
              <span>마케팅 수신 동의 <em>(선택)</em></span>
            </label>
          </div>
        </div>

        <p className={styles.error} role="alert" aria-live="polite">{errorMessage}</p>
        <Button className={styles.confirmButton} type="submit" fullWidth disabled={!areRequiredAgreementsChecked}>확인</Button>
      </form>
    </section>
  )
}

export default TermsPage
