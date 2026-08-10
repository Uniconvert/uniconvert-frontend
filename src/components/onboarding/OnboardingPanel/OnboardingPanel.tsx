import type { FormEventHandler, ReactNode } from 'react'
import AuthPanelShell from '@/components/auth/AuthPanelShell/AuthPanelShell'
import Button from '@/components/common/Button/Button'
import styles from './OnboardingPanel.module.css'
import { useI18n } from '@/i18n/I18nContext'

interface OnboardingPanelProps {
  titleId: string
  title: string
  description: string
  currentStep: number
  children: ReactNode
  onSubmit: FormEventHandler<HTMLFormElement>
  submitDisabled?: boolean
  submitLabel?: string
  totalSteps?: number
  height?: string
  compact?: boolean
  bottomAligned?: boolean
}

function OnboardingPanel({
  titleId,
  title,
  description,
  currentStep,
  children,
  onSubmit,
  submitDisabled = false,
  submitLabel,
  totalSteps = 4,
  height = '59rem',
  compact = false,
  bottomAligned = false,
}: OnboardingPanelProps) {
  const { t } = useI18n()
  return (
    <AuthPanelShell
      width="47.5rem"
      height={height}
      as="form"
      className={[
        styles.panel,
        compact ? styles.compact : '',
        bottomAligned ? styles.bottomAligned : '',
      ].filter(Boolean).join(' ')}
      ariaLabelledBy={titleId}
      onSubmit={onSubmit}
    >
      <div
        className={styles.progress}
        aria-label={t('onboarding.progress', { total: totalSteps, current: currentStep })}
      >
        {Array.from({ length: totalSteps }, (_, index) => (
          <span className={index < currentStep ? styles.active : ''} key={index} />
        ))}
      </div>

      <h1 id={titleId}>{title}</h1>
      <p className={styles.description}>{description}</p>

      <div className={styles.content}>{children}</div>

      <Button className={styles.nextButton} type="submit" fullWidth disabled={submitDisabled}>
        {submitLabel ?? t('onboarding.next')}
      </Button>
    </AuthPanelShell>
  )
}

export default OnboardingPanel
