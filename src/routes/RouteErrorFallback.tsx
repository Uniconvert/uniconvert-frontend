import { useNavigate, useRouteError } from 'react-router'
import ErrorState from '@/components/common/ErrorState/ErrorState'
import { ROUTE_PATHS } from './routePaths'
import { navigateToRouteRecovery } from './routeRecovery'
import styles from './RouteErrorFallback.module.css'

function RouteErrorFallback() {
  useRouteError()
  const navigate = useNavigate()

  return (
    <main className={styles.page} aria-label="페이지 오류">
      <ErrorState
        title="페이지를 불러오지 못했습니다."
        description="잠시 후 다시 시도하거나 홈으로 이동해 주세요."
        retryLabel="홈으로 이동"
        onRetry={() => navigateToRouteRecovery(navigate)}
      />
      <button
        className={styles.loginAction}
        type="button"
        onClick={() => navigate(ROUTE_PATHS.login, { replace: true })}
      >
        로그인으로 이동
      </button>
    </main>
  )
}

export default RouteErrorFallback
