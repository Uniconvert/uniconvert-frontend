import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from 'react'

interface ListboxKeyboardEvent {
  key: string
  preventDefault: () => void
}

interface ListboxKeyboardOptions {
  open: boolean
  optionCount: number
  selectedIndex: number
  onOpen: () => void
  onClose: () => void
  onSelect: (index: number) => void
  disabledIndices?: readonly number[]
  id?: string
  rootRef?: RefObject<HTMLDivElement | null>
}

interface ListboxKeyboardConfig {
  open: boolean
  optionCount: number
  selectedIndex: number
  activeIndex: number | null
  disabledIndices: readonly number[]
  onOpen: () => void
  onClose: () => void
  onSelect: (index: number) => void
  setActiveIndex: (index: number | null) => void
}

const EMPTY_DISABLED_INDICES: readonly number[] = []

export interface ListboxKeyboardResult {
  listboxId: string
  activeIndex: number | null
  activeDescendantId: string | undefined
  onTriggerClick: () => void
  onTriggerKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void
  onOptionClick: (index: number) => void
  onOptionPointerMove: (index: number) => void
  getOptionId: (index: number) => string
}

export function getEnabledIndex(
  optionCount: number,
  startIndex: number,
  direction: 1 | -1,
  disabledIndices: readonly number[] = [],
): number | null {
  if (optionCount <= 0) return null

  const disabled = new Set(disabledIndices)
  for (let offset = 0; offset < optionCount; offset += 1) {
    const index = (startIndex + direction * offset + optionCount) % optionCount
    if (!disabled.has(index)) return index
  }
  return null
}

function getInitialIndex(optionCount: number, selectedIndex: number, disabledIndices: readonly number[]) {
  if (optionCount <= 0) return null
  if (selectedIndex >= 0 && selectedIndex < optionCount && !disabledIndices.includes(selectedIndex)) return selectedIndex
  return getEnabledIndex(optionCount, 0, 1, disabledIndices)
}

export function handleListboxKeyDown(
  event: ListboxKeyboardEvent,
  config: ListboxKeyboardConfig,
): void {
  const {
    open,
    optionCount,
    selectedIndex,
    activeIndex,
    disabledIndices,
    onOpen,
    onClose,
    onSelect,
    setActiveIndex,
  } = config

  if (optionCount <= 0) return

  const firstIndex = getEnabledIndex(optionCount, 0, 1, disabledIndices)
  const lastIndex = getEnabledIndex(optionCount, optionCount - 1, -1, disabledIndices)
  const currentIndex = activeIndex ?? getInitialIndex(optionCount, selectedIndex, disabledIndices) ?? firstIndex

  if (event.key === 'Escape' && open) {
    event.preventDefault()
    onClose()
    return
  }

  if (event.key === 'Tab' && open) {
    onClose()
    return
  }

  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    if (!open) {
      if (currentIndex !== null) setActiveIndex(currentIndex)
      onOpen()
      return
    }
    if (currentIndex !== null) {
      onSelect(currentIndex)
      onClose()
    }
    return
  }

  const isForward = event.key === 'ArrowDown'
  const isBackward = event.key === 'ArrowUp'
  const isHome = event.key === 'Home'
  const isEnd = event.key === 'End'
  if (!isForward && !isBackward && !isHome && !isEnd) return

  event.preventDefault()
  const nextIndex = isHome
    ? firstIndex
      : isEnd
        ? lastIndex
        : getEnabledIndex(
          optionCount,
        (currentIndex ?? 0) + (isForward ? 1 : -1),
        isForward ? 1 : -1,
        disabledIndices,
      )
  if (nextIndex === null) return

  setActiveIndex(nextIndex)
  if (!open) onOpen()
}

export function useListboxKeyboard({
  open,
  optionCount,
  selectedIndex,
  onOpen,
  onClose,
  onSelect,
  disabledIndices,
  id,
  rootRef,
}: ListboxKeyboardOptions): ListboxKeyboardResult {
  const resolvedDisabledIndices = disabledIndices ?? EMPTY_DISABLED_INDICES
  const generatedId = useId()
  const listboxId = id ?? `listbox-${generatedId}`
  const fallbackRootRef = useRef<HTMLDivElement>(null)
  const resolvedRootRef = rootRef ?? fallbackRootRef
  const [activeIndex, setActiveIndex] = useState<number | null>(() => getInitialIndex(optionCount, selectedIndex, resolvedDisabledIndices))

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!resolvedRootRef.current?.contains(event.target as Node)) onClose()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [onClose, open, resolvedRootRef])

  const getOptionId = (index: number) => `${listboxId}-option-${index}`

  const openListbox = () => {
    setActiveIndex(getInitialIndex(optionCount, selectedIndex, resolvedDisabledIndices))
    onOpen()
  }

  const onTriggerClick = () => {
    if (open) onClose()
    else openListbox()
  }

  const onTriggerKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    handleListboxKeyDown(event, {
      open,
      optionCount,
      selectedIndex,
      activeIndex,
      disabledIndices: resolvedDisabledIndices,
      onOpen: openListbox,
      onClose,
      onSelect,
      setActiveIndex,
    })
  }

  const onOptionClick = (index: number) => {
    if (resolvedDisabledIndices.includes(index)) return
    setActiveIndex(index)
    onSelect(index)
    onClose()
  }

  const onOptionPointerMove = (index: number) => {
    if (!resolvedDisabledIndices.includes(index)) setActiveIndex(index)
  }

  return {
    listboxId,
    activeIndex,
    activeDescendantId: open && activeIndex !== null ? getOptionId(activeIndex) : undefined,
    onTriggerClick,
    onTriggerKeyDown,
    onOptionClick,
    onOptionPointerMove,
    getOptionId,
  }
}
