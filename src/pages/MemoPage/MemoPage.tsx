import { useEffect, useMemo, useState } from 'react'
import { deleteExpenseMemos, getExpenseMemos, updateExpenseMemo } from '@/api/memos'
import FloatingMascot from '@/components/common/FloatingMascot/FloatingMascot'
import type { ExpenseMemo } from '@/types/memo'
import { getCategoryIconPath } from '@/utils/categoryIcon'
import styles from './MemoPage.module.css'

const PAGE_SIZE = 6
type SortOrder = 'latest' | 'oldest'

function formatSpentAt(spentAt: string) {
  const [datePart, timePart = ''] = spentAt.split('T')
  return { date: datePart.replaceAll('-', '.'), time: timePart.slice(0, 5) }
}

function MemoEditModal({
  item,
  onClose,
  onSave,
}: {
  item: ExpenseMemo
  onClose: () => void
  onSave: (memo: string) => Promise<void>
}) {
  const [memo, setMemo] = useState(item.memo)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      className={styles.modalBackdrop}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className={styles.modalShell}>
        <span className={styles.modalBookmark} aria-hidden="true" />
        <section className={styles.editModal} role="dialog" aria-modal="true" aria-labelledby="memo-edit-title">
          <header>
            <h2 id="memo-edit-title">메모 수정</h2>
            <button type="button" aria-label="메모 수정 닫기" onClick={onClose}>×</button>
          </header>

          <div className={styles.modalDescription}>
            <h3>메모 내용</h3>
            <p>{item.categoryName} 지출에 기록한 메모를 수정해주세요.</p>
          </div>

          <label>
            <span className={styles.srOnly}>메모 내용</span>
            <textarea
              maxLength={200}
              value={memo}
              placeholder="메모를 입력하세요"
              onChange={(event) => setMemo(event.target.value)}
            />
            <small>{memo.length}/200</small>
          </label>

          <div className={styles.modalActions}>
            <button type="button" onClick={onClose}>취소</button>
            <button
              type="button"
              disabled={memo.trim().length === 0 || isSaving}
              onClick={async () => {
                setIsSaving(true)
                await onSave(memo)
                setIsSaving(false)
              }}
            >
              {isSaving ? '저장 중...' : '저장하기'}
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}

