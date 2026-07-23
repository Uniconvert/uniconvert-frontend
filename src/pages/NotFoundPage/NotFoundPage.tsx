import { Link } from 'react-router'
import { ROUTE_PATHS } from '@/routes/routePaths'
import styles from './NotFoundPage.module.css'

function NotFoundPage() {
  return (
    <main className={styles.page}>
      <span>404</span>
      <h1>페이지를 찾을 수 없습니다.</h1>
      <p>주소를 다시 확인하거나 홈으로 이동해 주세요.</p>
      <Link to={ROUTE_PATHS.landing}>처음으로 돌아가기</Link>
    </main>
  )
}

export default NotFoundPage
