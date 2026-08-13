import type { ReactNode } from 'react'
import Button from '@/components/common/Button/Button'
import type { ButtonProps } from '@/components/common/Button/Button'
import { useI18n } from '@/i18n/I18nContext'
import styles from './GoogleLoginButton.module.css'

export interface GoogleLoginButtonProps
  extends Omit<ButtonProps, 'children' | 'variant'> {
  children?: ReactNode
}

function GoogleLoginButton({
  children,
  ...props
}: GoogleLoginButtonProps) {
  const { t } = useI18n()

  return (
    <Button {...props} variant="outline">
      <img
        className={styles.icon}
        src="/assets/icons/google.png"
        alt=""
        aria-hidden="true"
      />
      <span>{children ?? t('login.google')}</span>
    </Button>
  )
}

export default GoogleLoginButton
