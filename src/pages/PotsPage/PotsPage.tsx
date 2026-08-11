import { useEffect, useRef, useState } from 'react'
import { allocatePotAmount, archivePot, createPot, isUsingMockPotsApi, updatePot } from '@/api/pots'
import CurrencyAmountInput from '@/components/common/CurrencyAmountInput/CurrencyAmountInput'
import ModalShell from '@/components/common/ModalShell/ModalShell'
import Toast from '@/components/common/Toast/Toast'
import { useToastQueue } from '@/components/common/Toast/useToastQueue'
import CreatePotModal from '@/components/pots/CreatePotModal/CreatePotModal'
import BudgetAllocationSummary from '@/components/pots/BudgetAllocationSummary/BudgetAllocationSummary'
import PotCard from '@/components/pots/PotCard/PotCard'
import { findPotCategory, POT_CATEGORY_OPTIONS } from '@/constants/potCategoryOptions'
import {
  getPotRepresentativeImageSrc,
  POT_REPRESENTATIVE_IMAGE_OPTIONS,
} from '@/constants/potRepresentativeImages'
import { usePotsData } from '@/hooks/usePotsData'
import type { Pot, PotsData } from '@/types/pot'
import { formatCurrencyAmount } from '@/utils/currency'
import { getApiErrorNotice } from '@/utils/apiError'
import styles from './PotsPage.module.css'
import FloatingMascot from '@/components/common/FloatingMascot/FloatingMascot'
import { useI18n } from '@/i18n/I18nContext'

