import { describe, expect, it, vi } from 'vitest'
import { getEnabledIndex, handleListboxKeyDown } from './useListboxKeyboard'

function createEvent(key: string) {
  return { key, preventDefault: vi.fn() }
}

function createConfig(overrides: Partial<Parameters<typeof handleListboxKeyDown>[1]> = {}) {
  return {
    open: false,
    optionCount: 4,
    selectedIndex: 0,
    activeIndex: 0,
    disabledIndices: [],
    onOpen: vi.fn(),
    onClose: vi.fn(),
    onSelect: vi.fn(),
    setActiveIndex: vi.fn(),
    ...overrides,
  }
}

describe('listbox keyboard contract', () => {
  it('finds enabled options while skipping disabled indices', () => {
    expect(getEnabledIndex(4, 1, 1, [1])).toBe(2)
    expect(getEnabledIndex(4, 3, -1, [3])).toBe(2)
    expect(getEnabledIndex(3, 0, 1, [0, 1, 2])).toBeNull()
  })

  it('opens with Enter and Space', () => {
    const enterConfig = createConfig()
    const enterEvent = createEvent('Enter')
    handleListboxKeyDown(enterEvent, enterConfig)
    expect(enterEvent.preventDefault).toHaveBeenCalledOnce()
    expect(enterConfig.onOpen).toHaveBeenCalledOnce()

    const spaceConfig = createConfig()
    handleListboxKeyDown(createEvent(' '), spaceConfig)
    expect(spaceConfig.onOpen).toHaveBeenCalledOnce()
  })

  it('opens and moves to the next or previous option with ArrowDown and ArrowUp', () => {
    const downConfig = createConfig({ selectedIndex: 1, activeIndex: 1 })
    handleListboxKeyDown(createEvent('ArrowDown'), downConfig)
    expect(downConfig.setActiveIndex).toHaveBeenCalledWith(2)
    expect(downConfig.onOpen).toHaveBeenCalledOnce()

    const upConfig = createConfig({ selectedIndex: 0, activeIndex: 0 })
    handleListboxKeyDown(createEvent('ArrowUp'), upConfig)
    expect(upConfig.setActiveIndex).toHaveBeenCalledWith(3)
    expect(upConfig.onOpen).toHaveBeenCalledOnce()
  })

  it('moves to the first and last enabled option with Home and End', () => {
    const config = createConfig({ activeIndex: 1, disabledIndices: [0, 3] })
    handleListboxKeyDown(createEvent('Home'), config)
    expect(config.setActiveIndex).toHaveBeenCalledWith(1)
    handleListboxKeyDown(createEvent('End'), config)
    expect(config.setActiveIndex).toHaveBeenCalledWith(2)
  })

  it('moves through options and skips disabled options while open', () => {
    const config = createConfig({ open: true, activeIndex: 0, disabledIndices: [1] })
    handleListboxKeyDown(createEvent('ArrowDown'), config)
    expect(config.setActiveIndex).toHaveBeenCalledWith(2)
  })

  it('selects the active option with Enter or Space and closes', () => {
    const enterConfig = createConfig({ open: true, activeIndex: 2 })
    const enterEvent = createEvent('Enter')
    handleListboxKeyDown(enterEvent, enterConfig)
    expect(enterConfig.onSelect).toHaveBeenCalledWith(2)
    expect(enterConfig.onClose).toHaveBeenCalledOnce()

    const spaceConfig = createConfig({ open: true, activeIndex: 1 })
    handleListboxKeyDown(createEvent(' '), spaceConfig)
    expect(spaceConfig.onSelect).toHaveBeenCalledWith(1)
    expect(spaceConfig.onClose).toHaveBeenCalledOnce()
  })

  it('closes on Escape without selecting a new option', () => {
    const config = createConfig({ open: true, activeIndex: 2 })
    const event = createEvent('Escape')
    handleListboxKeyDown(event, config)
    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(config.onClose).toHaveBeenCalledOnce()
    expect(config.onSelect).not.toHaveBeenCalled()
  })

  it('closes on Tab and allows natural focus movement', () => {
    const config = createConfig({ open: true })
    const event = createEvent('Tab')
    handleListboxKeyDown(event, config)
    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(config.onClose).toHaveBeenCalledOnce()
  })
})
