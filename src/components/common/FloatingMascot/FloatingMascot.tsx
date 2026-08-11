import { useState, useEffect, useRef, useCallback } from 'react'
import Mascot from '@/components/common/Mascot/Mascot'
import styles from './FloatingMascot.module.css'

interface FloatingMascotProps {
  messages: React.ReactNode[]; // 수정: string[] -> React.ReactNode[]
  imageSrc: string;
}

export default function FloatingMascot({ messages, imageSrc }: FloatingMascotProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const timerRef = useRef<number | null>(null)

  const messagesRef = useRef(messages)
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  const showNextMessage = useCallback(() => {
    setCurrentIndex((prev) => {
      const currentMessages = messagesRef.current
      if (!currentMessages || currentMessages.length <= 1) return 0
      let next = Math.floor(Math.random() * currentMessages.length)
      while (next === prev) {
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
    setCurrentIndex(0)
    resetTimer()

    return () => {
      if (timerRef.current !== null) clearInterval(timerRef.current)
    }
  }, [resetTimer])

  const handleClick = () => {
    showNextMessage()
    resetTimer()
  }

  const currentMessages = messagesRef.current
  const currentMessage = currentMessages && currentMessages.length > 0 ? currentMessages[currentIndex] : ''

  return (
    <div 
      className={styles.floatingMascotRail} 
      onClick={handleClick} 
      style={{ cursor: 'pointer', display: 'inline-block', userSelect: 'none' }}
    >
      <div className={styles.floatingMascot}>
        <Mascot message={currentMessage} imageSrc={imageSrc} />
      </div>
    </div>
  )
}