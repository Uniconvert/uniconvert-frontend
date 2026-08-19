import { useRef } from 'react'
import styles from './CurrencySelection.module.css'
import { CURRENCY_OPTIONS } from './currencyOptions'
import { useI18n } from '@/i18n/I18nContext'

export interface CurrencyOption {
  code: string
  name: string
  symbol: string
}

interface CurrencySelectionProps {
  currencies?: readonly CurrencyOption[]
  selectedCodes: string[]
  selectionMode: 'single' | 'multiple'
  onChange: (codes: string[]) => void
}

function CurrencySelection({
  currencies = CURRENCY_OPTIONS,
  selectedCodes,
  selectionMode,
  onChange,
}: CurrencySelectionProps) {
  const { t } = useI18n()
  const listRef = useRef<HTMLDivElement>(null)
  const handleSelect = (code: string) => {
    if (selectionMode === 'single') {
      onChange([code])
      return
    }

    onChange(
      selectedCodes.includes(code)
        ? selectedCodes.filter((selectedCode) => selectedCode !== code)
        : [...selectedCodes, code],
    )
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (selectionMode !== 'single' || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return

    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
    if (!buttons || buttons.length === 0) return

    event.preventDefault()
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? buttons.length - 1
        : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length
    buttons[nextIndex].focus()
    handleSelect(currencies[nextIndex].code)
  }

  return (
    <div className={styles.list} ref={listRef} role={selectionMode === 'single' ? 'radiogroup' : 'group'}>
      {currencies.map((currency, index) => {
        const isSelected = selectedCodes.includes(currency.code)

        return (
          <button
            className={`${styles.option} ${isSelected ? styles.selected : ''}`}
            key={currency.code}
            type="button"
            role={selectionMode === 'single' ? 'radio' : 'checkbox'}
            aria-checked={isSelected}
            tabIndex={selectionMode === 'single' ? (isSelected || (!selectedCodes.length && index === 0) ? 0 : -1) : 0}
            onKeyDown={(event) => handleKeyDown(event, index)}
            onClick={() => handleSelect(currency.code)}
          >
            <span className={styles.symbol} aria-hidden="true">{currency.symbol}</span>
            <span className={styles.label}>
              <strong>{currency.code}</strong>
              <span>{t(`currency.${currency.code}`) === `currency.${currency.code}` ? currency.name : t(`currency.${currency.code}`)}</span>
            </span>
            <span className={styles.check} aria-hidden="true" />
          </button>
        )
      })}
    </div>
  )
}

export default CurrencySelection
