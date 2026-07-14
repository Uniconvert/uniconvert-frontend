import { useEffect, useState } from 'react'
import { createPot, getPots } from '@/api/pots'
import CreatePotModal from '@/components/pots/CreatePotModal/CreatePotModal'
import AutoSavingsCard from '@/components/pots/AutoSavingsCard/AutoSavingsCard'
import BudgetAllocationSummary from '@/components/pots/BudgetAllocationSummary/BudgetAllocationSummary'
import PotCard from '@/components/pots/PotCard/PotCard'
import type { PotsData } from '@/types/pot'
import styles from './PotsPage.module.css'

function PotsPage() {
  const [data, setData] = useState<PotsData | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

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

  if (errorMessage) return <p role="alert">{errorMessage}</p>
  if (!data) return <p aria-live="polite">Pots 정보를 불러오는 중입니다.</p>

  const primaryPot = data.pots[0]

  const handleCreatePot = async (input: Parameters<typeof createPot>[0]) => {
    setIsSaving(true)

    try {
      const newPot = await createPot(input)
      setData((current) => {
        if (!current) return current
        const allocatedAmount = current.allocatedAmount + newPot.monthlyContribution

        return {
          ...current,
          allocatedAmount,
          availableAmount: Math.max(current.monthlyBudget - allocatedAmount, 0),
          pots: [...current.pots, newPot],
        }
      })
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

      <div className={styles.dashboardGrid}>
        <div className={styles.mainColumn}>
          <BudgetAllocationSummary
            monthlyBudget={data.monthlyBudget}
            allocatedAmount={data.allocatedAmount}
            availableAmount={data.availableAmount}
          />
          {data.pots.map((pot) => <PotCard key={pot.potId} pot={pot} />)}
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
          {primaryPot && (
            <AutoSavingsCard
              name={primaryPot.name}
              imageSrc={primaryPot.imageSrc}
              monthlyContribution={primaryPot.monthlyContribution}
              autoSavingRate={primaryPot.autoSavingRate}
            />
          )}
          <div className={styles.encouragement}>
            <div className={styles.speechBubble}>오늘도 목표를 향해 한 걸음!</div>
            <span className={styles.bubbleDotLarge} aria-hidden="true" />
            <span className={styles.bubbleDotSmall} aria-hidden="true" />
            <img
              src="/assets/illustrations/mascot-check.png"
              alt="목표 달성을 응원하는 유니컨버트 캐릭터"
            />
          </div>
        </aside>
      </div>

      {isCreateOpen && (
        <CreatePotModal
          isSaving={isSaving}
          onClose={() => setIsCreateOpen(false)}
          onSubmit={handleCreatePot}
        />
      )}
    </section>
  )
}

export default PotsPage
