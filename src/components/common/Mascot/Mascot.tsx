import styles from './Mascot.module.css';

interface MascotProps {
  message: string;
  imageSrc: string;
}

export default function Mascot({ message, imageSrc }: MascotProps) {
  return (
    <div className={styles.mascotContainer} aria-hidden="true">
      <div className={styles.speechBubble}>{message}</div>
      <span className={styles.thoughtSmall} />
      <span className={styles.thoughtLarge} />
      <img className={styles.mascotImg} src={imageSrc} alt="" />
    </div>
  );
}