import { Outlet } from 'react-router'
import styles from './AuthLayout.module.css'

function AuthLayout() {
  return (
    <main className={styles.layout}>
      <div className={styles.scene}>
        <Outlet />
      </div>
    </main>
  )
}

export default AuthLayout
