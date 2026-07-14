import { useState } from 'react'
import Button from '@/components/common/Button/Button'
import type { CreatePotInput } from '@/types/pot'
import styles from './CreatePotModal.module.css'

interface CreatePotModalProps {
  isSaving: boolean
  onClose: () => void
  onSubmit: (input: CreatePotInput) => void
}

function CreatePotModal({ isSaving, onClose, onSubmit }: CreatePotModalProps) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('🎯')
  const [targetAmount, setTargetAmount] = useState('')
  const [savedAmount, setSavedAmount] = useState('')
  const [monthlyContribution, setMonthlyContribution] = useState('')
  const [autoSavingRate, setAutoSavingRate] = useState('')

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    onSubmit({
      name: name.trim(),
      icon: icon.trim() || '🎯',
      imageSrc: '/assets/illustrations/wallet.png',
      targetAmount: Number(targetAmount),
      savedAmount: Number(savedAmount || 0),
      monthlyContribution: Number(monthlyContribution || 0),
      autoSavingRate: Math.min(Number(autoSavingRate || 0), 100),
    })
  }

  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="create-pot-title">
        <header>
          <h2 id="create-pot-title">새로운 Pot 만들기</h2>
          <button type="button" onClick={onClose} aria-label="닫기">×</button>
        </header>

        <form onSubmit={submit}>
          <div className={styles.nameRow}>
            <label className={styles.iconField}>
              <span>아이콘</span>
              <input value={icon} maxLength={4} onChange={(event) => setIcon(event.target.value)} />
            </label>
            <label>
              <span>Pot 이름</span>
              <input value={name} maxLength={30} placeholder="예: 유럽 여행" onChange={(event) => setName(event.target.value)} required />
            </label>
          </div>

          <label>
            <span>목표 금액</span>
            <input value={targetAmount} inputMode="numeric" placeholder="목표 금액을 입력하세요" onChange={(event) => setTargetAmount(event.target.value.replace(/\D/g, ''))} required />
          </label>
          <label>
            <span>현재 모인 금액</span>
            <input value={savedAmount} inputMode="numeric" placeholder="0" onChange={(event) => setSavedAmount(event.target.value.replace(/\D/g, ''))} />
          </label>
          <label>
            <span>월 적립 금액</span>
            <input value={monthlyContribution} inputMode="numeric" placeholder="0" onChange={(event) => setMonthlyContribution(event.target.value.replace(/\D/g, ''))} />
          </label>
          <label>
            <span>자동 적립률 (%)</span>
            <input value={autoSavingRate} inputMode="numeric" min="0" max="100" placeholder="0" onChange={(event) => setAutoSavingRate(event.target.value.replace(/\D/g, '').slice(0, 3))} />
          </label>

          <div className={styles.actions}>
            <Button type="button" variant="outline" onClick={onClose}>취소</Button>
            <Button type="submit" isLoading={isSaving} disabled={!name.trim() || Number(targetAmount) <= 0}>Pot 만들기</Button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default CreatePotModal
