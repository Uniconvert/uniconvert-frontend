import { useState, useEffect, useRef, useCallback } from 'react'
import Mascot from '@/components/common/Mascot/Mascot'
import styles from './FloatingMascot.module.css'

interface FloatingMascotProps {
  messages: React.ReactNode[]; // 수정: string[] -> React.ReactNode[]
  imageSrc: string;
  speechBubbleVariant?: 'default' | 'twoLine' | 'compact';
  speechBubbleClassName?: string;
  className?: string;
}

export default function FloatingMascot({
  messages,
  imageSrc,
  speechBubbleVariant,
  speechBubbleClassName,
  className = '',
}: FloatingMascotProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const timerRef = useRef<number | null>(null)
  const messagesRef = useRef(messages)

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  const showNextMessage = useCallback(() => {
    setCurrentIndex((prev) => {
      const currentMessages = messagesRef.current
      if (currentMessages.length <= 1) return 0
      const activeIndex = prev % currentMessages.length
      let next = Math.floor(Math.random() * currentMessages.length)
      while (next === activeIndex) {
        next = Math.floor(Math.random() * currentMessages.length)
      }
      return next
    })
  }, [])

  const resetTimer = useCallback(() => {
    if (timerRef.current !== null) clearInterval(timerRef.current)
    timerRef.current = window.setInterval(() => {
      showNextMessage()
    }, 30000)
  }, [showNextMessage])

  useEffect(() => {
    resetTimer()

    return () => {
      if (timerRef.current !== null) clearInterval(timerRef.current)
    }
  }, [resetTimer])

  const handleClick = () => {
    showNextMessage()
    resetTimer()
  }

  const currentMessage = messages.length > 0 ? messages[currentIndex % messages.length] : ''

  return (
    <div 
      className={`${styles.floatingMascotRail} ${className}`.trim()}
      onClick={handleClick} 
      style={{ cursor: 'pointer', userSelect: 'none' }}
    >
      <div className={styles.floatingMascot}>
        <Mascot
          message={currentMessage}
          imageSrc={imageSrc}
          speechBubbleVariant={speechBubbleVariant}
          speechBubbleClassName={speechBubbleClassName}
        />
      </div>
    </div>
  )
}
