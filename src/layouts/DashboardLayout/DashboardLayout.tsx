import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { clearSession, getSessionUser } from '@/auth/session'
import { getMockAssetSummary } from '@/mocks/dashboardStore'
import { getStoredPots, updateStoredPotsAllocation } from '@/mocks/potStore'
import { ROUTE_PATHS } from '@/routes/routePaths'
import styles from './DashboardLayout.module.css'

type NavigationIconName =
  | 'home'
  | 'report'
  | 'calculator'
  | 'settings'

interface NavigationItem {
  label: string
  to: string
  icon: NavigationIconName
  matches: (pathname: string) => boolean
}

const navigationItems: NavigationItem[] = [
  {
    label: '홈',
    to: ROUTE_PATHS.home,
    icon: 'home',
    matches: (pathname) => pathname.startsWith(ROUTE_PATHS.home),
  },
  {
    label: '리포트',
    to: ROUTE_PATHS.report,
    icon: 'report',
    matches: (pathname) => pathname === ROUTE_PATHS.report,
  },
  {
    label: '계산기',
    to: ROUTE_PATHS.calculator,
    icon: 'calculator',
    matches: (pathname) => pathname === ROUTE_PATHS.calculator,
  },
  {
    label: '설정',
    to: ROUTE_PATHS.settings,
    icon: 'settings',
    matches: (pathname) => pathname === ROUTE_PATHS.settings,
  },
]

const homeTabs = [
  {
    label: '지출입력',
    to: ROUTE_PATHS.home,
    matches: (pathname: string) =>
      pathname === ROUTE_PATHS.home || pathname === ROUTE_PATHS.expenseCreate,
  },
  {
    label: '지출내역',
    to: ROUTE_PATHS.expenses,
    matches: (pathname: string) =>
      pathname.startsWith(ROUTE_PATHS.expenses) &&
      pathname !== ROUTE_PATHS.expenseCreate,
  },
  {
    label: 'Pots',
    to: ROUTE_PATHS.pots,
    matches: (pathname: string) => pathname === ROUTE_PATHS.pots,
  },
]

function BudgetEditModal({
  initialAllocation,
  maxBudget,
  currencySymbol,
  onClose,
  onSave,
}: {
  initialAllocation: number
  maxBudget: number
  currencySymbol: string
  onClose: () => void
  onSave: (budget: number) => void
}) {
  const [budget, setBudget] = useState(initialAllocation)
  const progress = maxBudget > 0 ? (budget / maxBudget) * 100 : 0

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const updateBudget = (value: string) => {
    const nextBudget = Math.min(Number(value.replace(/\D/g, '')) || 0, maxBudget)
    setBudget(nextBudget)
  }

  return (
    <div className={styles.budgetModalBackdrop} role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className={styles.budgetModal} role="dialog" aria-modal="true" aria-labelledby="budget-modal-title">
        <header>
          <h2 id="budget-modal-title">Pots 배정 금액 수정</h2>
          <button type="button" aria-label="Pots 배정 금액 수정 닫기" onClick={onClose}>×</button>
        </header>

        <form onSubmit={(event) => { event.preventDefault(); onSave(budget) }}>
          <div className={styles.budgetModalCopy}>
            <h3>월 Pots 배정 금액</h3>
            <p>월 예산 중 Pots에 모으고 싶은 금액을 설정해주세요.</p>
          </div>

          <label className={styles.budgetInput}>
            <span className={styles.srOnly}>월 Pots 배정 금액</span>
            <span aria-hidden="true">{currencySymbol}</span>
            <input inputMode="numeric" value={budget.toLocaleString('ko-KR')} onChange={(event) => updateBudget(event.target.value)} />
          </label>

          <div className={styles.budgetRangeWrap}>
            <output style={{ left: `${progress}%` }}>{currencySymbol} {budget.toLocaleString('ko-KR')}</output>
            <input
              type="range"
              min="0"
              max={maxBudget}
              step="10000"
              value={budget}
              aria-label="월 Pots 배정 금액 슬라이더"
              style={{ '--budget-progress': `${progress}%` } as React.CSSProperties}
              onChange={(event) => setBudget(Number(event.target.value))}
            />
            <div className={styles.budgetRangeLabels}><span>{currencySymbol} 0</span><span>월 예산 {currencySymbol} {maxBudget.toLocaleString('ko-KR')}</span></div>
          </div>

          <div className={styles.budgetModalActions}>
            <button type="button" onClick={onClose}>취소</button>
            <button type="submit" disabled={maxBudget <= 0}>저장하기</button>
          </div>
        </form>
      </section>
    </div>
  )
}

function NavigationIcon({ name }: { name: NavigationIconName }) {
  if (name === 'home') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m3.5 10 8.5-7 8.5 7v9.5a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5Z" />
        <path d="M9 21v-7h6v7" />
      </svg>
    )
  }

  if (name === 'report') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 20v-6M12 20V4M19 20V9" />
      </svg>
    )
  }

  if (name === 'calculator') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="2.5" width="16" height="19" rx="2" />
        <path d="M8 7h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h.01M12 19h4" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.1A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.1A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.1A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.15.38.36.72.6 1 .3.36.7.57 1.1.6h.1v4h-.1c-.4.03-.8.24-1.1.6-.24.28-.45.62-.6 1Z" />
    </svg>
  )
}

