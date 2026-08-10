import styles from './PotCard.module.css'
import { formatCurrencyAmount } from '@/utils/currency'
import { findPotCategory } from '@/constants/potCategoryOptions'
import { findPotRepresentativeImage } from '@/constants/potRepresentativeImages'
import { useI18n } from '@/i18n/I18nContext'

interface Pot { name: string; icon: string; representativeImageKey: string; imageSrc: string; targetAmount: number; savedAmount: number; completedAt?: string }
interface PotCardProps {
  pot: Pot
  onAddAmount: () => void
  onEdit: () => void
  onDelete: () => void
  currency: string
}

function PotCard({ pot, onAddAmount, onEdit, onDelete, currency }: PotCardProps) {
  const { t } = useI18n()
  const potCategory = findPotCategory(pot.icon)
  const representativeImage = findPotRepresentativeImage(pot.representativeImageKey)
  const useNativeImageSize = representativeImage
    ? representativeImage.width < 140 || representativeImage.height < 178
    : false
  const progress = Math.min(Math.round((pot.savedAmount / pot.targetAmount) * 100), 100)
  const remainingAmount = Math.max(pot.targetAmount - pot.savedAmount, 0)
  const isCompleted = progress >= 100

  return (
    <article className={`${styles.card} ${isCompleted ? styles.completed : ''}`}>
      <div className={styles.content}>
        <span className={styles.tripThumbnailFrame}>
          <img
            className={`${styles.tripThumbnail} ${useNativeImageSize ? styles.nativeResolutionImage : ''}`}
            src={pot.imageSrc}
            alt={pot.name}
            width={representativeImage?.width}
            height={representativeImage?.height}
          />
        </span>
        <div className={styles.goalDetails}>
          <h2>{pot.name} <span aria-hidden="true">{potCategory ? <img src={potCategory.iconSrc} alt="" /> : pot.icon}</span></h2>
          <span className={styles.label}>{t('pots.target')}</span>
          <strong>{formatCurrencyAmount(pot.targetAmount, currency)}</strong>
        </div>
        <div className={styles.progressDetails}>
          <span className={styles.label}>{t('pots.saved')}</span>
          <div className={styles.progressHeading}>
            <strong>{formatCurrencyAmount(pot.savedAmount, currency)}</strong>
            <b>{progress}%</b>
          </div>
          <span className={styles.progressTrack} role="progressbar" aria-label={`${pot.name} 달성률`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
            <span style={{ width: `${progress}%` }} />
          </span>
          {isCompleted
            ? <p className={styles.completedText}>목표 달성일: {pot.completedAt?.replaceAll('-', '.') ?? new Date().toISOString().slice(0, 10).replaceAll('-', '.')} <b>◷ 완료</b></p>
            : <p>{t('pots.remaining', { amount: formatCurrencyAmount(remainingAmount, currency) })}</p>}
        </div>
      </div>
      <div className={styles.actions}>
        <button className={styles.addButton} type="button" onClick={onAddAmount} disabled={isCompleted}><span aria-hidden="true">＋</span> {t('pots.addAmount')}</button>
        <span className={styles.actionSpacer} />
        <button className={styles.iconButton} type="button" onClick={onEdit} aria-label={`${pot.name} 수정`}><img src="/assets/icons/actions/action-edit.png" alt="" aria-hidden="true" /></button>
        <button className={`${styles.iconButton} ${styles.deleteButton}`} type="button" onClick={onDelete} aria-label={`${pot.name} 삭제`}><img src="/assets/icons/actions/action-delete.png" alt="" aria-hidden="true" /></button>
      </div>
    </article>
  )
}

export default PotCard
