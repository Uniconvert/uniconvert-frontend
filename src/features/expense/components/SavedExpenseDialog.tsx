import { useRef, useState } from 'react'
import ModalShell from '@/components/common/ModalShell/ModalShell'
import LoadingState from '@/components/common/LoadingState/LoadingState'
import EmptyState from '@/components/common/EmptyState/EmptyState'
import ErrorState from '@/components/common/ErrorState/ErrorState'
import { useListboxKeyboard } from '@/hooks/useListboxKeyboard'
import type { SavedExpense } from '@/types/expense'
import { formatCurrencyAmount } from '@/utils/currency'
import { getCategoryIconPath } from '@/utils/categoryIcon'
import { useI18n } from '@/i18n/I18nContext'
import styles from '@/features/expense/expenseHistory.module.css'

interface SavedExpenseDialogProps {
  currentYear: string
  selectedMonth: string
  monthOptions: number[]
  expenses: SavedExpense[]
  homeCurrency: string
  isLoading: boolean
  errorMessage: string
  onMonthChange: (month: string) => void
  onRetry: () => void
  onDelete: (expenseId: string) => void | Promise<void>
  onSaveName: (expense: SavedExpense, name: string) => boolean | void | Promise<boolean | void>
  isMutating?: boolean
  onClose: () => void
}

