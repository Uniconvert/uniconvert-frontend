import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import Button from './Button'

describe('Button contract', () => {
  it('loading 상태에서는 native disabled와 aria-busy를 함께 적용한다', () => {
    const element = Button({ children: '저장', isLoading: true, type: 'submit' })
    const markup = renderToStaticMarkup(element)

    expect(element.props.disabled).toBe(true)
    expect(element.props.type).toBe('submit')
    expect(markup).toContain('aria-busy="true"')
  })

  it('native disabled와 click handler를 그대로 전달한다', () => {
    const onClick = vi.fn()
    const element = Button({ children: '확인', disabled: true, onClick, variant: 'outline' })

    expect(element.props.disabled).toBe(true)
    expect(element.props.onClick).toBe(onClick)
    onClick()
    expect(onClick).toHaveBeenCalledOnce()
    expect(renderToStaticMarkup(element)).toContain('outline')
  })
})
