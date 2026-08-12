import { useId, useState } from 'react'
import type { InputHTMLAttributes } from 'react'
import { useI18n } from '@/i18n/I18nContext'
import styles from './TextField.module.css'

export interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: string
  errorMessage?: string
  helperText?: string
  leadingIconSrc?: string
  visuallyHideLabel?: boolean
}

function TextField({
  label,
  errorMessage,
  helperText,
  leadingIconSrc,
  visuallyHideLabel = false,
  type = 'text',
  id,
  className,
  disabled,
  required,
  ...props
}: TextFieldProps) {
  const { t } = useI18n()
  const generatedId = useId()
  const inputId = id ?? generatedId
  const messageId = `${inputId}-message`
  const isPasswordField = type === 'password'
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const resolvedType =
    isPasswordField && isPasswordVisible ? 'text' : type

  const fieldClassName = [styles.field, className ?? '']
    .filter(Boolean)
    .join(' ')
  const controlClassName = [
    styles.control,
    errorMessage ? styles.errorControl : '',
    disabled ? styles.disabledControl : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={fieldClassName}>
      <label
        className={visuallyHideLabel ? styles.visuallyHidden : styles.label}
        htmlFor={inputId}
      >
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>

      <div className={controlClassName}>
        {leadingIconSrc && (
          <img
            className={styles.leadingIcon}
            src={leadingIconSrc}
            alt=""
            aria-hidden="true"
          />
        )}

        <input
          {...props}
          id={inputId}
          className={styles.input}
          type={resolvedType}
          disabled={disabled}
          required={required}
          aria-invalid={Boolean(errorMessage)}
          aria-describedby={
            errorMessage || helperText ? messageId : undefined
          }
        />

        {isPasswordField && (
          <button
            className={styles.visibilityButton}
            type="button"
            onClick={() => setIsPasswordVisible((current) => !current)}
            disabled={disabled}
            aria-label={
              isPasswordVisible ? t('common.passwordHide') : t('common.passwordShow')
            }
            aria-pressed={isPasswordVisible}
          >
            <img
              src={
                isPasswordVisible
                  ? '/assets/icons/visibility-on.png'
                  : '/assets/icons/visibility-off.png'
              }
              alt=""
              aria-hidden="true"
            />
          </button>
        )}
      </div>

      {(errorMessage || helperText) && (
        <p
          id={messageId}
          className={errorMessage ? styles.errorMessage : styles.helperText}
          role={errorMessage ? 'alert' : undefined}
        >
          {errorMessage ?? helperText}
        </p>
      )}
    </div>
  )
}

export default TextField
