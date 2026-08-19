import { useMemo, useRef, useState } from 'react'
import FloatingMascot from '@/components/common/FloatingMascot/FloatingMascot'
import ModalShell from '@/components/common/ModalShell/ModalShell'
import Toast from '@/components/common/Toast/Toast'
import { useToastQueue } from '@/components/common/Toast/useToastQueue'
import type { ExpenseMemo } from '@/types/memo'
import { getApiErrorNotice } from '@/utils/apiError'
import { getCategoryIconPath } from '@/utils/categoryIcon'
import { useI18n } from '@/i18n/I18nContext'
import styles from './MemoPage.module.css'
import LoadingState from '@/components/common/LoadingState/LoadingState'
import EmptyState from '@/components/common/EmptyState/EmptyState'
import ErrorState from '@/components/common/ErrorState/ErrorState'
import { useMemoData } from '@/hooks/useMemoData'
import { useListboxKeyboard } from '@/hooks/useListboxKeyboard'

type SortOrder = 'latest' | 'oldest'

interface MemoSortControlProps {
  value: SortOrder
  latestLabel: string
  oldestLabel: string
  ariaLabel: string
  onChange: (value: SortOrder) => void
}

function MemoSortControl({ value, latestLabel, oldestLabel, ariaLabel, onChange }: MemoSortControlProps) {
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const options = [
    { value: 'latest' as const, label: latestLabel },
    { value: 'oldest' as const, label: oldestLabel },
  ]
  const selectedIndex = options.findIndex((option) => option.value === value)
  const {
    listboxId,
    activeDescendantId,
    onTriggerClick,
    onTriggerKeyDown,
    onOptionClick,
    onOptionPointerMove,
    getOptionId,
  } = useListboxKeyboard({
    open: isOpen,
    optionCount: options.length,
    selectedIndex,
    onOpen: () => setIsOpen(true),
    onClose: () => setIsOpen(false),
    onSelect: (index) => onChange(options[index].value),
    rootRef,
  })

  return (
    <div className={styles.sortControl} ref={rootRef}>
      <button
        className={styles.sortButton}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-activedescendant={activeDescendantId}
        onKeyDown={onTriggerKeyDown}
        onClick={onTriggerClick}
      >
        <span>{options[selectedIndex]?.label ?? latestLabel}</span>
        <span className={styles.sortChevron} aria-hidden="true" />
      </button>
      {isOpen && (
        <div id={listboxId} className={styles.sortMenu} role="listbox" aria-label={ariaLabel}>
          {options.map((option, index) => (
            <button
              key={option.value}
              type="button"
              role="option"
              id={getOptionId(index)}
              tabIndex={-1}
              aria-selected={value === option.value}
              onMouseEnter={() => onOptionPointerMove(index)}
              onClick={() => onOptionClick(index)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function formatSpentAt(spentAt: string, locale: string) {
  const date = new Date(spentAt)
  if (!Number.isNaN(date.getTime())) {
    return {
      date: new Intl.DateTimeFormat(locale, { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date),
      time: new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hour12: false }).format(date),
    }
  }
  const [datePart, timePart = ''] = spentAt.split('T')
  return { date: datePart.replaceAll('-', '.'), time: timePart.slice(0, 5) }
}

function MemoEditModal({ item, onClose, onSave }: { item: ExpenseMemo; onClose: () => void; onSave: (memo: string) => Promise<void> }) {
  const { t } = useI18n()
  const [memo, setMemo] = useState(item.memo)
  const [isSaving, setIsSaving] = useState(false)

  return (
    <ModalShell title={t('memo.editTitle')} titleId="memo-edit-title" closeLabel={t('memo.editClose')} width="44rem" dialogClassName={styles.editModalDialog} bodyClassName={styles.editModalBody} onClose={onClose}>
      <div className={styles.modalDescription}>
        <h3>{t('memo.content')}</h3>
        <p>{t('memo.editDescription', { category: item.categoryName })}</p>
      </div>
      <label>
        <span className={styles.srOnly}>{t('memo.content')}</span>
        <textarea maxLength={200} value={memo} placeholder={t('memo.placeholder')} onChange={(event) => setMemo(event.target.value)} />
        <small aria-live="polite">{memo.length}/200</small>
      </label>
      <div className={styles.modalActions}>
        <button type="button" onClick={onClose}>{t('common.cancel')}</button>
        <button type="button" disabled={memo.trim().length === 0 || isSaving} onClick={async () => {
          setIsSaving(true)
          try { await onSave(memo) } finally { setIsSaving(false) }
        }}>{isSaving ? t('common.saving') : t('common.save')}</button>
      </div>
    </ModalShell>
  )
}

function MemoPage() {
  const { locale, t } = useI18n()
  const [query, setQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<SortOrder>('latest')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [editingMemo, setEditingMemo] = useState<ExpenseMemo | null>(null)
  const [page, setPage] = useState(1)
  const { toast, showToast, closeToast } = useToastQueue()
  const { query: memoQuery, deleteMemos, updateMemo, isDeleting } = useMemoData({
    keyword: query,
    sort: sortOrder,
    page: page - 1,
  })
  const memos = memoQuery.data?.items ?? []
  const totalPages = memoQuery.data?.totalPages ?? 0
  const totalElements = memoQuery.data?.totalElements ?? 0
  const isInitialLoading = memoQuery.isLoading
  const isBackgroundFetching = memoQuery.isFetching && !memoQuery.isLoading
  const errorMessage = memoQuery.error && !memoQuery.data
    ? getApiErrorNotice(memoQuery.error, t('memo.loadError')).title
    : ''

  const mascotMessages = useMemo(() => [t('memo.mascot1'), t('memo.mascot2'), t('memo.mascot3')], [t])
  const currentPage = Math.min(page, Math.max(1, totalPages))
  const retryLoad = () => { void memoQuery.refetch() }

  const removeMemos = async (expenseIds: string[]) => {
    if (expenseIds.length === 0 || isDeleting) return
    try {
      await deleteMemos(expenseIds)
      setSelectedIds((current) => current.filter((id) => !expenseIds.includes(id)))
      setOpenMenuId(null)
      if (memos.length === expenseIds.length && page > 1) setPage((current) => current - 1)
    } catch (error) {
      showToast({ variant: 'error', ...getApiErrorNotice(error, t('memo.deleteError')) })
    }
  }

  return (
    <section className={styles.page} aria-labelledby="memo-page-title">
      {toast && <Toast key={toast.id} {...toast} onClose={closeToast} />}
      <header className={styles.pageHeader}><h1 id="memo-page-title">{t('memo.title')}</h1><p>{t('memo.description')}</p></header>

      <div className={styles.toolbar}>
        <label className={styles.searchField}>
          <span className={styles.searchIcon} aria-hidden="true" />
          <span className={styles.srOnly}>{t('memo.search')}</span>
          <input type="search" value={query} placeholder={t('memo.search')} onChange={(event) => { setSelectedIds([]); setQuery(event.target.value); setPage(1) }} />
        </label>
        <div className={styles.toolbarActions}>
          <MemoSortControl
            value={sortOrder}
            latestLabel={t('memo.latest')}
            oldestLabel={t('memo.oldest')}
            ariaLabel={t('memo.sort')}
            onChange={(nextSortOrder) => {
              setSelectedIds([])
              setSortOrder(nextSortOrder)
              setPage(1)
            }}
          />
          <button className={styles.bulkDeleteButton} type="button" disabled={selectedIds.length === 0} onClick={() => removeMemos(selectedIds)}><img src="/assets/icons/actions/action-delete.png" alt="" aria-hidden="true" />{t('memo.delete')}</button>
        </div>
      </div>

      <section className={styles.memoListCard} aria-label={t('memo.list')}>
        {isInitialLoading && <LoadingState message={t('memo.loading')} />}
        {isBackgroundFetching && <LoadingState size="sm" variant="inline" message={t('memo.loading')} />}
        {errorMessage && <ErrorState title={errorMessage} retryLabel={t('common.retry')} onRetry={retryLoad} variant={memos.length > 0 ? 'compact' : 'default'} />}
        {!memoQuery.isFetching && !errorMessage && memos.length === 0 && <div className={styles.emptyState}>
          <EmptyState
            icon={<img src="/assets/illustrations/mascot-checklist.png" alt="" />}
            title={query ? t('memo.noSearch') : t('memo.noMemos')}
            description={query ? t('memo.noSearchDescription') : t('memo.noMemosDescription')}
            variant="compact"
          />
        </div>}
        {!isInitialLoading && memos.length > 0 && <ul>{memos.map((memo) => {
          const { date, time } = formatSpentAt(memo.spentAt, locale)
          const isSelected = selectedIds.includes(memo.expenseId)
          return <li key={memo.expenseId} className={isSelected ? styles.selectedRow : undefined}>
            <label className={styles.checkbox}><input type="checkbox" checked={isSelected} aria-label={t('memo.select', { memo: memo.memo })} onChange={() => setSelectedIds((ids) => ids.includes(memo.expenseId) ? ids.filter((id) => id !== memo.expenseId) : [...ids, memo.expenseId])} /><span aria-hidden="true" /></label>
            <span className={styles.categoryIcon}><img src={getCategoryIconPath(memo.iconKey)} alt="" aria-hidden="true" /></span><strong>{memo.categoryName}</strong><p title={memo.memo}>{memo.memo}</p>
            <time dateTime={memo.spentAt}><span>{date}</span><span>{time}</span></time>
            <div className={styles.rowMenu}><button type="button" aria-label={t('memo.menu', { memo: memo.memo })} aria-expanded={openMenuId === memo.expenseId} onClick={() => setOpenMenuId((current) => current === memo.expenseId ? null : memo.expenseId)}><span /><span /><span /></button>
              {openMenuId === memo.expenseId && <div className={styles.rowMenuPopup}><button type="button" onClick={() => { setEditingMemo(memo); setOpenMenuId(null) }}>{t('memo.edit')}</button><button type="button" disabled={isDeleting} onClick={() => removeMemos([memo.expenseId])}>{t('memo.delete')}</button></div>}
            </div>
          </li>
        })}</ul>}
      </section>

      {totalElements > 0 && <nav className={styles.pagination} aria-label={t('memo.pagination')}>
        <button type="button" aria-label={t('memo.previousPage')} disabled={currentPage === 1} onClick={() => { setSelectedIds([]); setPage((current) => Math.max(1, current - 1)) }}>‹</button>
        {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => <button type="button" key={pageNumber} aria-current={pageNumber === currentPage ? 'page' : undefined} onClick={() => { setSelectedIds([]); setPage(pageNumber) }}>{pageNumber}</button>)}
        <button type="button" aria-label={t('memo.nextPage')} disabled={currentPage === totalPages} onClick={() => { setSelectedIds([]); setPage((current) => Math.min(totalPages, current + 1)) }}>›</button>
      </nav>}

      <FloatingMascot
        messages={mascotMessages}
        imageSrc="/assets/illustrations/mascot-checklist.png"
        speechBubbleVariant="compact"
        speechBubbleClassName={styles.memoSpeechBubble}
        className={styles.lowerMascot}
      />
      {editingMemo && <MemoEditModal item={editingMemo} onClose={() => setEditingMemo(null)} onSave={async (memo) => {
        try {
          const updated = await updateMemo({ expense: editingMemo, memo })
          if (!updated) throw new Error('Memo update failed')
          setEditingMemo(null)
          showToast({ variant: 'success', title: t('memo.saved') })
        } catch (error) {
          showToast({ variant: 'error', ...getApiErrorNotice(error, t('memo.updateError')) })
        }
      }} />}
    </section>
  )
}

export default MemoPage
