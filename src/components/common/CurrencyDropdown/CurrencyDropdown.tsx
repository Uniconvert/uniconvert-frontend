import { useRef, useState } from 'react'
import { CURRENCY_CODES, type CurrencyCode } from './currencyOptions'
import { useI18n } from '@/i18n/I18nContext'
import { useListboxKeyboard } from '@/hooks/useListboxKeyboard'
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
  ariaLabel,
}: CurrencyDropdownProps) {
  const { t } = useI18n()
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const selectCurrency = (currency: CurrencyCode) => {
    onChange(currency)
    setIsOpen(false)
  }

  const {
    listboxId,
    activeDescendantId,
    onTriggerClick,
    onTriggerKeyDown,
    onOptionClick,
    onOptionPointerMove,
    getOptionId,
  } = useListboxKeyboard({
    open: isOpen,
    optionCount: options.length,
    selectedIndex: options.indexOf(value),
    onOpen: () => setIsOpen(true),
    onClose: () => setIsOpen(false),
    onSelect: (index) => selectCurrency(options[index]),
    rootRef,
  })

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        className={styles.trigger}
        type="button"
        aria-label={ariaLabel ?? t('common.currencySelect')}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-activedescendant={activeDescendantId}
        onKeyDown={onTriggerKeyDown}
        onClick={onTriggerClick}
      >
        <img
          src={`/assets/icons/currencies/currency-${value.toLowerCase()}.png`}
          alt=""
          aria-hidden="true"
        />
        <strong>{value}</strong>
      </button>

      {isOpen && (
        <div id={listboxId} className={styles.menu} role="listbox" aria-label={t('common.currencyList')}>
          {options.map((option, index) => (
            <button
              key={option}
              type="button"
              role="option"
              id={getOptionId(index)}
              tabIndex={-1}
              aria-selected={value === option}
              onMouseEnter={() => onOptionPointerMove(index)}
              onClick={() => onOptionClick(index)}
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
