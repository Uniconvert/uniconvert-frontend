import { useMemo, useState } from 'react'
import Toast from '@/components/common/Toast/Toast'
import { useToastQueue } from '@/components/common/Toast/useToastQueue'
import { useExpenseHistoryData } from '@/features/expense/hooks/useExpenseHistoryData'
import type { SavedExpense } from '@/types/expense'
import { formatCurrencyAmount, getCurrentYearMonth } from '@/utils/currency'
import { getApiErrorNotice } from '@/utils/apiError'
import styles from '@/features/expense/expenseHistory.module.css'
import FloatingMascot from '@/components/common/FloatingMascot/FloatingMascot'
import { useI18n } from '@/i18n/I18nContext'
import LoadingState from '@/components/common/LoadingState/LoadingState'
import ErrorState from '@/components/common/ErrorState/ErrorState'
import ExpenseHistorySummary from '@/features/expense/components/ExpenseHistorySummary'
import SavedExpenseDialog from '@/features/expense/components/SavedExpenseDialog'

function ExpenseHistoryPage() {
  const { t } = useI18n()
  const getCategoryLabel = (iconKey: string, fallback: string) => {
    const key = `category.${iconKey}`
    const translated = t(key)
    return translated === key ? fallback : translated
  }
  const currentYear = getCurrentYearMonth().slice(0, 4)
  const selectedMonth = String(Number(getCurrentYearMonth().slice(5)))
  const modalMonthOptions = Array.from({ length: 12 }, (_, index) => 12 - index)
  const [recentRange, setRecentRange] = useState('day')
  const [isSavedExpensesOpen, setIsSavedExpensesOpen] = useState(false)
  const [recentModalMonth, setRecentModalMonth] = useState(() => String(Number(getCurrentYearMonth().slice(5))))
  const { toast, showToast, closeToast } = useToastQueue()
  const {
    data,
    errorMessage,
    recentExpenses: savedExpenses,
    setRecentExpenses: setSavedExpenses,
    recentExpensesError,
    isInitialLoading,
    isBackgroundFetching,
    modalExpenses,
    isModalExpensesLoading,
    modalExpensesError,
    retry,
    deleteSavedExpense: deleteSavedExpenseMutation,
    updateSavedExpenseName: updateSavedExpenseNameMutation,
    isMutating,
  } = useExpenseHistoryData({
    yearMonth: `${currentYear}-${selectedMonth.padStart(2, '0')}`,
    range: recentRange,
    isRecentModalOpen: isSavedExpensesOpen,
    recentModalYearMonth: `${currentYear}-${recentModalMonth.padStart(2, '0')}`,
  })

  const handleDeleteExpense = async (expenseId: string) => {
    if (isMutating) return
    try {
      const deleted = await deleteSavedExpenseMutation(expenseId)
      if (!deleted) return
      setSavedExpenses((current) => current.filter((expense) => expense.expenseId !== expenseId))
      showToast({ variant: 'success', title: t('expenseHistory.deleteSuccess') })
    } catch (error) {
      showToast({
        variant: 'error',
        ...getApiErrorNotice(error, t('expenseHistory.deleteError')),
      })
    }
  }

  const filteredSavedExpenses = savedExpenses.filter((expense) => expense.spentAt.startsWith(`${currentYear}-${selectedMonth.padStart(2, '0')}`))

  const openSavedExpenses = () => {
    setRecentModalMonth(selectedMonth)
    setIsSavedExpensesOpen(true)
  }

  const closeSavedExpenses = () => {
    setIsSavedExpensesOpen(false)
  }

  const handleSaveExpenseName = async (expense: SavedExpense, nextName: string) => {
    if (!nextName) return false
    if (isMutating) return false

    try {
      const updated = await updateSavedExpenseNameMutation({ expense, merchantName: nextName })
      setSavedExpenses((current) => current.map((item) => (
        item.expenseId === updated.expenseId ? updated : item
      )))
      showToast({ variant: 'success', title: t('expenseHistory.updateSuccess') })
      return true
    } catch (error) {
      showToast({
        variant: 'error',
        ...getApiErrorNotice(error, t('expenseHistory.updateError')),
      })
      return false
    }
  }

  const mascotMessages = useMemo(() => {
    if (!data) return ["이번 달 예산에 맞게 잘 쓰고 있어요!"]

    const apiMessages = data?.mascotMessages
      .map((item) => item.message)
      .filter(Boolean) ?? []
    if (apiMessages.length > 0) return apiMessages

    const todayStr = new Date().toISOString().slice(0, 10)
    const todaySpentTotal = savedExpenses
      .filter((expense) => expense.spentAt.startsWith(todayStr))
      .reduce((sum, expense) => sum + (expense.convertedAmountHome ?? 0), 0)

    const formattedTodaySpent = formatCurrencyAmount(todaySpentTotal, data.homeCurrency)
    
    const dynamicTodayMsg: React.ReactNode = todaySpentTotal >= 50000
      ? (
        <>
          오늘{' '}
          <span style={{ color: '#6AADEA' }}>{formattedTodaySpent}</span>
          {' '}썼어요. 꽤 알차게 쓴 하루네요!
        </>
      )
      : (
        <>
          오늘{' '}
          <span style={{ color: '#6AADEA' }}>{formattedTodaySpent}</span>
          {' '}썼어요. 지출이 아주 알뜰한 하루네요!
        </>
      )

    let dynamicTopCategoryMsg: React.ReactNode = "이번달 지출 내역을 확인해보세요!"
    if (data.categories && data.categories.length > 0) {
      const topCategory = [...data.categories].sort((a, b) => b.amountHome - a.amountHome)[0]
      if (topCategory && topCategory.amountHome > 0) {
        dynamicTopCategoryMsg = `이번달 가장 많이 쓴 건 ${topCategory.categoryName}예요!`
      }
    }

    return [
      dynamicTodayMsg,
      dynamicTopCategoryMsg,
      "이번 달 예산에 맞게 잘 쓰고 있어요!"
    ]
  }, [savedExpenses, data])

  if (errorMessage) {
    return (
      <section className={`${styles.page} ${styles.feedbackPage}`} aria-labelledby="expense-history-title">
        <div className={styles.feedbackCard}>
          <h1 id="expense-history-title">{t('expenseHistory.title')}</h1>
          <ErrorState
            title={errorMessage}
            description={t('expenseHistory.retryDescription')}
            retryLabel={t('common.retry')}
            onRetry={retry}
          />
        </div>
      </section>
    )
  }
  if (!data && isInitialLoading) {
    return (
      <section className={`${styles.page} ${styles.feedbackPage}`} aria-busy="true">
        <div className={styles.feedbackCard}>
          <h1>{t('expenseHistory.title')}</h1>
          <LoadingState message={t('expenseHistory.loading')} />
        </div>
      </section>
    )
  }
  if (!data) return null

  return (
    <section className={styles.page} aria-labelledby="expense-history-title">
      {toast && <Toast key={toast.id} {...toast} onClose={closeToast} />}
      {isBackgroundFetching && <LoadingState size="sm" variant="inline" message={t('expenseHistory.loading')} />}
      <h1 id="expense-history-title" className={styles.srOnly}>{t('expenseHistory.title')}</h1>

      <ExpenseHistorySummary
        data={data}
        recentExpenses={data.recentExpenses}
        recentRange={recentRange}
        recentExpensesError={recentExpensesError}
        filteredSavedExpenses={filteredSavedExpenses}
        getCategoryLabel={getCategoryLabel}
        onRecentRangeChange={setRecentRange}
        onRetry={retry}
        onOpenSavedExpenses={openSavedExpenses}
      />

      <FloatingMascot
        messages={mascotMessages}
        imageSrc="/assets/illustrations/mascot-calendar.png"
        speechBubbleVariant="twoLine"
        className={styles.lowerMascot}
      />

      {isSavedExpensesOpen && (
        <SavedExpenseDialog
          currentYear={currentYear}
          selectedMonth={recentModalMonth}
          monthOptions={modalMonthOptions}
          expenses={modalExpenses}
          homeCurrency={data.homeCurrency}
          isLoading={isModalExpensesLoading}
          errorMessage={modalExpensesError}
          onMonthChange={setRecentModalMonth}
          onRetry={retry}
          onDelete={handleDeleteExpense}
          onSaveName={handleSaveExpenseName}
          isMutating={isMutating}
          onClose={closeSavedExpenses}
        />
      )}
    </section>
  )
}

export default ExpenseHistoryPage