function MemoPage() {
  const [memos, setMemos] = useState<ExpenseMemo[]>([])
  const [query, setQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<SortOrder>('latest')
  const [isSortOpen, setIsSortOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [editingMemo, setEditingMemo] = useState<ExpenseMemo | null>(null)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    getExpenseMemos()
      .then(setMemos)
      .catch(() => setErrorMessage('메모를 불러오지 못했습니다.'))
      .finally(() => setIsLoading(false))
  }, [])

  const filteredMemos = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ko-KR')
    return [...memos]
      .filter((memo) => {
        if (!normalizedQuery) return true
        return [memo.memo, memo.categoryName, memo.merchantName]
          .some((value) => value.toLocaleLowerCase('ko-KR').includes(normalizedQuery))
      })
      .sort((a, b) => {
        const comparison = a.spentAt.localeCompare(b.spentAt)
        return sortOrder === 'latest' ? -comparison : comparison
      })
  }, [memos, query, sortOrder])

  const totalPages = Math.max(1, Math.ceil(filteredMemos.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const visibleMemos = filteredMemos.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const toggleSelection = (expenseId: string) => {
    setSelectedIds((current) =>
      current.includes(expenseId)
        ? current.filter((id) => id !== expenseId)
        : [...current, expenseId],
    )
  }

  const removeMemos = async (expenseIds: string[]) => {
    if (expenseIds.length === 0) return
    await deleteExpenseMemos(expenseIds)
    setMemos((current) => current.filter((memo) => !expenseIds.includes(memo.expenseId)))
    setSelectedIds((current) => current.filter((id) => !expenseIds.includes(id)))
    setOpenMenuId(null)
  }

  return (
    <section className={styles.page} aria-labelledby="memo-page-title">
      <header className={styles.pageHeader}>
        <h1 id="memo-page-title">메모 모아보기</h1>
        <p>메모를 수정하고 관리할 수 있어요</p>
      </header>

      <div className={styles.toolbar}>
        <label className={styles.searchField}>
          <span className={styles.searchIcon} aria-hidden="true" />
          <span className={styles.srOnly}>메모 검색</span>
          <input
            type="search"
            value={query}
            placeholder="메모 검색"
            onChange={(event) => {
              setQuery(event.target.value)
              setPage(1)
            }}
          />
        </label>

        <div className={styles.toolbarActions}>
          <div className={styles.sortControl}>
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={isSortOpen}
              onClick={() => setIsSortOpen((open) => !open)}
            >
              {sortOrder === 'latest' ? '최신순' : '오래된 순'}
              <span aria-hidden="true" />
            </button>
            {isSortOpen && (
              <div className={styles.sortMenu} role="listbox" aria-label="메모 정렬">
                <button type="button" role="option" aria-selected={sortOrder === 'latest'} onClick={() => { setSortOrder('latest'); setPage(1); setIsSortOpen(false) }}>최신순</button>
                <button type="button" role="option" aria-selected={sortOrder === 'oldest'} onClick={() => { setSortOrder('oldest'); setPage(1); setIsSortOpen(false) }}>오래된 순</button>
              </div>
            )}
          </div>

          <button
            className={styles.bulkDeleteButton}
            type="button"
            disabled={selectedIds.length === 0}
            onClick={() => removeMemos(selectedIds)}
          >
            <img src="/assets/icons/actions/action-delete.png" alt="" aria-hidden="true" />
            삭제
          </button>
        </div>
      </div>

      <section className={styles.memoListCard} aria-label="메모 목록">
        {isLoading && <p className={styles.listMessage}>메모를 불러오는 중입니다.</p>}
        {errorMessage && <p className={styles.listMessage} role="alert">{errorMessage}</p>}
        {!isLoading && !errorMessage && visibleMemos.length === 0 && (
          <div className={styles.emptyState}>
            <img src="/assets/illustrations/mascot-checklist.png" alt="" aria-hidden="true" />
            <strong>{query ? '검색 결과가 없어요' : '작성된 메모가 없어요'}</strong>
            <p>{query ? '다른 검색어로 다시 찾아보세요.' : '지출 입력에서 메모를 남겨보세요.'}</p>
          </div>
        )}

        {!isLoading && visibleMemos.length > 0 && (
          <ul>
            {visibleMemos.map((memo) => {
              const { date, time } = formatSpentAt(memo.spentAt)
              const isSelected = selectedIds.includes(memo.expenseId)
              return (
                <li key={memo.expenseId} className={isSelected ? styles.selectedRow : undefined}>
                  <label className={styles.checkbox}>
                    <input type="checkbox" checked={isSelected} aria-label={`${memo.memo} 선택`} onChange={() => toggleSelection(memo.expenseId)} />
                    <span aria-hidden="true" />
                  </label>
                  <span className={styles.categoryIcon}><img src={getCategoryIconPath(memo.iconKey)} alt="" aria-hidden="true" /></span>
                  <strong>{memo.categoryName}</strong>
                  <p title={memo.memo}>{memo.memo}</p>
                  <time dateTime={memo.spentAt}><span>{date}</span><span>{time || '—'}</span></time>

                  <div className={styles.rowMenu}>
                    <button type="button" aria-label={`${memo.memo} 메뉴`} aria-expanded={openMenuId === memo.expenseId} onClick={() => setOpenMenuId((current) => current === memo.expenseId ? null : memo.expenseId)}>
                      <span /><span /><span />
                    </button>
                    {openMenuId === memo.expenseId && (
                      <div className={styles.rowMenuPopup}>
                        <button type="button" onClick={() => { setEditingMemo(memo); setOpenMenuId(null) }}>수정</button>
                        <button type="button" onClick={() => removeMemos([memo.expenseId])}>삭제</button>
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {filteredMemos.length > 0 && (
        <nav className={styles.pagination} aria-label="메모 페이지">
          <button type="button" aria-label="이전 페이지" disabled={currentPage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>‹</button>
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
            <button type="button" key={pageNumber} aria-current={pageNumber === currentPage ? 'page' : undefined} onClick={() => setPage(pageNumber)}>{pageNumber}</button>
          ))}
          <button type="button" aria-label="다음 페이지" disabled={currentPage === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>›</button>
        </nav>
      )}

      <FloatingMascot
        message="메모를 수정하고 관리할 수 있어요"
        imageSrc="/assets/illustrations/mascot-checklist.png"
      />

      {editingMemo && (
        <MemoEditModal
          item={editingMemo}
          onClose={() => setEditingMemo(null)}
          onSave={async (memo) => {
            const updated = await updateExpenseMemo(editingMemo.expenseId, memo)
            if (updated) setMemos((current) => current.map((item) => item.expenseId === updated.expenseId ? updated : item))
            setEditingMemo(null)
          }}
        />
      )}
    </section>
  )
}

export default MemoPage
