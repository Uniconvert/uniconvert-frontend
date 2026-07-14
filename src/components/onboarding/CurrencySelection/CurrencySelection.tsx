import styles from './CurrencySelection.module.css'

export interface CurrencyOption {
  code: string
  name: string
  symbol: string
}

interface CurrencySelectionProps {
  currencies: CurrencyOption[]
  selectedCodes: string[]
  selectionMode: 'single' | 'multiple'
  onChange: (codes: string[]) => void
}

function CurrencySelection({ currencies, selectedCodes, selectionMode, onChange }: CurrencySelectionProps) {
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

  return (
    <div className={styles.list} role={selectionMode === 'single' ? 'radiogroup' : 'group'}>
      {currencies.map((currency) => {
        const isSelected = selectedCodes.includes(currency.code)

        return (
          <button
            className={`${styles.option} ${isSelected ? styles.selected : ''}`}
            key={currency.code}
            type="button"
            role={selectionMode === 'single' ? 'radio' : 'checkbox'}
            aria-checked={isSelected}
            onClick={() => handleSelect(currency.code)}
          >
            <span className={styles.symbol} aria-hidden="true">{currency.symbol}</span>
            <span className={styles.label}>
              <strong>{currency.code}</strong>
              <span>{currency.name}</span>
            </span>
            <span className={styles.check} aria-hidden="true" />
          </button>
        )
      })}
    </div>
  )
}

export default CurrencySelection
