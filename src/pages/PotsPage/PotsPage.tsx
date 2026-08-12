import { useEffect, useMemo, useRef, useState } from 'react'
import { allocatePotAmount, archivePot, createPot, updatePot } from '@/api/pots'
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
import { useMyUserQuery } from '@/hooks/useMyUserQuery'
import type { Pot, PotsData } from '@/types/pot'
import { formatCurrencyAmount } from '@/utils/currency'
import { getApiErrorNotice } from '@/utils/apiError'
import styles from './PotsPage.module.css'
import FloatingMascot from '@/components/common/FloatingMascot/FloatingMascot'
import { useI18n } from '@/i18n/I18nContext'

function PotsPage() {
  const { t } = useI18n()
  const { data, errorMessage, refetch: reloadPots } = usePotsData()
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

  // [추가] 사용자 primaryGoal 상태 관리

  const previousAllocationRef = useRef<Pick<PotsData, 'totalAssets' | 'monthlyExpense' | 'allocatedAmount'> | null>(null)
  const { toast, showToast, closeToast } = useToastQueue()
  const { data: currentUser } = useMyUserQuery()
  const primaryGoal = currentUser?.primaryGoal ?? ''
  // [추가] 마운트 시 사용자 정보 조회하여 primaryGoal 가져오기
  useEffect(() => {
    if (!data) return

    const previousAllocation = previousAllocationRef.current
    const isOverAllocated = data.monthlyExpense + data.allocatedAmount > data.totalAssets
    const wasOverAllocated = previousAllocation
      ? previousAllocation.monthlyExpense + previousAllocation.allocatedAmount > previousAllocation.totalAssets
      : isOverAllocated

    if (!wasOverAllocated && isOverAllocated) {
      showToast({ variant: 'error', title: t('pots.overAllocated') })
    }

    previousAllocationRef.current = {
      totalAssets: data.totalAssets,
      monthlyExpense: data.monthlyExpense,
      allocatedAmount: data.allocatedAmount,
    }
  }, [data, showToast, t])

  // [수정] primaryGoal과 Pot 개수에 따른 마스코트 멘트 풀 분기
  const mascotMessages = useMemo(() => {
    if (!data || !data.pots) return ["돈을 저축해보는 건 어때요?"]

    // Pots가 하나도 없을 때
    const apiMessages = data.mascotMessages
      .map((item) => item.message)
      .filter(Boolean)
    if (apiMessages.length > 0) return apiMessages

    if (data.pots.length === 0) {
      // primaryGoal 종류에 따른 맞춤 멘트 설정
      if (primaryGoal === 'travel') {
        return [
          `오사카 여행을 떠나보는 건 어때요?`,
          `원하던 ${primaryGoal}에 도전해보세요!`
        ]
      } else if (primaryGoal === 'saving') {
        return [
          "50만원을 목표로 저축을 시작해봐요!",
          "작은 금액부터 차근차근 저축해봐요!"
        ]
      } else if (primaryGoal === 'education') {
        return [
          "필요한 학업비를 위해 저축을 시작해봐요!",
          "미래를 위한 투자를 준비해보세요!"
        ]
      } else {
        // 기본 Fallback 멘트
        return [
          "오사카 여행을 떠나봐요!",
          "돈을 저축해보는 건 어때요?"
        ]
      }
    }

    // 목표를 달성한 Pot이 하나라도 있는지 확인
    const hasCompletedPot = data.pots.some((pot) => pot.savedAmount >= pot.targetAmount)

    if (hasCompletedPot) {
      return [
        "목표 달성! 정말 대단해요!",
        "꾸준히 모으더니 해냈네요, 축하해요!",
        "축하해요! 다음 Pots 는 어떤 게 좋을까요? 지출 내역을 참고해보세요!"
      ]
    } else {
      return [
        "오늘도 목표를 향해 한 걸음!",
        "조금씩 쌓이고 있어요. 꾸준히 가봐요!"
      ]
    }
  }, [data, primaryGoal])

  if (errorMessage) return <div role="alert" className={styles.loadError}><p>{errorMessage}</p><button type="button" onClick={() => { void reloadPots() }}>{t('common.retry')}</button></div>
  if (!data) return <p aria-live="polite">{t('pots.loading')}</p>

  const editTargetRate = data.monthlyBudget > 0
    ? Math.min((editTargetAmount / data.monthlyBudget) * 100, 100)
    : 0
  const editTooltipRate = Math.min(Math.max(editTargetRate, 8), 92)
  const maximumAdditionalAmount = activePot
    ? Math.max(Math.min(activePot.targetAmount - activePot.savedAmount, data.availableAmount), 0)
    : 0
  const additionalAmountRate = maximumAdditionalAmount > 0
    ? Math.min((amountValue / maximumAdditionalAmount) * 100, 100)
    : 0
  const additionalTooltipRate = Math.min(Math.max(additionalAmountRate, 8), 92)

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
        showToast({ variant: 'success', title: t('pots.updateSuccess') })
      }
      await reloadPots()
      closePanel()
    } catch (error) {
      showToast({
        variant: 'error',
        ...getApiErrorNotice(error, t('pots.updateError')),
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
          t('pots.archiveError'),
        ),
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCreatePot = async (input: Parameters<typeof createPot>[0]) => {
    setIsSaving(true)

    try {
      await createPot(input)
      // Pot 생성 시 서버가 표시 순서와 이번 달 배정 상태를 최종 결정하므로,
      // 화면의 임시 계산값 대신 서버 데이터를 다시 받아 표시한다.
      await reloadPots()
      setIsCreateOpen(false)
    } catch (error) {
      showToast({
        variant: 'error',
        ...getApiErrorNotice(error, t('pots.createError')),
      })
    } finally {
      setIsSaving(false)
    }
  }

  const hasCompletedPot = data.pots.length > 0 && data.pots.some((pot) => pot.savedAmount >= pot.targetAmount)

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
          {data.pots.length === 0 && (
            <div className={styles.emptyState}>
              <img src="/assets/illustrations/mascot-checklist.png" alt="" aria-hidden="true" />
              <strong>{t('pots.empty')}</strong>
              <p>{t('pots.emptyDescription')}</p>
            </div>
          )}
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
            messages={mascotMessages}
            imageSrc={hasCompletedPot ? '/assets/illustrations/mascot-celebration.png' : '/assets/illustrations/mascot-checklist.png'}
            speechBubbleVariant="compact"
            className={styles.lowerMascot}
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
          closeLabel={panelMode === 'add' ? t('pots.addAmountClose') : t('pots.editClose')}
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
                      aria-label={t('pots.targetAria')}
                      type="range"
                      min="0"
                      max={data.monthlyBudget}
                      step="10000"
                      value={Math.min(Math.round(editTargetAmount / 10_000) * 10_000, data.monthlyBudget)}
                      style={{ background: `linear-gradient(to right, var(--color-primary) 0 ${editTooltipRate}%, #e5e5e5 ${editTooltipRate}% 100%)` }}
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
                        aria-label={t('pots.representativeOption', { index: index + 1 })}
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
              <div className={styles.actionPotName}><img src={activePot.imageSrc} alt="" /><div><b>{activePot.name}</b><span>{t('pots.currentAmount', { amount: formatCurrencyAmount(activePot.savedAmount, data.homeCurrency) })}</span></div></div>
              <label className={styles.rangeField}>
                <span>{t('pots.additionalAmount')}</span>
                <CurrencyAmountInput
                  value={amountValue}
                  currency={data.homeCurrency}
                  max={maximumAdditionalAmount}
                  ariaLabel={t('pots.additionalAmountInput')}
                  onChange={setAmountValue}
                />
                <div className={styles.rangeWrap}>
                  <output style={{ left: `${additionalTooltipRate}%` }}>{formatCurrencyAmount(amountValue, data.homeCurrency)}</output>
                  <input
                    type="range"
                    min="0"
                    max={maximumAdditionalAmount}
                    step="10000"
                    value={Math.min(amountValue, maximumAdditionalAmount)}
                    style={{ background: `linear-gradient(to right, var(--color-primary) 0 ${additionalAmountRate}%, #e5e5e5 ${additionalAmountRate}% 100%)` }}
                    onChange={(event) => setAmountValue(Number(event.target.value))}
                  />
                </div>
                <span className={styles.rangeLabels}><small>{formatCurrencyAmount(0, data.homeCurrency)}</small><small>{formatCurrencyAmount(maximumAdditionalAmount, data.homeCurrency)}</small></span>
              </label>
            </>
          )}
          <div className={styles.modalActions}><button type="button" onClick={closePanel}>{t('common.cancel')}</button><button type="button" onClick={handlePanelSave} disabled={isSaving || (panelMode === 'edit' ? !editName.trim() || editTargetAmount <= 0 : amountValue <= 0 || amountValue > maximumAdditionalAmount)}>{isSaving ? t('common.saving') : t('common.save')}</button></div>
        </ModalShell>
      )}

      {deleteTarget && (
        <ModalShell
          title={t('pots.deleteTitle')}
          titleId="delete-pot-title"
          closeLabel={t('pots.archiveClose')}
          width="31rem"
          bodyClassName={styles.deleteModalBody}
          onClose={() => setDeleteTarget(null)}
        >
          <img className={styles.deleteMascot} src="/assets/illustrations/mascot-warning.png" alt="" aria-hidden="true" />
          <p className={styles.deletePotName}>“{deleteTarget.name}”</p>
          <div className={styles.deleteModalActions}>
            <button type="button" onClick={handleArchivePot} disabled={isSaving}>
              {isSaving ? t('pots.archiving') : t('pots.archive')}
            </button>
            <button type="button" onClick={() => setDeleteTarget(null)} disabled={isSaving}>
              {t('common.cancel')}
            </button>
          </div>
        </ModalShell>
      )}
    </section>
  )
}

export default PotsPage
