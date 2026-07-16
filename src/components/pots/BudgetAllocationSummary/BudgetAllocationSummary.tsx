import styles from './BudgetAllocationSummary.module.css'

interface BudgetAllocationSummaryProps {
  monthlyBudget: number
  allocatedAmount: number
  availableAmount: number
}

const formatWon = (amount: number) => `₩ ${amount.toLocaleString('ko-KR')}`

function WalletIcon() {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true">
      <path d="M8 11.5h22a4 4 0 0 1 4 4V31a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V15.5a4 4 0 0 1 4-4Z" />
      <path d="m8 11.5 18-7v7" />
      <path d="M27 20h9v9h-9a4.5 4.5 0 0 1 0-9Z" />
      <circle cx="28" cy="24.5" r="1.5" />
    </svg>
  )
}

function FlowArrow() {
  return (
    <svg className={styles.arrow} viewBox="0 0 36 36" aria-hidden="true">
      <path d="m8 8 10 10L8 28M18 8l10 10-10 10" />
    </svg>
  )
}

function BudgetAllocationSummary({ monthlyBudget, allocatedAmount, availableAmount }: BudgetAllocationSummaryProps) {
  const allocatedRate = Math.round((allocatedAmount / monthlyBudget) * 1000) / 10
  const availableRate = Math.round((availableAmount / monthlyBudget) * 1000) / 10

  return (
    <section className={styles.summary} aria-label="월 예산 배분 현황">
      <div className={`${styles.metric} ${styles.budgetMetric}`}>
        <span className={styles.walletIcon}><WalletIcon /></span>
        <div>
          <span className={styles.label}>월 예산</span>
          <strong>{formatWon(monthlyBudget)}</strong>
        </div>
      </div>
      <FlowArrow />
      <div className={styles.metric}>
        <span className={styles.label}>Pots에 배정된 금액</span>
        <strong>{formatWon(allocatedAmount)} <small>({allocatedRate}%)</small></strong>
        <span className={styles.track} aria-hidden="true"><span style={{ width: `${allocatedRate}%` }} /></span>
      </div>
      <FlowArrow />
      <div className={styles.metric}>
        <span className={styles.label}>사용 가능 금액</span>
        <strong>{formatWon(availableAmount)} <small>({availableRate}%)</small></strong>
        <span className={`${styles.track} ${styles.availableTrack}`} aria-hidden="true"><span style={{ width: `${availableRate}%` }} /></span>
      </div>
    </section>
  )
}

export default BudgetAllocationSummary
