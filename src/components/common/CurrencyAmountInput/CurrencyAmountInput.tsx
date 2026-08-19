import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FocusEvent, MouseEvent } from 'react'
import { getCurrencyMetadata } from '@/types/currency'
import { getCurrencyLocale, normalizeCurrencyAmount, normalizeCurrencyAmountInput } from '@/utils/currencyAmount'
import styles from './CurrencyAmountInput.module.css'

// These helpers remain exported for the existing domain-input tests and callers.
// eslint-disable-next-line react-refresh/only-export-components
export { normalizeCurrencyAmount, normalizeCurrencyAmountInput } from '@/utils/currencyAmount'

export interface CurrencyAmountInputProps {
  value: number
  currency: string
  onChange: (value: number) => void
  ariaLabel: string
  min?: number
  max?: number
  className?: string
  disabled?: boolean
}

function getCurrencySymbol(currency: string) {
  return new Intl.NumberFormat(getCurrencyLocale(currency), {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    maximumFractionDigits: getCurrencyMetadata(currency).maximumFractionDigits,
  }).formatToParts(0).find((part) => part.type === 'currency')?.value ?? currency
}

function formatNumber(value: number, currency: string) {
  return new Intl.NumberFormat(getCurrencyLocale(currency), {
    maximumFractionDigits: getCurrencyMetadata(currency).maximumFractionDigits,
  }).format(value)
}

function CurrencyAmountInput({
  value,
  currency,
  onChange,
  ariaLabel,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  className = '',
  disabled = false,
}: CurrencyAmountInputProps) {
  const symbol = getCurrencySymbol(currency)
  const isEditingRef = useRef(false)
  const [draftValue, setDraftValue] = useState(() => formatNumber(value, currency))

  useEffect(() => {
    if (!isEditingRef.current) {
      setDraftValue(formatNumber(value, currency))
    }
  }, [currency, value])

  const handleBlur = () => {
    isEditingRef.current = false
    const normalizedDraft = normalizeCurrencyAmountInput(draftValue, currency)

    if (!normalizedDraft || normalizedDraft === '.') {
      setDraftValue('')
      onChange(0)
      return
    }

    const parsedValue = Number(normalizedDraft)
    if (!Number.isFinite(parsedValue)) {
      setDraftValue(formatNumber(min, currency))
      onChange(min)
      return
    }

    const normalizedValue = normalizeCurrencyAmount(parsedValue, currency, min, max)
    setDraftValue(formatNumber(normalizedValue, currency))
    onChange(normalizedValue)
  }

  const handleFocus = (event: FocusEvent<HTMLInputElement>) => {
    isEditingRef.current = true
    event.currentTarget.select()
  }

  const handleClick = (event: MouseEvent<HTMLInputElement>) => {
    event.currentTarget.select()
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setDraftValue(normalizeCurrencyAmountInput(event.currentTarget.value, currency))
  }

  return (
    <span className={`${styles.field} ${className}`.trim()}>
      <input
        data-currency-input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        aria-label={ariaLabel}
        value={draftValue}
        disabled={disabled}
        onFocus={handleFocus}
        onClick={handleClick}
        onChange={handleChange}
        onBlur={handleBlur}
      />
      <span className={styles.symbol} aria-hidden="true">{symbol}</span>
    </span>
  )
}

export default CurrencyAmountInput
