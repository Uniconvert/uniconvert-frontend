import { Outlet } from 'react-router'
import styles from './PublicCalculatorLayout.module.css'

function PublicCalculatorLayout() {
  return (
    <div className={styles.layout}>
      <main className={styles.content}><Outlet /></main>
    </div>
  )
}

export default PublicCalculatorLayout
