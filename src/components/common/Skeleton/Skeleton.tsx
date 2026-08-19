import type { CSSProperties } from 'react'
import styles from './Skeleton.module.css'

export type SkeletonVariant = 'text' | 'rect' | 'circle'

export interface SkeletonProps {
  width?: string | number
  height?: string | number
  variant?: SkeletonVariant
  className?: string
}

function Skeleton({
  width,
  height,
  variant = 'rect',
  className,
}: SkeletonProps) {
  const style: CSSProperties = { width, height }
  const classes = [styles.skeleton, styles[variant], className].filter(Boolean).join(' ')

  return <span className={classes} style={style} aria-hidden="true" />
}

export default Skeleton
