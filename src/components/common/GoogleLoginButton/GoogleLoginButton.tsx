import type { ReactNode } from 'react'
import Button from '@/components/common/Button/Button'
import type { ButtonProps } from '@/components/common/Button/Button'
import styles from './GoogleLoginButton.module.css'

export interface GoogleLoginButtonProps
  extends Omit<ButtonProps, 'children' | 'variant'> {
  children?: ReactNode
}

function GoogleLoginButton({
  children = '구글 계정으로 로그인',
  ...props
}: GoogleLoginButtonProps) {
  return (
    <Button {...props} variant="outline">
      <img
        className={styles.icon}
        src="/assets/icons/google.png"
        alt=""
        aria-hidden="true"
      />
      <span>{children}</span>
    </Button>
  )
}

export default GoogleLoginButton
