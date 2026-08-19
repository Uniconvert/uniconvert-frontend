import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { ReactElement } from 'react'
import LoadingState from './LoadingState/LoadingState'
import EmptyState from './EmptyState/EmptyState'
import ErrorState from './ErrorState/ErrorState'

function findButton(element: ReactElement): ReactElement<{ onClick?: () => void }> | null {
  if (element.type === 'button') return element as ReactElement<{ onClick?: () => void }>
  const children = (element.props as { children?: unknown } | undefined)?.children
  const childList = Array.isArray(children) ? children : [children]
  for (const child of childList) {
    if (child && typeof child === 'object' && 'type' in child) {
      const button = findButton(child as ReactElement)
      if (button) return button
    }
  }
  return null
}

describe('공통 비동기 상태 컴포넌트', () => {
  it('LoadingState는 기본 메시지와 status 접근성을 제공한다', () => {
    const markup = renderToStaticMarkup(<LoadingState />)

    expect(markup).toContain('불러오는 중이에요.')
    expect(markup).toContain('role="status"')
    expect(markup).toContain('aria-busy="true"')
  })

  it('LoadingState는 전달한 message를 출력한다', () => {
    expect(renderToStaticMarkup(<LoadingState message="지출을 불러오는 중이에요." />))
      .toContain('지출을 불러오는 중이에요.')
  })

  it('EmptyState는 title, description, action을 제공한다', () => {
    const onAction = vi.fn()
    const element = EmptyState({
      title: '내역이 없습니다.',
      description: '새 내역을 추가해 보세요.',
      actionLabel: '추가',
      onAction,
    })
    const button = findButton(element)

    expect(renderToStaticMarkup(element)).toContain('내역이 없습니다.')
    expect(renderToStaticMarkup(element)).toContain('새 내역을 추가해 보세요.')
    expect(button).not.toBeNull()
    button?.props.onClick?.()
    expect(onAction).toHaveBeenCalledOnce()
  })

  it('ErrorState는 오류 문구와 retry action을 제공한다', () => {
    const onRetry = vi.fn()
    const element = ErrorState({
      title: '지출 내역을 불러오지 못했습니다.',
      description: '잠시 후 다시 시도해 주세요.',
      retryLabel: '재시도',
      onRetry,
    })
    const button = findButton(element)
    const markup = renderToStaticMarkup(element)

    expect(markup).toContain('role="alert"')
    expect(markup).toContain('지출 내역을 불러오지 못했습니다.')
    expect(markup).toContain('재시도')
    button?.props.onClick?.()
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
