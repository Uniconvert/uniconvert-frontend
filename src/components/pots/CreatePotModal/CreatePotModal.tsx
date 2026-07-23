import { useState } from 'react'
import Button from '@/components/common/Button/Button'
import type { CreatePotInput } from '@/types/pot'
import { formatCurrencyAmount } from '@/utils/currency'
import styles from './CreatePotModal.module.css'

const iconChoices = ['🚌', '🍔', '✈️', '🎓', '🏠', '🛍️', '🐷']

interface CreatePotModalProps {
  isSaving: boolean
  onClose: () => void
  onSubmit: (input: CreatePotInput) => void
  maximumTargetAmount: number
  currency: string
}

function CreatePotModal({ isSaving, onClose, onSubmit, maximumTargetAmount, currency }: CreatePotModalProps) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('🍔')
  const [targetAmount, setTargetAmount] = useState(() => Math.min(500_000, maximumTargetAmount))

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    onSubmit({
      name: name.trim(),
      icon,
      imageSrc: '/assets/illustrations/wallet.png',
      targetAmount,
      savedAmount: 0,
      monthlyContribution: 0,
      autoSavingRate: 0,
      autoSavingEnabled: false,
    })
  }

  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="create-pot-title">
        <header>
          <h2 id="create-pot-title">새로운 Pots 만들기</h2>
          <button type="button" onClick={onClose} aria-label="닫기">×</button>
        </header>

        <form onSubmit={submit}>
          <label>
            <span>1. Pots 이름</span>
            <span className={styles.nameInputRow}><i><img src="/assets/icons/pots/pot-wallet.png" alt="" aria-hidden="true" /></i><input value={name} maxLength={30} placeholder="예) 유럽 여행, 비상금, 노트북 구매 등" onChange={(event) => setName(event.target.value)} required /></span>
          </label>

          <div className={styles.targetField}>
            <div><strong>2. 목표 금액</strong><output>{formatCurrencyAmount(targetAmount, currency)}</output></div>
            <input type="range" min="0" max={maximumTargetAmount} step="10000" value={targetAmount} aria-label="목표 금액" onChange={(event) => setTargetAmount(Number(event.target.value))} />
            <small><span>{formatCurrencyAmount(0, currency)}</span><span>{formatCurrencyAmount(maximumTargetAmount, currency)}</span></small>
          </div>

          <fieldset className={styles.iconChoices}>
            <legend>3. 대표 카테고리</legend>
            <div>{iconChoices.map((choice) => (
              <button key={choice} type="button" className={choice === icon ? styles.selectedIcon : ''} aria-pressed={choice === icon} onClick={() => setIcon(choice)}>{choice}</button>
            ))}</div>
          </fieldset>

          <div className={styles.actions}>
            <Button type="button" variant="outline" onClick={onClose}>취소</Button>
            <Button type="submit" isLoading={isSaving} disabled={!name.trim() || targetAmount <= 0}>Pot 만들기</Button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default CreatePotModal
