import { afterEach, describe, expect, it, vi } from 'vitest'
import { keepPreviousData, MutationCache, MutationObserver, QueryClient, QueryObserver } from '@tanstack/react-query'
import { expenseKeys } from './expenseKeys'
import { memoKeys } from './memoKeys'
import { reportKeys } from './reportKeys'

function createClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  })
}

describe('React Query contracts used by the refactored data hooks', () => {
  const clients: QueryClient[] = []

  afterEach(() => {
    clients.splice(0).forEach((client) => client.clear())
  })

  it('keeps query keys stable and scoped to their actual resource', () => {
    expect(expenseKeys.historyFor('2026-08', 'month')).toEqual(['expense-history', '2026-08', 'month'])
    expect(memoKeys.list({ keyword: '', sort: 'latest', page: 1 })).toEqual([
      'expense-memos',
      'list',
      { keyword: '', sort: 'latest', page: 1 },
    ])
    expect(reportKeys.monthly('2026-08')).toEqual(['monthly-report', '2026-08'])
    expect(reportKeys.transactions('2026-08-18')).toEqual(['report-transactions', '2026-08-18'])
  })

  it('represents query success, error, and explicit refetch through QueryObserver', async () => {
    const client = createClient()
    clients.push(client)
    const fetcher = vi.fn()
      .mockResolvedValueOnce({ value: 1 })
      .mockResolvedValueOnce({ value: 2 })
    const observer = new QueryObserver(client, {
      queryKey: ['contract', 'refetch'],
      queryFn: fetcher,
    })

    const result = await observer.refetch()
    expect(result.data).toEqual({ value: 1 })
    expect(observer.getCurrentResult().isSuccess).toBe(true)

    const refetched = await observer.refetch()
    expect(refetched.data).toEqual({ value: 2 })
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('keeps previous range data while the next range query is fetching', async () => {
    const client = createClient()
    clients.push(client)
    let resolveWeek!: (value: { range: string }) => void
    const fetcher = vi.fn()
      .mockResolvedValueOnce({ range: 'day' })
      .mockImplementationOnce(() => new Promise<{ range: string }>((resolve) => { resolveWeek = resolve }))
    const observer = new QueryObserver(client, {
      queryKey: expenseKeys.historyFor('2026-08', 'day'),
      queryFn: fetcher,
      placeholderData: keepPreviousData,
      staleTime: 0,
    })

    const unsubscribe = observer.subscribe(() => undefined)
    await observer.refetch()
    observer.setOptions({
      queryKey: expenseKeys.historyFor('2026-08', 'week'),
      queryFn: fetcher,
      placeholderData: keepPreviousData,
      staleTime: 0,
      retry: false,
    })

    expect(observer.getCurrentResult()).toMatchObject({
      data: { range: 'day' },
      isFetching: true,
      isPlaceholderData: true,
      isPending: false,
    })

    resolveWeek({ range: 'week' })
    await new Promise<void>((resolve) => { setTimeout(resolve, 0) })
    expect(observer.getCurrentResult()).toMatchObject({
      data: { range: 'week' },
      isFetching: false,
      isPlaceholderData: false,
    })
    unsubscribe()
  })

  it('does not call a disabled query until the screen enables it', async () => {
    const client = createClient()
    clients.push(client)
    const fetcher = vi.fn().mockResolvedValue({ value: 1 })
    const observer = new QueryObserver(client, {
      queryKey: ['contract', 'disabled'],
      queryFn: fetcher,
      enabled: false,
    })

    expect(observer.getCurrentResult().status).toBe('pending')
    expect(fetcher).not.toHaveBeenCalled()
    const result = await observer.refetch()
    expect(result.data).toEqual({ value: 1 })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('tracks mutation success and error without changing the request contract', async () => {
    const successClient = createClient()
    const errorClient = createClient()
    clients.push(successClient, errorClient)
    const successMutation = successClient.getMutationCache().build(successClient, {
      mutationFn: async (value: number) => value * 2,
    })
    expect(await successMutation.execute(3)).toBe(6)
    expect(successMutation.state.status).toBe('success')

    const failure = new Error('request failed')
    const errorMutation = errorClient.getMutationCache().build(errorClient, {
      mutationFn: async () => { throw failure },
    })
    await expect(errorMutation.execute(undefined)).rejects.toBe(failure)
    expect(errorMutation.state.status).toBe('error')
  })

  it('exposes isPending while a mutation is in flight and invalidates only its query scope', async () => {
    const client = createClient()
    clients.push(client)
    const queryKey = ['contract', 'mutation-invalidation'] as const
    await client.prefetchQuery({
      queryKey,
      queryFn: async () => ({ value: 1 }),
    })
    let resolveMutation!: (value: number) => void
    const observer = new MutationObserver(client, {
      mutationFn: () => new Promise<number>((resolve) => { resolveMutation = resolve }),
      onSuccess: async () => {
        await client.invalidateQueries({ queryKey })
      },
    })

    const pending = observer.mutate()
    expect(observer.getCurrentResult().isPending).toBe(true)
    await new Promise<void>((resolve) => { setTimeout(resolve, 0) })
    resolveMutation(2)
    await expect(pending).resolves.toBe(2)
    expect(observer.getCurrentResult().isPending).toBe(false)
    expect(client.getQueryState(queryKey)?.isInvalidated).toBe(true)
  })

  it('keeps QueryClient caches and MutationCache instances isolated per client', () => {
    const first = createClient()
    const second = createClient()
    clients.push(first, second)
    first.setQueryData(['contract', 'isolation'], { value: 1 })

    expect(second.getQueryData(['contract', 'isolation'])).toBeUndefined()
    expect(first.getMutationCache()).toBeInstanceOf(MutationCache)
    expect(first.getMutationCache()).not.toBe(second.getMutationCache())
  })
})
