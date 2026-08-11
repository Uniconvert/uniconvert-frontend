import styles from './Mascot.module.css';

const HIGHLIGHT_TOKEN = /(?:₩\s?[\d,]+(?:\.\d+)?|[$€¥]\s?[\d,]+(?:\.\d+)?|\b\d+(?:\.\d+)?%)/;
const HIGHLIGHT_SPLITTER = /((?:₩\s?[\d,]+(?:\.\d+)?|[$€¥]\s?[\d,]+(?:\.\d+)?|\b\d+(?:\.\d+)?%))/g;

interface MascotProps {
  message: React.ReactNode;
  imageSrc: string;
  speechBubbleVariant?: 'default' | 'twoLine' | 'compact';
}

function renderMessage(message: React.ReactNode) {
  if (typeof message !== 'string') return message;

  return message.split(HIGHLIGHT_SPLITTER).map((part, index) => (
    HIGHLIGHT_TOKEN.test(part)
      ? <span className={styles.messageHighlight} key={`${part}-${index}`}>{part}</span>
      : part
  ));
}

export default function Mascot({
  message,
  imageSrc,
  speechBubbleVariant = 'default',
}: MascotProps) {
  return (
    <div className={styles.mascotContainer} aria-hidden="true">
      <div className={styles.bubbleGroup}>
        <div
          className={`${styles.speechBubble} ${
            speechBubbleVariant === 'twoLine'
              ? styles.twoLine
              : speechBubbleVariant === 'compact'
                ? styles.compact
                : ''
          }`}
        >
          {renderMessage(message)}
        </div>
        <span className={styles.thoughtSmall} />
        <span className={styles.thoughtLarge} />
      </div>
      <img className={styles.mascotImg} src={imageSrc} alt="" />
    </div>
  );
}
