import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import type { ReactElement } from 'react'

const stateOverrides = new Map<number, unknown>()
const stateSetters = new Map<number, ReturnType<typeof vi.fn>>()
let stateCursor = 0
const defaultBudgetSummary = {
  homeCurrency: 'KRW',
  monthlyBudgetHome: 1_000_000,
  monthlyExpenseHome: 0,
  remainingBudgetHome: 1_000_000,
}

const expenseInputData = {
  categories: [{ id: 'food', serverId: 1, label: 'Food', iconKey: 'food', iconSrc: '/food.png' }],
  categoryId: 'food',
  setCategoryId: vi.fn(),
  budgetSummary: { ...defaultBudgetSummary },
  rate: 1,
  budgetStatus: 'ready' as 'loading' | 'ready' | 'error',
  isTemporaryRate: false,
  isRateLoading: false,
  isRateError: false,
  retryRate: vi.fn(),
  refetchBudget: vi.fn(),
}

const { mockButton, createExpenseMock, showToastMock } = vi.hoisted(() => ({
  mockButton: vi.fn(() => null),
  createExpenseMock: vi.fn(),
  showToastMock: vi.fn(),
}))

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')

  return {
    ...actual,
    useState: (initial: unknown) => {
      const index = stateCursor
      stateCursor += 1
      const resolved = typeof initial === 'function'
        ? (initial as () => unknown)()
        : initial
      const setter = vi.fn()
      stateSetters.set(index, setter)
      return [stateOverrides.has(index) ? stateOverrides.get(index) : resolved, setter]
    },
    useMemo: (factory: () => unknown) => factory(),
    useCallback: (callback: unknown) => callback,
  }
})

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useMutation: ({ mutationFn }: { mutationFn: (...args: unknown[]) => unknown }) => ({
    mutateAsync: mutationFn,
    isPending: false,
  }),
}))

vi.mock('@/api/expenses', () => ({
  createExpense: createExpenseMock,
  importExpenses: vi.fn(),
}))

vi.mock('@/auth/session', () => ({
  getOnboardingSettings: () => ({ localCurrencies: ['USD'] }),
}))

vi.mock('@/features/expense/hooks/useExpenseInputData', () => ({
  useExpenseInputData: () => expenseInputData,
}))

vi.mock('@/components/common/Button/Button', () => ({ default: mockButton }))
vi.mock('@/components/common/CurrencyDropdown/CurrencyDropdown', () => ({ default: () => null }))
vi.mock('@/components/common/FileUploadModal/FileUploadModal', () => ({ default: () => null }))
vi.mock('@/components/common/Toast/Toast', () => ({ default: () => null }))
vi.mock('@/components/common/Toast/useToastQueue', () => ({
  useToastQueue: () => ({ toast: null, showToast: showToastMock, closeToast: vi.fn() }),
}))
vi.mock('@/i18n/I18nContext', () => ({
  useI18n: () => ({ locale: 'en-US', t: (key: string) => key }),
}))
vi.mock('./ExpenseInputPage.module.css', () => ({
  default: new Proxy({}, { get: (_target, property) => String(property) }),
}))

import ExpenseInputPage from './ExpenseInputPage'
import Button from '@/components/common/Button/Button'

function findElementByType(element: unknown, type: unknown): ReactElement | null {
  if (!element || typeof element !== 'object' || !('type' in element)) return null

  const candidate = element as ReactElement<{ children?: unknown }>
  if (candidate.type === type) return candidate

  const children = candidate.props?.children
  const childList = Array.isArray(children) ? children : [children]
  for (const child of childList) {
    const found = findElementByType(child, type)
    if (found) return found
  }

  return null
}

