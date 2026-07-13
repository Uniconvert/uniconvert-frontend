import styles from './PagePlaceholder.module.css'

interface PagePlaceholderProps {
  eyebrow: string
  title: string
  description: string
}

/**
 * 라우팅과 담당 페이지 위치를 확인하기 위한 임시 화면입니다.
 * 실제 페이지 구현이 시작되면 각 페이지의 UI로 교체합니다.
 */
function PagePlaceholder({
  eyebrow,
  title,
  description,
}: PagePlaceholderProps) {
  return (
    <section className={styles.placeholder}>
      <span>{eyebrow}</span>
      <h1>{title}</h1>
      <p>{description}</p>
    </section>
  )
}

export default PagePlaceholder
