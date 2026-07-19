import styles from './AutoSavingsCard.module.css'
import { formatCurrencyAmount } from '@/utils/currency'

interface AutoSavingsCardProps { name: string; imageSrc: string; monthlyContribution: number; autoSavingRate: number; currency: string }

function AutoSavingsCard({ name, imageSrc, monthlyContribution, autoSavingRate, currency }: AutoSavingsCardProps) {
  return (
    <section className={styles.card} aria-labelledby="auto-saving-title">
      <h2 id="auto-saving-title">자동 적립 현황</h2>
      <div className={styles.content}>
        <img className={styles.thumbnail} src={imageSrc} alt="" aria-hidden="true" />
        <div className={styles.details}>
          <strong>{name}</strong>
          <span>예산의 {autoSavingRate}%</span>
        </div>
        <p><strong>{formatCurrencyAmount(monthlyContribution, currency)}</strong><span> / 월</span></p>
      </div>
    </section>
  )
}

export default AutoSavingsCard
