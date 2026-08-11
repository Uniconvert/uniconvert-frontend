import { useEffect, useState } from 'react'
import { deleteExpenseMemos, getExpenseMemos, updateExpenseMemo } from '@/api/memos'
import FloatingMascot from '@/components/common/FloatingMascot/FloatingMascot'
import ModalShell from '@/components/common/ModalShell/ModalShell'
import Toast from '@/components/common/Toast/Toast'
import { useToastQueue } from '@/components/common/Toast/useToastQueue'
import type { ExpenseMemo } from '@/types/memo'
import { getApiErrorNotice } from '@/utils/apiError'
import { getCategoryIconPath } from '@/utils/categoryIcon'
import styles from './MemoPage.module.css'

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

  return (
    <ModalShell
      title="메모 수정"
      titleId="memo-edit-title"
      closeLabel="메모 수정 닫기"
      width="44rem"
      bodyClassName={styles.editModalBody}
      onClose={onClose}
    >
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
            try {
              await onSave(memo)
            } finally {
              setIsSaving(false)
            }
          }}
        >
          {isSaving ? '저장 중...' : '저장하기'}
        </button>
      </div>
    </ModalShell>
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
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [reloadKey, setReloadKey] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const { toast, showToast, closeToast } = useToastQueue()

  // 마스코트 정적 메시지 풀 정의
  const mascotMessages = [
    "지출할 때 남긴 메모들, 여기 다 모여있어요!",
    "그때 왜 지출했는지 기억나죠? 메모 덕분이에요 :)",
    "작은 기록이 나중에 도움이 많이 돼요!"
  ]

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
        if (isCancelled) return
        setErrorMessage(getApiErrorNotice(error, '메모를 불러오지 못했습니다.').title)
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false)
      })

    return () => {
      isCancelled = true
    }
  }, [page, query, reloadKey, sortOrder])

  const currentPage = Math.min(page, Math.max(1, totalPages))
  const visibleMemos = memos

  const toggleSelection = (expenseId: string) => {
    setSelectedIds((current) =>
      current.includes(expenseId)
        ? current.filter((id) => id !== expenseId)
        : [...current, expenseId],
    )
  }

  const removeMemos = async (expenseIds: string[]) => {
    if (expenseIds.length === 0) return
    try {
      await deleteExpenseMemos(expenseIds)
      const remainingItems = memos.filter((memo) => !expenseIds.includes(memo.expenseId))
      setMemos(remainingItems)
      setTotalElements((current) => Math.max(0, current - expenseIds.length))
      setSelectedIds((current) => current.filter((id) => !expenseIds.includes(id)))
      setOpenMenuId(null)
      if (remainingItems.length === 0 && page > 1) {
        setPage((current) => current - 1)
      } else {
        setReloadKey((current) => current + 1)
      }
    } catch (error) {
      showToast({
        variant: 'error',
        ...getApiErrorNotice(error, '메모 삭제에 실패했습니다.'),
      })
    }
  }

  return (
    <section className={styles.page} aria-labelledby="memo-page-title">
      {toast && <Toast key={toast.id} {...toast} onClose={closeToast} />}
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

      {totalElements > 0 && (
        <nav className={styles.pagination} aria-label="메모 페이지">
          <button type="button" aria-label="이전 페이지" disabled={currentPage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>‹</button>
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
            <button type="button" key={pageNumber} aria-current={pageNumber === currentPage ? 'page' : undefined} onClick={() => setPage(pageNumber)}>{pageNumber}</button>
          ))}
          <button type="button" aria-label="다음 페이지" disabled={currentPage === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>›</button>
        </nav>
      )}

      <FloatingMascot
        messages={mascotMessages}
        imageSrc="/assets/illustrations/mascot-checklist.png"
      />

      {editingMemo && (
        <MemoEditModal
          item={editingMemo}
          onClose={() => setEditingMemo(null)}
          onSave={async (memo) => {
            try {
              const updated = await updateExpenseMemo(editingMemo, memo)
              if (!updated) throw new Error('Memo update failed')
              setMemos((current) => current.map((item) => item.expenseId === updated.expenseId ? updated : item))
              setEditingMemo(null)
              showToast({ variant: 'success', title: '수정되었어요' })
            } catch (error) {
              showToast({
                variant: 'error',
                ...getApiErrorNotice(error, '메모를 수정하지 못했습니다.'),
              })
            }
          }}
        />
      )}
    </section>
  )
}

export default MemoPage