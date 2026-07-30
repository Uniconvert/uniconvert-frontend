import { useEffect, useRef, useState } from 'react'
import styles from './CurrencyAmountInput.module.css'

interface CurrencyAmountInputProps {
  value: number
  currency: string
  onChange: (value: number) => void
  ariaLabel: string
  min?: number
  max?: number
  className?: string
  disabled?: boolean
}

const currencyLocales: Record<string, string> = {
  KRW: 'ko-KR',
  USD: 'en-US',
  EUR: 'de-DE',
  JPY: 'ja-JP',
  CNY: 'zh-CN',
  GBP: 'en-GB',
}

function getCurrencySymbol(currency: string) {
  return new Intl.NumberFormat(currencyLocales[currency] ?? 'en-US', {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    maximumFractionDigits: 0,
  }).formatToParts(0).find((part) => part.type === 'currency')?.value ?? currency
}

function formatNumber(value: number, currency: string) {
  return new Intl.NumberFormat(currencyLocales[currency] ?? 'en-US', {
    maximumFractionDigits: 0,
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
    const digits = draftValue.replace(/[^\d]/g, '')

    if (digits === '') {
      setDraftValue('')
      onChange(0)
      return
    }

    const parsedValue = Number(digits)
    const normalizedValue = Math.min(Math.max(parsedValue, min), max)

    setDraftValue(formatNumber(normalizedValue, currency))
    onChange(normalizedValue)
  }

  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    isEditingRef.current = true
    event.currentTarget.select()
  }

  const handleClick = (event: React.MouseEvent<HTMLInputElement>) => {
    event.currentTarget.select()
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDraftValue(event.currentTarget.value.replace(/[^\d]/g, ''))
  }

  return (
    <span className={`${styles.field} ${className}`.trim()}>
      <input
        data-currency-input
        type="text"
        inputMode="numeric"
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
