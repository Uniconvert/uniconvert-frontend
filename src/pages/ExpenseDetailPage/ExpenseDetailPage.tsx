import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { deleteExpense, getExpenseDetail, updateExpense } from '@/api/expenses'
import Button from '@/components/common/Button/Button'
import { ROUTE_PATHS } from '@/routes/routePaths'
import type { ExpenseDetail } from '@/types/expense'
import styles from './ExpenseDetailPage.module.css'

const categoryOptions = [
  { label: '식비', icon: '/assets/icons/categories/category-food.png' },
  { label: '교통', icon: '/assets/icons/categories/category-transport.png' },
  { label: '의료', icon: '/assets/icons/categories/category-medical.png' },
  { label: '학비', icon: '/assets/icons/categories/category-education.png' },
  { label: '여행', icon: '/assets/icons/categories/category-travel.png' },
]

function ExpenseDetailPage() {
  const navigate = useNavigate()
  const { expenseId = '' } = useParams()
  const [expense, setExpense] = useState<ExpenseDetail | null>(null)
  const [draft, setDraft] = useState<ExpenseDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isActive = true

    getExpenseDetail(expenseId)
      .then((response) => {
        if (isActive) {
          setExpense(response)
          setDraft(response)
          setIsLoading(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [expenseId])

  if (isLoading) return <p aria-live="polite">지출 상세를 불러오는 중입니다.</p>

  if (!expense || !draft) {
    return (
      <section className={styles.notFound} aria-labelledby="expense-not-found-title">
        <span aria-hidden="true">!</span>
        <h1 id="expense-not-found-title">지출 내역을 찾을 수 없습니다</h1>
        <p>삭제되었거나 잘못된 주소로 접근한 지출입니다.</p>
        <Button onClick={() => navigate(ROUTE_PATHS.expenses)}>지출 내역으로 돌아가기</Button>
      </section>
    )
  }

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const category = categoryOptions.find((item) => item.label === draft.categoryName)
    const nextDraft = { ...draft, iconKey: category?.icon.split('category-')[1]?.replace('.png', '') ?? draft.iconKey }
    setIsSaving(true)
    setErrorMessage('')

    try {
      const updated = await updateExpense(expenseId, nextDraft)
      if (updated) {
        setExpense(updated)
        setDraft(updated)
        setIsEditing(false)
      }
    } catch {
      setErrorMessage('지출을 수정하지 못했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    setErrorMessage('')

    try {
      const deleted = await deleteExpense(expenseId)
      if (deleted) navigate(ROUTE_PATHS.expenses)
    } catch {
      setErrorMessage('지출을 삭제하지 못했습니다.')
      setIsDeleteOpen(false)
    } finally {
      setIsDeleting(false)
    }
  }

  const cancelEdit = () => {
    setDraft(expense)
    setIsEditing(false)
  }

  return (
    <section className={styles.page} aria-labelledby="expense-detail-title">
      <header className={styles.pageHeader}>
        <button className={styles.backButton} type="button" onClick={() => navigate(ROUTE_PATHS.expenses)} aria-label="지출 내역으로 돌아가기">←</button>
        <div>
          <span>Expense detail</span>
          <h1 id="expense-detail-title">지출 상세</h1>
        </div>
        {!isEditing && (
          <div className={styles.headerActions}>
            <Button variant="outline" onClick={() => setIsDeleteOpen(true)}>삭제</Button>
            <Button onClick={() => setIsEditing(true)}>수정</Button>
          </div>
        )}
      </header>

      <div className={styles.contentGrid}>
        <form className={styles.detailCard} onSubmit={handleSave}>
          <section className={styles.amountSection} aria-label="지출 금액 정보">
            <div className={styles.categoryBadge}>
              <img src={`/assets/icons/categories/category-${expense.iconKey}.png`} alt="" aria-hidden="true" />
            </div>
            <div>
              <span>결제 금액</span>
              <strong>{expense.currency} {expense.originalAmount.toLocaleString('en-US', { maximumFractionDigits: 2 })}</strong>
              <p>KRW {expense.convertedAmountHome.toLocaleString('ko-KR')}</p>
            </div>
            <div className={styles.rateInfo}>
              <span>적용 환율</span>
              <strong>{expense.appliedRate.toLocaleString('ko-KR')} KRW</strong>
            </div>
          </section>

          <div className={styles.divider} />

          {isEditing ? (
            <div className={styles.editFields}>
              <label>
                <span>통화</span>
                <select value={draft.currency} onChange={(event) => setDraft({ ...draft, currency: event.target.value as ExpenseDetail['currency'] })}>
                  <option value="USD">USD</option><option value="EUR">EUR</option><option value="JPY">JPY</option><option value="KRW">KRW</option>
                </select>
              </label>
              <label>
                <span>결제 금액</span>
                <input type="number" min="0" step="0.01" value={draft.originalAmount} onChange={(event) => setDraft({ ...draft, originalAmount: Number(event.target.value) })} />
              </label>
              <label>
                <span>지출 날짜</span>
                <input type="date" value={draft.spentAt} onChange={(event) => setDraft({ ...draft, spentAt: event.target.value })} />
              </label>
              <label>
                <span>상점</span>
                <input value={draft.merchantName} onChange={(event) => setDraft({ ...draft, merchantName: event.target.value })} />
              </label>
              <label>
                <span>카테고리</span>
                <select value={draft.categoryName} onChange={(event) => setDraft({ ...draft, categoryName: event.target.value })}>
                  {categoryOptions.map((category) => <option key={category.label} value={category.label}>{category.label}</option>)}
                </select>
              </label>
              <label className={styles.memoEdit}>
                <span>메모</span>
                <textarea maxLength={200} value={draft.memo} onChange={(event) => setDraft({ ...draft, memo: event.target.value })} />
                <small>{draft.memo.length}/200</small>
              </label>
              <div className={styles.editActions}>
                <Button variant="outline" onClick={cancelEdit}>취소</Button>
                <Button type="submit" isLoading={isSaving}>변경사항 저장</Button>
              </div>
            </div>
          ) : (
            <dl className={styles.detailList}>
              <div><dt>지출 날짜</dt><dd>{expense.spentAt.replaceAll('-', '. ')}</dd></div>
              <div><dt>상점</dt><dd>{expense.merchantName || '-'}</dd></div>
              <div><dt>카테고리</dt><dd><img src={`/assets/icons/categories/category-${expense.iconKey}.png`} alt="" aria-hidden="true" />{expense.categoryName}</dd></div>
              <div className={styles.memoRow}><dt>메모</dt><dd>{expense.memo || '작성된 메모가 없습니다.'}</dd></div>
            </dl>
          )}
        </form>

        <aside className={styles.summaryPanel} aria-label="지출 요약">
          <img src="/assets/icons/expenditure_input.png" alt="" aria-hidden="true" />
          <section className={styles.summaryCard}>
            <h2>결제 요약</h2>
            <div><span>원 결제 금액</span><strong>{expense.currency} {expense.originalAmount.toLocaleString('en-US', { maximumFractionDigits: 2 })}</strong></div>
            <div><span>환산 금액</span><strong className={styles.primaryText}>₩ {expense.convertedAmountHome.toLocaleString('ko-KR')}</strong></div>
            <div><span>예산 반영</span><strong>반영 완료</strong></div>
            <hr />
            <p>이 지출은 7월 예산의 <strong>{((expense.convertedAmountHome / 1250000) * 100).toFixed(1)}%</strong>를 사용했습니다.</p>
          </section>
        </aside>
      </div>

      {errorMessage && <p role="alert">{errorMessage}</p>}

      {isDeleteOpen && (
        <div className={styles.backdrop} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setIsDeleteOpen(false)}>
          <section className={styles.deleteDialog} role="dialog" aria-modal="true" aria-labelledby="delete-expense-title">
            <span className={styles.warningIcon} aria-hidden="true">!</span>
            <h2 id="delete-expense-title">지출 내역을 삭제할까요?</h2>
            <p>삭제한 지출은 다시 복구할 수 없습니다.</p>
            <div>
              <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>취소</Button>
              <Button onClick={handleDelete} isLoading={isDeleting}>삭제하기</Button>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}

export default ExpenseDetailPage
