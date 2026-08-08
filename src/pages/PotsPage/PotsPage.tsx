import { useEffect, useRef, useState } from 'react'
import { allocatePotAmount, archivePot, createPot, getPots, isUsingMockPotsApi, updatePot } from '@/api/pots'
import CurrencyAmountInput from '@/components/common/CurrencyAmountInput/CurrencyAmountInput'
import ModalShell from '@/components/common/ModalShell/ModalShell'
import Toast from '@/components/common/Toast/Toast'
import { useToastQueue } from '@/components/common/Toast/useToastQueue'
import CreatePotModal from '@/components/pots/CreatePotModal/CreatePotModal'
import BudgetAllocationSummary from '@/components/pots/BudgetAllocationSummary/BudgetAllocationSummary'
import PotCard from '@/components/pots/PotCard/PotCard'
import { findPotCategory, POT_CATEGORY_OPTIONS } from '@/constants/potCategoryOptions'
import type { Pot, PotsData } from '@/types/pot'
import { formatCurrencyAmount } from '@/utils/currency'
import styles from './PotsPage.module.css'
import FloatingMascot from '@/components/common/FloatingMascot/FloatingMascot'

const representativeImages = [
  '/assets/images/pots/sapporo-trip.png',
  '/assets/images/goals/education-campus.png',
  '/assets/images/goals/shopping-mall.png',
  '/assets/images/goals/travel-resort.png',
  '/assets/illustrations/mascot-finance.png',
  '/assets/images/pots/representative-image-add.png',
]