function DashboardLayout() {
  const { pathname } = useLocation()
  const now = new Date()
  const currentYearMonth = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}`
  const sessionUser = getSessionUser()
  const [assetSummary, setAssetSummary] = useState(getMockAssetSummary)
  const [potsAllocation, setPotsAllocation] = useState(() => getStoredPots().allocatedAmount)
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false)
  const [budgetVersion, setBudgetVersion] = useState(0)
  const displayName = sessionUser?.nickname || '사용자'
  const activeItem =
    navigationItems.find((item) => item.matches(pathname)) ?? navigationItems[0]
  const pageTabs = activeItem.label === '홈' ? homeTabs : [activeItem]
  const activeNavigationIndex = navigationItems.indexOf(activeItem)
  const navigationItemsBefore = navigationItems.slice(0, activeNavigationIndex)
  const navigationItemsAfter = navigationItems.slice(activeNavigationIndex + 1)

  const renderNavigationItem = (
    item: NavigationItem,
    isActive = false,
  ) => (
    <Link
      key={item.to}
      to={item.to}
      className={`${styles.navigationLink} ${isActive ? styles.active : ''}`}
      aria-current={isActive ? 'page' : undefined}
    >
      <span className={styles.navigationIcon}>
        <NavigationIcon name={item.icon} />
      </span>
      <span>{item.label}</span>
    </Link>
  )

  return (
    <div className={styles.layout}>
      <header className={styles.topbar}>
        <Link className={styles.brand} to={ROUTE_PATHS.home}>
          <span className={styles.brandMarkFrame} aria-hidden="true">
            <img
              className={styles.brandMarkSource}
              src="/assets/brand/uniconvert-logo-stacked.png"
              alt=""
            />
          </span>
          <img
            className={styles.brandWordmark}
            src="/assets/brand/uniconvert-wordmark.png"
            alt="Uniconvert"
          />
        </Link>

        <div className={styles.headerScene} aria-hidden="true">
          <img className={styles.flightPath} src="/assets/illustrations/header-flight-path.png" alt="" />
          <img className={styles.airport} src="/assets/illustrations/airport.png" alt="" />
        </div>

        <div className={styles.userChip} aria-label={`현재 사용자 ${displayName}`}>
          <span className={styles.avatar} aria-hidden="true">
            {sessionUser?.profileImage
              ? <img src={sessionUser.profileImage} alt="" />
              : displayName.charAt(0).toUpperCase()}
          </span>
          <span>{displayName}</span>
          <span className={styles.notificationDot} aria-hidden="true" />
        </div>
      </header>

      <aside className={styles.sidebar}>
        <nav className={styles.navigation} aria-label="주요 메뉴">
          <div className={styles.upperNavigation}>
            <div className={styles.sidebarCap} aria-hidden="true" />
            {navigationItemsBefore.map((item) =>
              renderNavigationItem(item),
            )}
          </div>

          {renderNavigationItem(activeItem, true)}

          <div className={styles.lowerNavigation}>
            {navigationItemsAfter.map((item) =>
              renderNavigationItem(item),
            )}

            <div className={styles.sidebarFooter}>
              <section
                className={styles.assetSummary}
                aria-labelledby="asset-summary-title"
              >
                <button className={styles.assetEditButton} type="button" aria-label="총 보유 자산 편집" onClick={() => setIsBudgetModalOpen(true)}>
                  <img src="/assets/icons/actions/action-edit-assets.png" alt="" aria-hidden="true" />
                </button>
                <div className={styles.assetRing} aria-hidden="true"><img src="/assets/icons/pots/pot-wallet.png" alt="" /><small>{currentYearMonth}</small></div>
                <h2 id="asset-summary-title">총 보유 자산</h2>
                <p className={styles.assetTotal}>
                  {assetSummary.currencySymbol} {assetSummary.totalAssetHome.toLocaleString('ko-KR')}
                </p>
                <p className={styles.assetUsd}>({assetSummary.secondaryLabel})</p>
              </section>

              <Link className={styles.logoutLink} to={ROUTE_PATHS.login} onClick={clearSession}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9" />
                </svg>
                로그아웃
              </Link>
            </div>
          </div>
        </nav>
      </aside>

      <div className={styles.workspace}>
        <nav
          className={styles.pageTabs}
          aria-label={activeItem.label === '홈' ? '홈 화면 메뉴' : '현재 화면'}
        >
          {pageTabs.map((tab) => {
            const isActive = tab.matches(pathname)

            return (
              <Link
                key={tab.label}
                to={tab.to}
                className={isActive ? styles.activePageTab : undefined}
                aria-current={isActive ? 'page' : undefined}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>
        <main className={styles.content}>
          <Outlet key={budgetVersion} />
        </main>
      </div>

      {isBudgetModalOpen && (
        <BudgetEditModal
          initialAllocation={potsAllocation}
          maxBudget={assetSummary.totalAssetHome}
          currencySymbol={assetSummary.currencySymbol}
          onClose={() => setIsBudgetModalOpen(false)}
          onSave={(budget) => {
            const updatedPots = updateStoredPotsAllocation(budget)
            setPotsAllocation(updatedPots.allocatedAmount)
            setAssetSummary(getMockAssetSummary())
            setBudgetVersion((version) => version + 1)
            setIsBudgetModalOpen(false)
          }}
        />
      )}
    </div>
  )
}

export default DashboardLayout
