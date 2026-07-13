import { Outlet } from 'react-router'
import styles from './AuthLayout.module.css'

function AuthLayout() {
  return (
    <main className={styles.layout}>
      <Outlet />
    </main>
  )
}

export default AuthLayout