function PotsPage() {
  const [data, setData] = useState<PotsData | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [activePot, setActivePot] = useState<Pot | null>(null)
  const [panelMode, setPanelMode] = useState<'add' | 'edit' | null>(null)
  const [amountValue, setAmountValue] = useState(0)
  const [editName, setEditName] = useState('')
  const [editTargetAmount, setEditTargetAmount] = useState(0)
  const [editImageSrc, setEditImageSrc] = useState('')
  const [editIcon, setEditIcon] = useState('travel')
  const [deleteTarget, setDeleteTarget] = useState<Pot | null>(null)
  const previousAllocationRef = useRef<Pick<PotsData, 'totalAssets' | 'monthlyExpense' | 'allocatedAmount'> | null>(null)
  const { toast, showToast, closeToast } = useToastQueue()

  useEffect(() => {
    let isActive = true

    getPots()
      .then((response) => {
        if (isActive) setData(response)
      })
      .catch(() => {
        if (isActive) setErrorMessage('Pots 정보를 불러오지 못했습니다.')
      })

    return () => {
      isActive = false
    }
  }, [])

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
  if (!data) return <p aria-live="polite">Pots 정보를 불러오는 중입니다.</p>

  const completedPot = data.pots.find((pot) => pot.savedAmount >= pot.targetAmount)
  const editTargetRate = data.monthlyBudget > 0
    ? Math.min((editTargetAmount / data.monthlyBudget) * 100, 100)
    : 0
  const editTooltipRate = Math.min(Math.max(editTargetRate, 8), 92)
  const maximumAdditionalAmount = activePot
    ? Math.max(Math.min(activePot.targetAmount - activePot.savedAmount, data.availableAmount), 0)
    : 0

  const reloadPots = async () => setData(await getPots())

  const openPanel = (pot: Pot, mode: 'add' | 'edit') => {
    setActivePot(pot)
    setPanelMode(mode)
    setAmountValue(0)
    setEditName(pot.name)
    setEditTargetAmount(pot.targetAmount)
    setEditImageSrc(pot.imageSrc)
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
        await updatePot(activePot.potId, { name: editName.trim(), targetAmount: editTargetAmount, imageSrc: editImageSrc, icon: editIcon })
        showToast({ variant: 'success', title: '수정되었어요' })
      }
      await reloadPots()
      closePanel()
    } catch {
      showToast({ variant: 'error', title: '수정하지 못했어요. 다시 시도해주세요' })
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
    } catch {
      showToast({
        variant: 'error',
        title: isUsingMockPotsApi ? 'Pot을 삭제하지 못했어요' : 'Pot을 보관하지 못했어요',
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
    } catch {
      showToast({ variant: 'error', title: 'Pot을 만들지 못했어요. 다시 시도해주세요' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className={styles.page} aria-labelledby="pots-title">
      <h1 id="pots-title">나의 Pots</h1>
      {toast && <Toast key={toast.id} {...toast} onClose={closeToast} />}

      <div className={styles.dashboardGrid}>
        <div className={styles.mainColumn}>
          <BudgetAllocationSummary
            totalAssets={data.totalAssets}
            allocatedAmount={data.allocatedAmount}
            availableAmount={data.availableAmount}
            currency={data.homeCurrency}
          />
          {data.pots.map((pot) => <PotCard key={pot.potId} pot={pot} currency={data.homeCurrency} onAddAmount={() => openPanel(pot, 'add')} onEdit={() => openPanel(pot, 'edit')} onDelete={() => handleDeletePot(pot)} />)}
          {data.pots.length === 0 && <p>아직 만든 Pot이 없습니다.</p>}
          <button className={styles.createButton} type="button" onClick={() => setIsCreateOpen(true)}>
            <span aria-hidden="true">＋</span>
            새로운 Pot 만들기
          </button>
        </div>

        <aside className={styles.sideColumn} aria-label="Pots 보조 정보">
          <div className={styles.walletIllustration} aria-hidden="true">
            <img src="/assets/illustrations/wallet.png" alt="" />
          </div>
          <FloatingMascot
              message={completedPot ? '목표를 달성했어요 축하드려요!' : '오늘도 목표를 향해 한 걸음!'}
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
          title={panelMode === 'add' ? '금액 추가' : 'Pots 수정하기'}
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
                <span>1. Pots 이름</span>
                <span className={styles.editNameRow}>
                  <img src={(findPotCategory(editIcon) ?? POT_CATEGORY_OPTIONS[0]).iconSrc} alt="" aria-hidden="true" />
                  <input value={editName} maxLength={30} onChange={(event) => setEditName(event.target.value)} />
                </span>
              </label>
              <section className={styles.editTargetSection}>
                <strong>2. 목표 금액</strong>
                <p>이 Pots에 모으고 싶은 목표 금액을 설정해주세요.</p>
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
                <legend>3. 대표 이미지</legend>
                <p>Pots를 더 쉽게 구분할 수 있도록 이미지를 선택해 보세요.</p>
                <div>
                  {representativeImages.map((imageSrc, index) => {
                    const isSelected = editImageSrc === imageSrc
                    return (
                      <button
                        key={imageSrc}
                        type="button"
                        className={`${styles.imageChoice} ${isSelected ? styles.selectedImageChoice : ''}`}
                        aria-label={`대표 이미지 ${index + 1}`}
                        aria-pressed={isSelected}
                        onClick={() => setEditImageSrc(imageSrc)}
                      >
                        <img src={imageSrc} alt="" />
                        {isSelected && <span className={styles.selectedBadge} aria-hidden="true">✓</span>}
                      </button>
                    )
                  })}
                </div>
              </fieldset>
              <fieldset className={styles.categoryChoices}>
                <legend>4. 대표 카테고리</legend>
                <p>Pots를 더 쉽게 구분할 수 있도록 이모티콘을 선택해 보세요.</p>
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
          <div className={styles.modalActions}><button type="button" onClick={closePanel}>취소</button><button type="button" onClick={handlePanelSave} disabled={isSaving || (panelMode === 'edit' ? !editName.trim() || editTargetAmount <= 0 : amountValue <= 0 || amountValue > maximumAdditionalAmount)}>{isSaving ? '저장 중...' : '저장하기'}</button></div>
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
