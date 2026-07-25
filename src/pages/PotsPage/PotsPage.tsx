import { useEffect, useState } from 'react'
import { createPot, deletePot, getPots, updatePot } from '@/api/pots'
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
  const [toastMessage, setToastMessage] = useState('')
  const [isAllocationWarningDismissed, setIsAllocationWarningDismissed] = useState(false)

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
    if (!data || data.allocatedAmount <= data.monthlyBudget) return

    const timer = window.setTimeout(() => {
      setIsAllocationWarningDismissed(true)
    }, 2000)

    return () => window.clearTimeout(timer)
  }, [data])

  if (errorMessage) return <p role="alert">{errorMessage}</p>
  if (!data) return <p aria-live="polite">Pots 정보를 불러오는 중입니다.</p>

  const completedPot = data.pots.find((pot) => pot.savedAmount >= pot.targetAmount)

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
        const nextSavedAmount = Math.min(activePot.savedAmount + amountValue, activePot.targetAmount)
        await updatePot(activePot.potId, { savedAmount: nextSavedAmount })
        if (activePot.savedAmount < activePot.targetAmount && nextSavedAmount >= activePot.targetAmount) {
          setToastMessage(`“${activePot.name}” 목표를 달성했어요!`)
        }
      }
      if (panelMode === 'edit') await updatePot(activePot.potId, { name: editName.trim(), targetAmount: editTargetAmount, imageSrc: editImageSrc, icon: editIcon })
      await reloadPots()
      setIsAllocationWarningDismissed(false)
      closePanel()
    } finally { setIsSaving(false) }
  }

  const handleEditImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.addEventListener('load', () => { if (typeof reader.result === 'string') setEditImageSrc(reader.result) })
    reader.readAsDataURL(file)
  }

  const handleDeletePot = async (pot: Pot) => {
    if (!window.confirm(`${pot.name} Pot을 삭제할까요?`)) return
    await deletePot(pot.potId)
    await reloadPots()
  }

  const handleCreatePot = async (input: Parameters<typeof createPot>[0]) => {
    setIsSaving(true)

    try {
      const newPot = await createPot(input)
      setData((current) => {
        if (!current) return current
        const allocatedAmount = current.allocatedAmount + newPot.targetAmount

        return {
          ...current,
          allocatedAmount,
          availableAmount: Math.max(current.monthlyBudget - allocatedAmount, 0),
          pots: [...current.pots, newPot],
        }
      })
      setIsAllocationWarningDismissed(false)
      setIsCreateOpen(false)
    } catch {
      setErrorMessage('Pot을 만들지 못했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className={styles.page} aria-labelledby="pots-title">
      <h1 id="pots-title">나의 Pots</h1>
      {toastMessage && <div className={styles.successToast} role="status"><b>✓</b><span>{toastMessage}</span><button type="button" aria-label="알림 닫기" onClick={() => setToastMessage('')}>×</button></div>}
      {data.allocatedAmount > data.monthlyBudget && !isAllocationWarningDismissed && (
        <div className={styles.allocationWarning} role="alert">
          <b aria-hidden="true">×</b>
          <span>배정된 금액이 월예산을 초과했어요</span>
          <button type="button" aria-label="경고 닫기" onClick={() => setIsAllocationWarningDismissed(true)}>×</button>
        </div>
      )}

      <div className={styles.dashboardGrid}>
        <div className={styles.mainColumn}>
          <BudgetAllocationSummary
            monthlyBudget={data.monthlyBudget}
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
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closePanel() }}>
          <section className={styles.actionModal} role="dialog" aria-modal="true" aria-labelledby="pot-action-title">
            <header><h2 id="pot-action-title">{panelMode === 'add' ? '금액 추가' : 'Pots 수정하기'}</h2><button type="button" onClick={closePanel}>×</button></header>
            <div className={styles.actionPotName}><img src={activePot.imageSrc} alt="" /><div><b>{activePot.name}</b><span>현재 {formatCurrencyAmount(activePot.savedAmount, data.homeCurrency)}</span></div></div>
            {panelMode === 'edit' ? (
              <div className={styles.editFields}>
                <label className={styles.modalField}><span>1. Pots 이름</span><input value={editName} maxLength={30} onChange={(event) => setEditName(event.target.value)} /></label>
                <label className={styles.modalField}><span>2. 목표 금액</span><input value={formatCurrencyAmount(editTargetAmount, data.homeCurrency)} readOnly /></label>
                <label className={styles.rangeField}><input aria-label="목표 금액 수정" type="range" min="10000" max={data.monthlyBudget} step="10000" value={Math.min(editTargetAmount, data.monthlyBudget)} onChange={(event) => setEditTargetAmount(Number(event.target.value))} /><span className={styles.rangeLabels}><small>{formatCurrencyAmount(0, data.homeCurrency)}</small><small>{formatCurrencyAmount(data.monthlyBudget, data.homeCurrency)}</small></span></label>
                <fieldset className={styles.imageChoices}><legend>3. 대표 이미지</legend><div>{representativeImages.map((imageSrc) => <button key={imageSrc} type="button" className={editImageSrc === imageSrc ? styles.selectedChoice : ''} onClick={() => setEditImageSrc(imageSrc)}><img src={imageSrc} alt="" /></button>)}<label className={styles.uploadChoice}>＋<small>직접 업로드</small><input type="file" accept="image/*" onChange={handleEditImageUpload} /></label></div></fieldset>
                <fieldset className={styles.categoryChoices}><legend>4. 대표 카테고리</legend><div>{POT_CATEGORY_OPTIONS.map((option) => <button key={option.id} type="button" aria-label={option.label} className={findPotCategory(editIcon)?.id === option.id ? styles.selectedChoice : ''} onClick={() => setEditIcon(option.id)}><img src={option.iconSrc} alt="" aria-hidden="true" /></button>)}</div></fieldset>
              </div>
            ) : (
              <label className={styles.rangeField}>
                <span>추가할 금액</span>
                <output>{formatCurrencyAmount(amountValue, data.homeCurrency)}</output>
                <input type="range" min="0" max={Math.max(activePot.targetAmount - activePot.savedAmount, 0)} step="10000" value={amountValue} onChange={(event) => setAmountValue(Number(event.target.value))} />
                <span className={styles.rangeLabels}><small>{formatCurrencyAmount(0, data.homeCurrency)}</small><small>{formatCurrencyAmount(Math.max(activePot.targetAmount - activePot.savedAmount, 0), data.homeCurrency)}</small></span>
              </label>
            )}
            <div className={styles.modalActions}><button type="button" onClick={closePanel}>취소</button><button type="button" onClick={handlePanelSave} disabled={isSaving || (panelMode === 'edit' ? !editName.trim() || editTargetAmount <= 0 : amountValue <= 0)}>{isSaving ? '저장 중...' : '저장하기'}</button></div>
          </section>
        </div>
      )}
    </section>
  )
}

export default PotsPage
