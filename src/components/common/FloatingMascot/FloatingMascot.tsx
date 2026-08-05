import Mascot from '@/components/common/Mascot/Mascot'
import styles from './FloatingMascot.module.css'

interface FloatingMascotProps {
  message: React.ReactNode;
  imageSrc: string;
}

export default function FloatingMascot({ message, imageSrc }: FloatingMascotProps) {
  return (
    <div className={styles.floatingMascotRail}>
      <div className={styles.floatingMascot}>
        <Mascot message={message} imageSrc={imageSrc} />
      </div>
    </div>
  )
}
