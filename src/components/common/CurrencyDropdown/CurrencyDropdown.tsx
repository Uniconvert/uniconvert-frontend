import { useEffect, useRef, useState } from 'react'
import { CURRENCY_CODES, type CurrencyCode } from './currencyOptions'
import styles from './CurrencyDropdown.module.css'

interface CurrencyDropdownProps {
  value: CurrencyCode
  onChange: (currency: CurrencyCode) => void
  options?: readonly CurrencyCode[]
  ariaLabel?: string
}

function CurrencyDropdown({
  value,
  onChange,
  options = CURRENCY_CODES,
  ariaLabel = '통화 선택',
}: CurrencyDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const selectCurrency = (currency: CurrencyCode) => {
    onChange(currency)
    setIsOpen(false)
  }

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        className={styles.trigger}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <img
          src={`/assets/icons/currencies/currency-${value.toLowerCase()}.png`}
          alt=""
          aria-hidden="true"
        />
        <strong>{value}</strong>
      </button>

      {isOpen && (
        <div className={styles.menu} role="listbox" aria-label="통화 목록">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              role="option"
              aria-selected={value === option}
              onClick={() => selectCurrency(option)}
            >
              <img
                src={`/assets/icons/currencies/currency-${option.toLowerCase()}.png`}
                alt=""
                aria-hidden="true"
              />
              <span>{option}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default CurrencyDropdown