function PotsPage() {
  const { t } = useI18n()
  const { data, setData, errorMessage, refetch: reloadPots } = usePotsData()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [activePot, setActivePot] = useState<Pot | null>(null)
  const [panelMode, setPanelMode] = useState<'add' | 'edit' | null>(null)
  const [amountValue, setAmountValue] = useState(0)
  const [editName, setEditName] = useState('')
  const [editTargetAmount, setEditTargetAmount] = useState(0)
  const [editRepresentativeImageKey, setEditRepresentativeImageKey] = useState('')
  const [editIcon, setEditIcon] = useState('travel')
  const [deleteTarget, setDeleteTarget] = useState<Pot | null>(null)
  const previousAllocationRef = useRef<Pick<PotsData, 'totalAssets' | 'monthlyExpense' | 'allocatedAmount'> | null>(null)
  const { toast, showToast, closeToast } = useToastQueue()

  useEffect(() => {
    if (!data) return

    const previousAllocation = previousAllocationRef.current
    const isOverAllocated = data.monthlyExpense + data.allocatedAmount > data.totalAssets
    const wasOverAllocated = previousAllocation
      ? previousAllocation.monthlyExpense + previousAllocation.allocatedAmount > previousAllocation.totalAssets
      : isOverAllocated

    if (!wasOverAllocated && isOverAllocated) {
      showToast({ variant: 'error', title: '배정된 금액이 월예산을 초과했어요' })
    }

    previousAllocationRef.current = {
      totalAssets: data.totalAssets,
      monthlyExpense: data.monthlyExpense,
      allocatedAmount: data.allocatedAmount,
    }
  }, [data, showToast])

  if (errorMessage) return <p role="alert">{errorMessage}</p>
  if (!data) return <p aria-live="polite">{t('pots.loading')}</p>

  const completedPot = data.pots.find((pot) => pot.savedAmount >= pot.targetAmount)
  const editTargetRate = data.monthlyBudget > 0
    ? Math.min((editTargetAmount / data.monthlyBudget) * 100, 100)
    : 0
  const editTooltipRate = Math.min(Math.max(editTargetRate, 8), 92)
  const maximumAdditionalAmount = activePot
    ? Math.max(Math.min(activePot.targetAmount - activePot.savedAmount, data.availableAmount), 0)
    : 0

  const openPanel = (pot: Pot, mode: 'add' | 'edit') => {
    setActivePot(pot)
    setPanelMode(mode)
    setAmountValue(0)
    setEditName(pot.name)
    setEditTargetAmount(pot.targetAmount)
    setEditRepresentativeImageKey(pot.representativeImageKey)
    setEditIcon(pot.icon)
  }

  const closePanel = () => { setPanelMode(null); setActivePot(null) }

  const handlePanelSave = async () => {
    if (!activePot) return
    setIsSaving(true)
    try {
      if (panelMode === 'add') {
        const amountToAdd = Math.min(amountValue, maximumAdditionalAmount)
        if (amountToAdd <= 0) return
        const nextSavedAmount = activePot.savedAmount + amountToAdd
        await allocatePotAmount(activePot, amountToAdd)
        if (activePot.savedAmount < activePot.targetAmount && nextSavedAmount >= activePot.targetAmount) {
          showToast({ variant: 'success', title: `“${activePot.name}” 목표를 달성했어요!` })
        }
      }
      if (panelMode === 'edit') {
        await updatePot(activePot.potId, {
          name: editName.trim(),
          targetAmount: editTargetAmount,
          representativeImageKey: editRepresentativeImageKey,
          icon: editIcon,
        })
        showToast({ variant: 'success', title: '수정되었어요' })
      }
      await reloadPots()
      closePanel()
    } catch (error) {
      showToast({
        variant: 'error',
        ...getApiErrorNotice(error, 'Pot을 수정하지 못했습니다.'),
      })
    } finally { setIsSaving(false) }
  }

  const handleDeletePot = (pot: Pot) => {
    setDeleteTarget(pot)
  }

  const handleArchivePot = async () => {
    if (!deleteTarget) return

    setIsSaving(true)
    try {
      const archived = await archivePot(deleteTarget.potId)
      if (!archived) throw new Error('Pot archive failed')
      await reloadPots()
      setDeleteTarget(null)
    } catch (error) {
      showToast({
        variant: 'error',
        ...getApiErrorNotice(
          error,
          isUsingMockPotsApi ? 'Pot을 삭제하지 못했습니다.' : 'Pot을 보관하지 못했습니다.',
        ),
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCreatePot = async (input: Parameters<typeof createPot>[0]) => {
    setIsSaving(true)

    try {
      const newPot = await createPot(input)
      setData((current) => {
        if (!current) return current
        const allocatedAmount = current.allocatedAmount + newPot.savedAmount

        return {
          ...current,
          allocatedAmount,
          availableAmount: Math.max(current.availableAmount - newPot.savedAmount, 0),
          pots: [...current.pots, newPot],
        }
      })
      setIsCreateOpen(false)
    } catch (error) {
      showToast({
        variant: 'error',
        ...getApiErrorNotice(error, 'Pot을 만들지 못했습니다.'),
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className={styles.page} aria-labelledby="pots-title">
      <h1 id="pots-title">{t('pots.title')}</h1>
      {toast && <Toast key={toast.id} {...toast} onClose={closeToast} />}

      <div className={styles.dashboardGrid}>
        <div className={`${styles.mainColumn} ${data.pots.length === 0 ? styles.emptyMainColumn : ''}`}>
          <BudgetAllocationSummary
            totalAssets={data.totalAssets}
            allocatedAmount={data.allocatedAmount}
            availableAmount={data.availableAmount}
            currency={data.homeCurrency}
          />
          {data.pots.map((pot) => <PotCard key={pot.potId} pot={pot} currency={data.homeCurrency} onAddAmount={() => openPanel(pot, 'add')} onEdit={() => openPanel(pot, 'edit')} onDelete={() => handleDeletePot(pot)} />)}
          {data.pots.length === 0 && <p className={styles.emptyState}>{t('pots.empty')}</p>}
          <button className={styles.createButton} type="button" onClick={() => setIsCreateOpen(true)}>
            <span aria-hidden="true">＋</span>
            {t('pots.create')}
          </button>
        </div>

        <aside className={styles.sideColumn} aria-label={t('pots.assistiveInfo')}>
          <div className={styles.walletIllustration} aria-hidden="true">
            <img src="/assets/illustrations/wallet.png" alt="" />
          </div>
          <FloatingMascot
              message={completedPot ? t('pots.mascot.completed') : t('pots.mascot.default')}
              imageSrc={completedPot ? '/assets/illustrations/mascot-celebration.png' : '/assets/illustrations/mascot-checklist.png'}
          />
        </aside>
      </div>

      {isCreateOpen && (
        <CreatePotModal
          isSaving={isSaving}
          maximumTargetAmount={data.monthlyBudget}
          currency={data.homeCurrency}
          onClose={() => setIsCreateOpen(false)}
          onSubmit={handleCreatePot}
        />
      )}

      {activePot && panelMode && (
        <ModalShell
          title={panelMode === 'add' ? t('pots.addAmount') : t('pots.edit')}
          titleId="pot-action-title"
          closeLabel={panelMode === 'add' ? '금액 추가 닫기' : 'Pots 수정 닫기'}
          width={panelMode === 'edit' ? '44rem' : '43rem'}
          dialogClassName={panelMode === 'edit' ? styles.editModalDialog : undefined}
          bodyClassName={panelMode === 'edit' ? styles.editModalBody : styles.actionModalBody}
          onClose={closePanel}
        >
          {panelMode === 'edit' ? (
            <div className={styles.editFields}>
              <label className={styles.modalField}>
                <span>{t('pots.editName')}</span>
                <span className={styles.editNameRow}>
                  <img src={(findPotCategory(editIcon) ?? POT_CATEGORY_OPTIONS[0]).iconSrc} alt="" aria-hidden="true" />
                  <input value={editName} maxLength={30} onChange={(event) => setEditName(event.target.value)} />
                </span>
              </label>
              <section className={styles.editTargetSection}>
                <strong>{t('pots.editTarget')}</strong>
                <p>{t('pots.targetDescription')}</p>
                <label className={styles.rangeField}>
                  <div className={styles.rangeWrap}>
                    <output style={{ left: `${editTooltipRate}%` }}>{formatCurrencyAmount(editTargetAmount, data.homeCurrency)}</output>
                    <input
                      aria-label="목표 금액 수정"
                      type="range"
                      min="0"
                      max={data.monthlyBudget}
                      step="10000"
                      value={Math.min(Math.round(editTargetAmount / 10_000) * 10_000, data.monthlyBudget)}
                      style={{ background: `linear-gradient(to right, var(--color-primary) 0 ${editTargetRate}%, #e5e5e5 ${editTargetRate}% 100%)` }}
                      onChange={(event) => setEditTargetAmount(Number(event.target.value))}
                    />
                  </div>
                  <span className={styles.rangeLabels}><small>{formatCurrencyAmount(0, data.homeCurrency)}</small><small>{formatCurrencyAmount(data.monthlyBudget, data.homeCurrency)}</small></span>
                </label>
              </section>
              <fieldset className={styles.imageChoices}>
                <legend>{t('pots.representativeImage')}</legend>
                <p>{t('pots.imageDescription')}</p>
                <div>
                  {POT_REPRESENTATIVE_IMAGE_OPTIONS.map((option, index) => {
                    const isSelected = editRepresentativeImageKey === option.key
                    return (
                      <button
                        key={option.key}
                        type="button"
                        className={`${styles.imageChoice} ${isSelected ? styles.selectedImageChoice : ''}`}
                        aria-label={`대표 이미지 ${index + 1}`}
                        aria-pressed={isSelected}
                        onClick={() => setEditRepresentativeImageKey(option.key)}
                      >
                        <img src={getPotRepresentativeImageSrc(option.key)} alt="" />
                        {isSelected && <span className={styles.selectedBadge} aria-hidden="true">✓</span>}
                      </button>
                    )
                  })}
                </div>
              </fieldset>
              <fieldset className={styles.categoryChoices}>
                <legend>{t('pots.category')}</legend>
                <p>{t('pots.categoryDescription')}</p>
                <div>{POT_CATEGORY_OPTIONS.map((option) => <button key={option.id} type="button" aria-label={option.label} className={findPotCategory(editIcon)?.id === option.id ? styles.selectedChoice : ''} onClick={() => setEditIcon(option.id)}><img src={option.iconSrc} alt="" aria-hidden="true" style={{ transform: `scale(${option.displayScale})` }} /></button>)}</div>
              </fieldset>
            </div>
          ) : (
            <>
              <div className={styles.actionPotName}><img src={activePot.imageSrc} alt="" /><div><b>{activePot.name}</b><span>현재 {formatCurrencyAmount(activePot.savedAmount, data.homeCurrency)}</span></div></div>
              <label className={styles.rangeField}>
                <span>추가할 금액</span>
                <CurrencyAmountInput
                  value={amountValue}
                  currency={data.homeCurrency}
                  max={maximumAdditionalAmount}
                  ariaLabel="추가할 금액 입력"
                  onChange={setAmountValue}
                />
                <output>{formatCurrencyAmount(amountValue, data.homeCurrency)}</output>
                <input type="range" min="0" max={maximumAdditionalAmount} step="10000" value={Math.min(amountValue, maximumAdditionalAmount)} onChange={(event) => setAmountValue(Number(event.target.value))} />
                <span className={styles.rangeLabels}><small>{formatCurrencyAmount(0, data.homeCurrency)}</small><small>{formatCurrencyAmount(maximumAdditionalAmount, data.homeCurrency)}</small></span>
              </label>
            </>
          )}
          <div className={styles.modalActions}><button type="button" onClick={closePanel}>{t('common.cancel')}</button><button type="button" onClick={handlePanelSave} disabled={isSaving || (panelMode === 'edit' ? !editName.trim() || editTargetAmount <= 0 : amountValue <= 0 || amountValue > maximumAdditionalAmount)}>{isSaving ? t('common.saving') : t('common.save')}</button></div>
        </ModalShell>
      )}

      {deleteTarget && (
        <ModalShell
          title={isUsingMockPotsApi ? 'Pot을 삭제하고 금액을 되돌릴까요?' : 'Pot을 보관할까요?'}
          titleId="delete-pot-title"
          closeLabel="Pot 삭제 팝업 닫기"
          width="31rem"
          bodyClassName={styles.deleteModalBody}
          onClose={() => setDeleteTarget(null)}
        >
          <p className={styles.deletePotName}>“{deleteTarget.name}”</p>
          <p className={styles.deleteRefundMessage}>
            {isUsingMockPotsApi
              ? deleteTarget.savedAmount > 0
                ? `모아둔 ${formatCurrencyAmount(deleteTarget.savedAmount, data.homeCurrency)}은 사용 가능 금액으로 돌아갑니다.`
                : '모아둔 금액이 없어 Pot만 삭제됩니다.'
              : '목록에서 숨겨지며 기존 목표와 배정 내역은 유지됩니다.'}
          </p>
          <div className={styles.deleteModalActions}>
            <button type="button" onClick={handleArchivePot} disabled={isSaving}>
              {isSaving
                ? isUsingMockPotsApi ? '삭제 중...' : '보관 중...'
                : isUsingMockPotsApi ? '사용 가능 금액으로 되돌리고 삭제' : 'Pot 보관하기'}
            </button>
            <button type="button" onClick={() => setDeleteTarget(null)} disabled={isSaving}>
              취소
            </button>
          </div>
        </ModalShell>
      )}
    </section>
  )
}

export default PotsPage
