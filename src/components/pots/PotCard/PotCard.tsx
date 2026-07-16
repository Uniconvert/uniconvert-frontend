import styles from './PotCard.module.css'

interface Pot { name: string; icon: string; imageSrc: string; targetAmount: number; savedAmount: number }
interface PotCardProps { pot: Pot }

const formatWon = (amount: number) => `₩ ${amount.toLocaleString('ko-KR')}`

function PotCard({ pot }: PotCardProps) {
  const progress = Math.round((pot.savedAmount / pot.targetAmount) * 100)
  const remainingAmount = pot.targetAmount - pot.savedAmount

  return (
    <article className={styles.card}>
      <div className={styles.content}>
        <img className={styles.tripThumbnail} src={pot.imageSrc} alt={`${pot.name} 이미지`} />
        <div className={styles.goalDetails}>
          <h2>{pot.name} <span aria-hidden="true">{pot.icon}</span></h2>
          <span className={styles.label}>목표 금액</span>
          <strong>{formatWon(pot.targetAmount)}</strong>
        </div>
        <div className={styles.progressDetails}>
          <span className={styles.label}>현재 모인 금액</span>
          <div className={styles.progressHeading}>
            <strong>{formatWon(pot.savedAmount)}</strong>
            <b>{progress}%</b>
          </div>
          <span className={styles.progressTrack} role="progressbar" aria-label={`${pot.name} 달성률`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
            <span style={{ width: `${progress}%` }} />
          </span>
          <p>{formatWon(remainingAmount)} 남음</p>
        </div>
      </div>
      <div className={styles.actions}>
        <button className={styles.addButton} type="button"><span aria-hidden="true">＋</span> 금액 추가</button>
        <button type="button"><span aria-hidden="true">⟳</span> 자동 적립 설정</button>
      </div>
    </article>
  )
}

export default PotCard
