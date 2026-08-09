import styles from './BudgetAllocationSummary.module.css'
import { formatCurrencyAmount } from '@/utils/currency'

interface BudgetAllocationSummaryProps {
  totalAssets: number
  allocatedAmount: number
  availableAmount: number
  currency: string
}

function FlowArrow() {
  return (
    <svg className={styles.arrow} viewBox="0 0 36 36" aria-hidden="true">
      <path d="m8 8 10 10L8 28M18 8l10 10-10 10" />
    </svg>
  )
}

function BudgetAllocationSummary({ totalAssets, allocatedAmount, availableAmount, currency }: BudgetAllocationSummaryProps) {
  const allocatedRate = totalAssets > 0 ? Math.round((allocatedAmount / totalAssets) * 1000) / 10 : 0
  const availableRate = totalAssets > 0 ? Math.round((availableAmount / totalAssets) * 1000) / 10 : 0
  const isOverAllocated = allocatedAmount > totalAssets

  return (
    <section className={styles.summary} aria-label="월 예산 배분 현황">
      <div className={`${styles.metric} ${styles.budgetMetric}`}>
        <span className={styles.walletIcon}><img src="/assets/icons/pots/pot-wallet.png" alt="" aria-hidden="true" /></span>
        <div>
          <span className={styles.label}>총 보유 자산</span>
          <strong>{formatCurrencyAmount(totalAssets, currency)}</strong>
        </div>
      </div>
      <FlowArrow />
      <div className={`${styles.metric} ${isOverAllocated ? styles.overAllocated : ''}`}>
        <span className={styles.label}>Pots에 배정된 금액</span>
        <strong>{formatCurrencyAmount(allocatedAmount, currency)} <small>({allocatedRate}%)</small></strong>
        <span className={styles.track} aria-hidden="true"><span style={{ width: `${Math.min(allocatedRate, 100)}%` }} /></span>
      </div>
      <FlowArrow />
      <div className={styles.metric}>
        <span className={styles.label}>사용 가능 금액</span>
        <strong>{formatCurrencyAmount(availableAmount, currency)} <small>({availableRate}%)</small></strong>
        <span className={`${styles.track} ${styles.availableTrack}`} aria-hidden="true"><span style={{ width: `${availableRate}%` }} /></span>
      </div>
    </section>
  )
}

export default BudgetAllocationSummary
