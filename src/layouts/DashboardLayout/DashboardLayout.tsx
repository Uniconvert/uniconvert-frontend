import { NavLink, Outlet } from 'react-router'
import { ROUTE_PATHS } from '../../routes/routePaths'
import styles from './DashboardLayout.module.css'

const navigationItems = [
  { label: '홈', to: ROUTE_PATHS.home },
  { label: '지출내역', to: ROUTE_PATHS.expenses },
  { label: '리포트', to: ROUTE_PATHS.report },
  { label: '계산기', to: ROUTE_PATHS.calculator },
  { label: '설정', to: ROUTE_PATHS.settings },
]

function DashboardLayout() {
  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <strong className={styles.brand}>Uniconvert</strong>

        <nav aria-label="주요 메뉴" className={styles.navigation}>
          {navigationItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `${styles.navigationLink} ${isActive ? styles.active : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  )
}

export default DashboardLayout
