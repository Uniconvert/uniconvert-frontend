import { useEffect, useRef } from 'react'
import Mascot from '@/components/common/Mascot/Mascot'
import styles from './FloatingMascot.module.css'

interface FloatingMascotProps {
  message: string
  imageSrc: string
  followDelay?: number
}

export default function FloatingMascot({ message, imageSrc, followDelay = 280 }: FloatingMascotProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = containerRef.current
    const scrollContainer = element?.closest('main')
    const positioningParent = element?.offsetParent as HTMLElement | null
    if (!element || !scrollContainer || !positioningParent) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let animationFrame = 0
    let currentPosition = 0
    let targetPosition = 0
    let velocity = 0
    let previousTime = 0
    let delayTimer = 0

    const renderPosition = (position: number) => {
      element.style.transform = `translate3d(0, ${position}px, 0)`
    }
    const clampTarget = (visibleBottom: number) => Math.max(0, Math.min(
      visibleBottom - element.offsetHeight - 24,
      positioningParent.scrollHeight - element.offsetHeight,
    ))
    const calculateWindowTarget = () => {
      const parentTop = positioningParent.getBoundingClientRect().top + window.scrollY
      return clampTarget(window.scrollY + window.innerHeight - parentTop)
    }
    const calculateInnerTarget = () => clampTarget(
      scrollContainer.scrollTop + scrollContainer.clientHeight,
    )
    const calculateTarget = () => scrollContainer.scrollTop > 0
      ? calculateInnerTarget()
      : calculateWindowTarget()

    const animate = (time: number) => {
      const deltaTime = previousTime ? Math.min((time - previousTime) / 1000, 0.032) : 0.016
      previousTime = time
      const displacement = targetPosition - currentPosition
      velocity += displacement * 18 * deltaTime
      velocity *= Math.exp(-8 * deltaTime)
      currentPosition += velocity * deltaTime
      renderPosition(currentPosition)

      if (Math.abs(displacement) < 0.35 && Math.abs(velocity) < 0.35) {
        currentPosition = targetPosition
        velocity = 0
        previousTime = 0
        renderPosition(currentPosition)
        animationFrame = 0
        return
      }
      animationFrame = window.requestAnimationFrame(animate)
    }

    const queueTarget = (nextTarget: number) => {
      targetPosition = nextTarget
      if (reduceMotion) {
        currentPosition = targetPosition
        renderPosition(currentPosition)
        return
      }
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame)
        animationFrame = 0
        velocity = 0
        previousTime = 0
      }
      if (delayTimer) window.clearTimeout(delayTimer)
      delayTimer = window.setTimeout(() => {
        delayTimer = 0
        animationFrame = window.requestAnimationFrame(animate)
      }, followDelay)
    }

    const handleWindowScroll = () => queueTarget(calculateWindowTarget())
    const handleInnerScroll = () => queueTarget(calculateInnerTarget())
    const handleResize = () => queueTarget(calculateTarget())

    currentPosition = Math.max(0, calculateTarget())
    targetPosition = currentPosition
    renderPosition(currentPosition)
    scrollContainer.addEventListener('scroll', handleInnerScroll, { passive: true })
    window.addEventListener('scroll', handleWindowScroll, { passive: true })
    window.addEventListener('resize', handleResize)

    return () => {
      scrollContainer.removeEventListener('scroll', handleInnerScroll)
      window.removeEventListener('scroll', handleWindowScroll)
      window.removeEventListener('resize', handleResize)
      if (delayTimer) window.clearTimeout(delayTimer)
      if (animationFrame) window.cancelAnimationFrame(animationFrame)
    }
  }, [followDelay])

  return (
    <div ref={containerRef} className={styles.floatingMascot}>
      <Mascot message={message} imageSrc={imageSrc} />
    </div>
  )
}
