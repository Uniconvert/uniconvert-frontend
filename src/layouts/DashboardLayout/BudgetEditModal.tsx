import { useState } from 'react'
import ModalShell from '@/components/common/ModalShell/ModalShell'
import { useI18n } from '@/i18n/I18nContext'
import styles from './DashboardLayout.module.css'

export interface BudgetEditModalProps {
  initialBudget: number
  maximumBudget: number
  currencySymbol: string
  onClose: () => void
  onSave: (budget: number) => void
  isSaving?: boolean
}

function BudgetEditModal({ initialBudget, maximumBudget, currencySymbol, onClose, onSave, isSaving = false }: BudgetEditModalProps) {
  const { locale, t } = useI18n()
  const [budget, setBudget] = useState(() => Math.min(initialBudget, maximumBudget))
  const progress = maximumBudget > 0 ? (budget / maximumBudget) * 100 : 0
  const rangeStep = currencySymbol === '₩' ? 10000 : 1

  const updateBudget = (value: string) => {
    const nextBudget = Math.min(Number(value.replace(/\D/g, '')) || 0, maximumBudget)
    setBudget(nextBudget)
  }

  return (
    <ModalShell
      title={t('dashboard.budgetEdit')}
      titleId="budget-modal-title"
      closeLabel={t('dashboard.budgetEditClose')}
      width="44rem"
      bodyClassName={styles.budgetModalBody}
      onClose={onClose}
    >
      <form onSubmit={(event) => { event.preventDefault(); onSave(budget) }}>
        <div className={styles.budgetModalCopy}>
          <h3>{t('dashboard.monthlyBudgetAmount')}</h3>
          <p>{t('dashboard.budgetDescription')}</p>
        </div>

        <label className={styles.budgetInput}>
          <span className={styles.srOnly}>{t('dashboard.monthlyBudgetAmount')}</span>
          <span aria-hidden="true">{currencySymbol}</span>
          <input inputMode="numeric" value={budget.toLocaleString(locale)} onChange={(event) => updateBudget(event.target.value)} />
        </label>

        <div className={styles.budgetRangeWrap} style={{ '--budget-progress': `${progress}%` } as React.CSSProperties}>
          <output style={{ left: `${progress}%`, transform: `translateX(-${progress}%)` }}>
            {currencySymbol} {budget.toLocaleString(locale)}
          </output>
          <input type="range" min="0" max={maximumBudget} step={rangeStep} value={budget} aria-label={t('dashboard.budgetSlider')} onChange={(event) => setBudget(Number(event.target.value))} />
          <div className={styles.budgetRangeLabels}><span>{currencySymbol} 0</span><span>{currencySymbol} {maximumBudget.toLocaleString(locale)}</span></div>
        </div>

        <div className={styles.budgetModalActions}>
          <button type="button" onClick={onClose}>{t('common.cancel')}</button>
          <button type="submit" disabled={budget <= 0 || isSaving}>{isSaving ? t('common.saving') : t('common.save')}</button>
        </div>
      </form>
    </ModalShell>
  )
}

export default BudgetEditModal
