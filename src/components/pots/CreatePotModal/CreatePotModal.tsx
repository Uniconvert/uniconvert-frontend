import { useState } from 'react'
import Button from '@/components/common/Button/Button'
import ModalShell from '@/components/common/ModalShell/ModalShell'
import { findPotCategory, POT_CATEGORY_OPTIONS } from '@/constants/potCategoryOptions'
import {
  getPotRepresentativeImageSrc,
  POT_REPRESENTATIVE_IMAGE_OPTIONS,
  type PotRepresentativeImageKey,
} from '@/constants/potRepresentativeImages'
import type { CreatePotInput } from '@/types/pot'
import { formatCurrencyAmount } from '@/utils/currency'
import styles from './CreatePotModal.module.css'
import { useI18n } from '@/i18n/I18nContext'

interface CreatePotModalProps {
  isSaving: boolean
  onClose: () => void
  onSubmit: (input: CreatePotInput) => void
  maximumTargetAmount: number
  currency: string
}

function CreatePotModal({ isSaving, onClose, onSubmit, maximumTargetAmount, currency }: CreatePotModalProps) {
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('food')
  const [representativeImageKey, setRepresentativeImageKey] = useState<PotRepresentativeImageKey>(
    POT_REPRESENTATIVE_IMAGE_OPTIONS[0].key,
  )
  const [targetAmount, setTargetAmount] = useState(() => Math.min(500_000, maximumTargetAmount))
  const selectedCategory = findPotCategory(icon) ?? POT_CATEGORY_OPTIONS[0]
  const targetRate = maximumTargetAmount > 0 ? Math.min((targetAmount / maximumTargetAmount) * 100, 100) : 0
  const tooltipRate = Math.min(Math.max(targetRate, 8), 92)

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    onSubmit({
      name: name.trim(),
      icon,
      representativeImageKey,
      imageSrc: getPotRepresentativeImageSrc(representativeImageKey),
      targetAmount,
      savedAmount: 0,
      monthlyContribution: 0,
      autoSavingRate: 0,
      autoSavingEnabled: false,
    })
  }

  return (
    <ModalShell
      title={t('pots.create')}
      titleId="create-pot-title"
      closeLabel={t('pots.createClose')}
      width="43rem"
      bodyClassName={styles.modalBody}
      onClose={onClose}
    >
      <form onSubmit={submit}>
          <label>
            <span>{t('pots.editName')}</span>
            <span className={styles.nameInputRow}><i><img src={selectedCategory.iconSrc} alt="" aria-hidden="true" /></i><input value={name} maxLength={30} placeholder={t('pots.namePlaceholder')} onChange={(event) => setName(event.target.value)} required /></span>
          </label>

          <div className={styles.targetField}>
            <strong>{t('pots.editTarget')}</strong>
            <p>{t('pots.targetDescription')}</p>
            <div className={styles.rangeWrap}>
              <output style={{ left: `${tooltipRate}%` }}>{formatCurrencyAmount(targetAmount, currency)}</output>
              <input
                type="range"
                min="0"
                max={maximumTargetAmount}
                step="10000"
                value={targetAmount}
                aria-label={t('pots.targetAmountLabel')}
                style={{ background: `linear-gradient(to right, var(--color-primary) 0 ${targetRate}%, #e5e5e5 ${targetRate}% 100%)` }}
                onChange={(event) => setTargetAmount(Number(event.target.value))}
              />
            </div>
            <small><span>{formatCurrencyAmount(0, currency)}</span><span>{formatCurrencyAmount(maximumTargetAmount, currency)}</span></small>
          </div>

          <fieldset className={styles.imageChoices}>
            <legend>{t('pots.representativeImage')}</legend>
            <p>{t('pots.imageDescription')}</p>
            <div>{POT_REPRESENTATIVE_IMAGE_OPTIONS.map((option, index) => (
              <button
                key={option.key}
                type="button"
                className={option.key === representativeImageKey ? styles.selectedImage : ''}
                aria-label={t('pots.imageOption', { index: index + 1 })}
                aria-pressed={option.key === representativeImageKey}
                onClick={() => setRepresentativeImageKey(option.key)}
              >
                <img src={option.src} alt="" aria-hidden="true" />
                {option.key === representativeImageKey && <span aria-hidden="true">✓</span>}
              </button>
            ))}</div>
          </fieldset>

          <fieldset className={styles.iconChoices}>
            <legend>{t('pots.category')}</legend>
            <p>{t('pots.categoryDescription')}</p>
            <div>{POT_CATEGORY_OPTIONS.map((choice) => (
              <button key={choice.id} type="button" className={choice.id === icon ? styles.selectedIcon : ''} aria-label={choice.label} aria-pressed={choice.id === icon} onClick={() => setIcon(choice.id)}><img src={choice.iconSrc} alt="" aria-hidden="true" style={{ transform: `scale(${choice.displayScale})` }} /></button>
            ))}</div>
          </fieldset>

          <div className={styles.actions}>
            <Button type="button" variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
            <Button type="submit" isLoading={isSaving} disabled={!name.trim() || targetAmount <= 0}>{t('common.save')}</Button>
          </div>
      </form>
    </ModalShell>
  )
}

export default CreatePotModal
