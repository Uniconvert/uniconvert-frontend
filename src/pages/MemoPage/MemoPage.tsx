import { useEffect, useMemo, useState } from 'react'
import { deleteExpenseMemos, getExpenseMemos, updateExpenseMemo } from '@/api/memos'
import FloatingMascot from '@/components/common/FloatingMascot/FloatingMascot'
import ModalShell from '@/components/common/ModalShell/ModalShell'
import Toast from '@/components/common/Toast/Toast'
import { useToastQueue } from '@/components/common/Toast/useToastQueue'
import type { ExpenseMemo } from '@/types/memo'
import { getApiErrorNotice } from '@/utils/apiError'
import { getCategoryIconPath } from '@/utils/categoryIcon'
import { useI18n } from '@/i18n/I18nContext'
import styles from './MemoPage.module.css'

type SortOrder = 'latest' | 'oldest'

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
    <ModalShell title={t('memo.editTitle')} titleId="memo-edit-title" closeLabel={t('memo.editClose')} width="44rem" bodyClassName={styles.editModalBody} onClose={onClose}>
      <div className={styles.modalDescription}>
        <h3>{t('memo.content')}</h3>
        <p>{t('memo.editDescription', { category: item.categoryName })}</p>
      </div>
      <label>
        <span className={styles.srOnly}>{t('memo.content')}</span>
        <textarea maxLength={200} value={memo} placeholder={t('memo.placeholder')} onChange={(event) => setMemo(event.target.value)} />
        <small>{memo.length}/200</small>
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
  const [memos, setMemos] = useState<ExpenseMemo[]>([])
  const [query, setQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<SortOrder>('latest')
  const [isSortOpen, setIsSortOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [editingMemo, setEditingMemo] = useState<ExpenseMemo | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [reloadKey, setReloadKey] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const { toast, showToast, closeToast } = useToastQueue()

  useEffect(() => {
    let isCancelled = false
    getExpenseMemos({ keyword: query, sort: sortOrder, page: page - 1 })
      .then((result) => {
        if (isCancelled) return
        setMemos(result.items)
        setTotalPages(result.totalPages)
        setTotalElements(result.totalElements)
        setSelectedIds([])
        setErrorMessage('')
      })
      .catch((error) => {
        if (!isCancelled) setErrorMessage(getApiErrorNotice(error, t('memo.loadError')).title)
      })
      .finally(() => { if (!isCancelled) setIsLoading(false) })
    return () => { isCancelled = true }
  }, [page, query, reloadKey, sortOrder, t])

  const mascotMessages = useMemo(() => [t('memo.mascot1'), t('memo.mascot2'), t('memo.mascot3')], [t])
  const currentPage = Math.min(page, Math.max(1, totalPages))

  const removeMemos = async (expenseIds: string[]) => {
    if (expenseIds.length === 0) return
    try {
      await deleteExpenseMemos(expenseIds)
      const remaining = memos.filter((memo) => !expenseIds.includes(memo.expenseId))
      setMemos(remaining)
      setTotalElements((current) => Math.max(0, current - expenseIds.length))
      setSelectedIds((current) => current.filter((id) => !expenseIds.includes(id)))
      setOpenMenuId(null)
      if (remaining.length === 0 && page > 1) setPage((current) => current - 1)
      else setReloadKey((current) => current + 1)
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
          <input type="search" value={query} placeholder={t('memo.search')} onChange={(event) => { setQuery(event.target.value); setPage(1) }} />
        </label>
        <div className={styles.toolbarActions}>
          <div className={styles.sortControl}>
            <button type="button" aria-haspopup="listbox" aria-expanded={isSortOpen} onClick={() => setIsSortOpen((open) => !open)}>{sortOrder === 'latest' ? t('memo.latest') : t('memo.oldest')}<span aria-hidden="true" /></button>
            {isSortOpen && <div className={styles.sortMenu} role="listbox" aria-label={t('memo.sort')}>
              <button type="button" role="option" aria-selected={sortOrder === 'latest'} onClick={() => { setSortOrder('latest'); setPage(1); setIsSortOpen(false) }}>{t('memo.latest')}</button>
              <button type="button" role="option" aria-selected={sortOrder === 'oldest'} onClick={() => { setSortOrder('oldest'); setPage(1); setIsSortOpen(false) }}>{t('memo.oldest')}</button>
            </div>}
          </div>
          <button className={styles.bulkDeleteButton} type="button" disabled={selectedIds.length === 0} onClick={() => removeMemos(selectedIds)}><img src="/assets/icons/actions/action-delete.png" alt="" aria-hidden="true" />{t('memo.delete')}</button>
        </div>
      </div>

      <section className={styles.memoListCard} aria-label={t('memo.list')}>
        {isLoading && <p className={styles.listMessage}>{t('memo.loading')}</p>}
        {errorMessage && <p className={styles.listMessage} role="alert">{errorMessage} <button type="button" onClick={() => { setErrorMessage(''); setIsLoading(true); setReloadKey((current) => current + 1) }}>{t('common.retry')}</button></p>}
        {!isLoading && !errorMessage && memos.length === 0 && <div className={styles.emptyState}>
          <img src="/assets/illustrations/mascot-checklist.png" alt="" aria-hidden="true" />
          <strong>{query ? t('memo.noSearch') : t('memo.noMemos')}</strong><p>{query ? t('memo.noSearchDescription') : t('memo.noMemosDescription')}</p>
        </div>}
        {!isLoading && memos.length > 0 && <ul>{memos.map((memo) => {
          const { date, time } = formatSpentAt(memo.spentAt, locale)
          const isSelected = selectedIds.includes(memo.expenseId)
          return <li key={memo.expenseId} className={isSelected ? styles.selectedRow : undefined}>
            <label className={styles.checkbox}><input type="checkbox" checked={isSelected} aria-label={t('memo.select', { memo: memo.memo })} onChange={() => setSelectedIds((ids) => ids.includes(memo.expenseId) ? ids.filter((id) => id !== memo.expenseId) : [...ids, memo.expenseId])} /><span aria-hidden="true" /></label>
            <span className={styles.categoryIcon}><img src={getCategoryIconPath(memo.iconKey)} alt="" aria-hidden="true" /></span><strong>{memo.categoryName}</strong><p title={memo.memo}>{memo.memo}</p>
            <time dateTime={memo.spentAt}><span>{date}</span><span>{time}</span></time>
            <div className={styles.rowMenu}><button type="button" aria-label={t('memo.menu', { memo: memo.memo })} aria-expanded={openMenuId === memo.expenseId} onClick={() => setOpenMenuId((current) => current === memo.expenseId ? null : memo.expenseId)}><span /><span /><span /></button>
              {openMenuId === memo.expenseId && <div className={styles.rowMenuPopup}><button type="button" onClick={() => { setEditingMemo(memo); setOpenMenuId(null) }}>{t('memo.edit')}</button><button type="button" onClick={() => removeMemos([memo.expenseId])}>{t('memo.delete')}</button></div>}
            </div>
          </li>
        })}</ul>}
      </section>

      {totalElements > 0 && <nav className={styles.pagination} aria-label={t('memo.pagination')}>
        <button type="button" aria-label={t('memo.previousPage')} disabled={currentPage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>‹</button>
        {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => <button type="button" key={pageNumber} aria-current={pageNumber === currentPage ? 'page' : undefined} onClick={() => setPage(pageNumber)}>{pageNumber}</button>)}
        <button type="button" aria-label={t('memo.nextPage')} disabled={currentPage === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>›</button>
      </nav>}

      <FloatingMascot
        messages={mascotMessages}
        imageSrc="/assets/illustrations/mascot-checklist.png"
        speechBubbleVariant="compact"
        className={styles.lowerMascot}
      />
      {editingMemo && <MemoEditModal item={editingMemo} onClose={() => setEditingMemo(null)} onSave={async (memo) => {
        try {
          const updated = await updateExpenseMemo(editingMemo, memo)
          if (!updated) throw new Error('Memo update failed')
          setMemos((current) => current.map((item) => item.expenseId === updated.expenseId ? updated : item))
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