function SavedExpenseDialog({
  currentYear,
  selectedMonth,
  monthOptions,
  expenses,
  homeCurrency,
  isLoading,
  errorMessage,
  onMonthChange,
  onRetry,
  onDelete,
  onSaveName,
  isMutating = false,
  onClose,
}: SavedExpenseDialogProps) {
  const { t } = useI18n()
  const [isManaging, setIsManaging] = useState(false)
  const [isMonthMenuOpen, setIsMonthMenuOpen] = useState(false)
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null)
  const [editingExpenseName, setEditingExpenseName] = useState('')
  const monthPickerRef = useRef<HTMLDivElement>(null)
  const monthListbox = useListboxKeyboard({
    open: isMonthMenuOpen,
    optionCount: monthOptions.length,
    selectedIndex: monthOptions.findIndex((month) => selectedMonth === String(month)),
    onOpen: () => setIsMonthMenuOpen(true),
    onClose: () => setIsMonthMenuOpen(false),
    onSelect: (index) => {
      onMonthChange(String(monthOptions[index]))
      setIsMonthMenuOpen(false)
    },
    rootRef: monthPickerRef,
  })

  const cancelEditing = () => {
    setEditingExpenseId(null)
    setEditingExpenseName('')
  }

  const startEditing = (expense: SavedExpense) => {
    setEditingExpenseId(expense.expenseId)
    setEditingExpenseName(expense.merchantName)
  }

  const saveName = async (expense: SavedExpense) => {
    const nextName = editingExpenseName.trim()
    if (!nextName) return
    const saved = await onSaveName(expense, nextName)
    if (saved !== false) cancelEditing()
  }

  const toggleManaging = () => {
    setIsManaging((current) => !current)
    cancelEditing()
  }

  return (
    <ModalShell
      title={t('expenseHistory.recentExpenses')}
      titleId="saved-modal-title"
      width="50rem"
      minHeight="35rem"
      dialogClassName={styles.savedModalDialog}
      bodyClassName={styles.savedModalBody}
      showCloseButton={false}
      headerSupplement={(
        <div className={styles.monthPicker} ref={monthPickerRef}>
          <button
            type="button"
            aria-label={t('expenseHistory.monthSelect')}
            aria-haspopup="listbox"
            aria-expanded={isMonthMenuOpen}
            aria-controls={monthListbox.listboxId}
            aria-activedescendant={monthListbox.activeDescendantId}
            onKeyDown={monthListbox.onTriggerKeyDown}
            onClick={monthListbox.onTriggerClick}
          >
            <span>{currentYear}.{selectedMonth.padStart(2, '0')}</span>
            <span className={styles.pickerChevron} aria-hidden="true" />
          </button>
          {isMonthMenuOpen && (
            <div id={monthListbox.listboxId} className={styles.monthMenu} role="listbox" aria-label={t('expenseHistory.monthSelect')}>
              {monthOptions.map((month, index) => (
                <button
                  key={month}
                  type="button"
                  role="option"
                  id={monthListbox.getOptionId(index)}
                  tabIndex={-1}
                  aria-selected={selectedMonth === String(month)}
                  onMouseEnter={() => monthListbox.onOptionPointerMove(index)}
                  onClick={() => monthListbox.onOptionClick(index)}
                >
                  {currentYear}.{String(month).padStart(2, '0')}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      headerActions={(
        <button
          className={`${styles.manageButton} ${isManaging ? styles.manageButtonActive : ''}`}
          type="button"
          aria-label={isManaging ? t('expenseHistory.editDone') : t('expenseHistory.edit')}
          onClick={toggleManaging}
        >
          {isManaging ? t('expenseHistory.done') : <img src="/assets/icons/actions/action-edit-recent.png" alt="" aria-hidden="true" />}
        </button>
      )}
      onClose={onClose}
    >
      <ul>
        {isLoading && <li className={styles.emptySaved}><LoadingState size="sm" variant="inline" message={t('expenseHistory.loadingModal')} /></li>}
        {!isLoading && errorMessage && <li className={styles.emptySaved}><ErrorState title={errorMessage} retryLabel={t('common.retry')} onRetry={onRetry} variant="compact" /></li>}
        {!isLoading && !errorMessage && expenses.map((expense) => (
          <li key={expense.expenseId} className={isManaging ? styles.managedExpense : ''}>
            <div className={styles.savedExpenseMain}>
              <span className={styles.expenseIcon}><img src={getCategoryIconPath(expense.iconKey)} alt="" aria-hidden="true" /></span>
              <span className={styles.savedExpenseMeta}>
                {editingExpenseId === expense.expenseId ? (
                  <form
                    className={styles.nameEditForm}
                    onSubmit={(event) => {
                      event.preventDefault()
                      void saveName(expense)
                    }}
                  >
                    <input
                      type="text"
                      value={editingExpenseName}
                      maxLength={40}
                      aria-label={t('expenseHistory.editName', { name: expense.merchantName })}
                      autoFocus
                      onChange={(event) => setEditingExpenseName(event.target.value)}
                      onKeyDown={(event) => { if (event.key === 'Escape') cancelEditing() }}
                    />
                    <button type="submit" disabled={!editingExpenseName.trim() || isMutating}>{t('common.save')}</button>
                    <button type="button" onClick={cancelEditing}>{t('common.cancel')}</button>
                  </form>
                ) : (
                  <b>
                    {expense.merchantName}
                    {isManaging && (
                      <button
                        className={styles.nameEditButton}
                        type="button"
                        aria-label={t('expenseHistory.editName', { name: expense.merchantName })}
                        onClick={() => startEditing(expense)}
                      >
                        <img className={styles.nameEditIcon} src="/assets/icons/actions/action-edit-name.png" alt="" aria-hidden="true" />
                      </button>
                    )}
                  </b>
                )}
                <small>{expense.spentAt.slice(0, 10).replaceAll('-', '.')}</small>
              </span>
            </div>
            <strong>{formatCurrencyAmount(expense.convertedAmountHome, homeCurrency)}</strong>
            {isManaging && (
                <button
                  className={styles.modalDelete}
                  type="button"
                  disabled={isMutating}
                aria-label={t('expenseHistory.deleteName', { name: expense.merchantName })}
                onClick={() => { void onDelete(expense.expenseId) }}
              >
                <img src="/assets/icons/actions/action-delete.png" alt="" aria-hidden="true" />
              </button>
            )}
          </li>
        ))}
        {!isLoading && !errorMessage && expenses.length === 0 && (
          <li className={styles.emptyModalState}>
            <EmptyState
              icon={<img src="/assets/illustrations/mascot-checklist.png" alt="" />}
              title={t('expenseHistory.emptyModal')}
              description={t('expenseHistory.emptyModalDescription')}
              variant="compact"
            />
          </li>
        )}
      </ul>
      <button className={styles.closeModalButton} type="button" onClick={onClose}>{t('common.close')}</button>
    </ModalShell>
  )
}

export default SavedExpenseDialog