function renderSaveButton(options: {
  rate?: number
  isRateLoading?: boolean
  isRateError?: boolean
  budgetStatus?: 'loading' | 'ready' | 'error'
}) {
  stateCursor = 0
  stateOverrides.clear()
  stateOverrides.set(1, '100')
  expenseInputData.rate = options.rate ?? 1
  expenseInputData.isRateLoading = options.isRateLoading ?? false
  expenseInputData.isRateError = options.isRateError ?? false
  expenseInputData.budgetStatus = options.budgetStatus ?? 'ready'

  const page = ExpenseInputPage()
  const saveButton = findElementByType(page, Button)
  if (!saveButton) throw new Error('save Button was not found')
  return saveButton.props as { disabled?: boolean; isLoading?: boolean }
}

describe('ExpenseInputPage critical exchange-rate regression tests', () => {
  beforeEach(() => {
    mockButton.mockClear()
    expenseInputData.budgetSummary = { ...defaultBudgetSummary }
    expenseInputData.budgetStatus = 'ready'
  })

  afterEach(() => {
    stateOverrides.clear()
    stateSetters.clear()
    stateCursor = 0
    createExpenseMock.mockReset()
    showToastMock.mockReset()
    expenseInputData.refetchBudget.mockReset()
  })

  it('allows saving when the exchange rate request succeeds', () => {
    const saveButton = renderSaveButton({ rate: 1, isRateLoading: false, isRateError: false })

    expect(saveButton.disabled).toBe(false)
  })

  it('should prevent expense submission when exchange rate request is loading', () => {
    const saveButton = renderSaveButton({ rate: 0, isRateLoading: true, isRateError: false })

    expect(saveButton.disabled).toBe(true)
  })

  it('should prevent expense submission when exchange rate request fails', () => {
    const saveButton = renderSaveButton({ rate: 1, isRateLoading: false, isRateError: true })

    expect(saveButton.disabled).toBe(true)
  })

  it('should prevent expense submission before an exchange rate is ready', () => {
    const saveButton = renderSaveButton({ rate: 0, isRateLoading: false, isRateError: false })

    expect(saveButton.disabled).toBe(true)
  })

  it('should prevent expense submission while budget data is loading', () => {
    const saveButton = renderSaveButton({ budgetStatus: 'loading' })

    expect(saveButton.disabled).toBe(true)
  })

  it('should prevent expense submission when budget data fails', () => {
    const saveButton = renderSaveButton({ budgetStatus: 'error' })

    expect(saveButton.disabled).toBe(true)
  })

  it('allows saving with a ready non-KRW home currency without using the fallback', () => {
    expenseInputData.budgetSummary = {
      homeCurrency: 'USD',
      monthlyBudgetHome: 1_000,
      monthlyExpenseHome: 0,
      remainingBudgetHome: 1_000,
    }
    const saveButton = renderSaveButton({ budgetStatus: 'ready', rate: 0.5 })

    expect(saveButton.disabled).toBe(false)
  })

  it('keeps a successful expense saved when the post-save budget refetch fails', async () => {
    const refetchError = new Error('budget refresh failed')
    createExpenseMock.mockResolvedValue({ id: 1 })
    expenseInputData.refetchBudget.mockRejectedValue(refetchError)
    stateCursor = 0
    stateOverrides.clear()
    stateSetters.clear()
    stateOverrides.set(1, '100')
    const page = ExpenseInputPage()
    const form = findElementByType(page, 'form')
    if (!form) throw new Error('expense form was not found')

    await (form.props as { onSubmit: (event: { preventDefault: () => void }) => Promise<void> }).onSubmit({ preventDefault: vi.fn() })

    expect(createExpenseMock).toHaveBeenCalledOnce()
    expect(expenseInputData.refetchBudget).toHaveBeenCalledOnce()
    expect(stateSetters.get(1)).toHaveBeenCalledWith('')
    expect(stateSetters.get(3)).toHaveBeenCalledWith('')
    expect(stateSetters.get(4)).toHaveBeenCalledWith('')
    expect(showToastMock).toHaveBeenCalledWith(expect.objectContaining({ variant: 'success' }))
    expect(showToastMock).toHaveBeenCalledWith(expect.objectContaining({ variant: 'info' }))
    expect(showToastMock).not.toHaveBeenCalledWith(expect.objectContaining({ variant: 'error' }))
  })
})
