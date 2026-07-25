import { useState } from 'react'
import Button from '@/components/common/Button/Button'
import { findPotCategory, POT_CATEGORY_OPTIONS } from '@/constants/potCategoryOptions'
import type { CreatePotInput } from '@/types/pot'
import { formatCurrencyAmount } from '@/utils/currency'
import styles from './CreatePotModal.module.css'

interface CreatePotModalProps {
  isSaving: boolean
  onClose: () => void
  onSubmit: (input: CreatePotInput) => void
  maximumTargetAmount: number
  currency: string
}

function CreatePotModal({ isSaving, onClose, onSubmit, maximumTargetAmount, currency }: CreatePotModalProps) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('food')
  const [targetAmount, setTargetAmount] = useState(() => Math.min(500_000, maximumTargetAmount))
  const selectedCategory = findPotCategory(icon) ?? POT_CATEGORY_OPTIONS[0]
  const targetRate = maximumTargetAmount > 0 ? Math.min((targetAmount / maximumTargetAmount) * 100, 100) : 0
  const tooltipRate = Math.min(Math.max(targetRate, 8), 92)

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
            <span className={styles.nameInputRow}><i><img src={selectedCategory.iconSrc} alt="" aria-hidden="true" /></i><input value={name} maxLength={30} placeholder="예) 유럽 여행, 비상금, 노트북 구매 등" onChange={(event) => setName(event.target.value)} required /></span>
          </label>

          <div className={styles.targetField}>
            <strong>2. 목표 금액</strong>
            <p>이 Pots에 모으고 싶은 목표 금액을 설정해주세요.</p>
            <div className={styles.amountInput}>{formatCurrencyAmount(targetAmount, currency)}</div>
            <div className={styles.rangeWrap}>
              <output style={{ left: `${tooltipRate}%` }}>{formatCurrencyAmount(targetAmount, currency)}</output>
              <input type="range" min="0" max={maximumTargetAmount} step="10000" value={targetAmount} aria-label="목표 금액" onChange={(event) => setTargetAmount(Number(event.target.value))} />
            </div>
            <small><span>{formatCurrencyAmount(0, currency)}</span><span>{formatCurrencyAmount(maximumTargetAmount, currency)}</span></small>
          </div>

          <fieldset className={styles.iconChoices}>
            <legend>4. 대표 카테고리</legend>
            <p>Pots를 더 쉽게 구분할 수 있도록 이미지를 선택해 보세요.</p>
            <div>{POT_CATEGORY_OPTIONS.map((choice) => (
              <button key={choice.id} type="button" className={choice.id === icon ? styles.selectedIcon : ''} aria-label={choice.label} aria-pressed={choice.id === icon} onClick={() => setIcon(choice.id)}><img src={choice.iconSrc} alt="" aria-hidden="true" /></button>
            ))}</div>
          </fieldset>

          <div className={styles.actions}>
            <Button type="button" variant="outline" onClick={onClose}>취소</Button>
            <Button type="submit" isLoading={isSaving} disabled={!name.trim() || targetAmount <= 0}>저장하기</Button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default CreatePotModal
