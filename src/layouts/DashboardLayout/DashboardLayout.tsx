import { useCallback, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router'
import { logout } from '@/api/auth'
import { upsertBudget } from '@/api/budgets'
import { clearSession } from '@/auth/session'
import ModalShell from '@/components/common/ModalShell/ModalShell'
import Toast from '@/components/common/Toast/Toast'
import { useToastQueue } from '@/components/common/Toast/useToastQueue'
import { useDashboardAssetSummary } from '@/hooks/useDashboardAssetSummary'
import { useSessionUser } from '@/hooks/useSessionUser'
import { ROUTE_PATHS } from '@/routes/routePaths'
import { useI18n } from '@/i18n/I18nContext'
import styles from './DashboardLayout.module.css'

type NavigationIconName =
  | 'home'
  | 'report'
  | 'calculator'
  | 'settings'

interface NavigationItem {
  labelKey: string
  to: string
  icon: NavigationIconName
  matches: (pathname: string) => boolean
}

const navigationItems: NavigationItem[] = [
  {
    labelKey: 'nav.home',
    to: ROUTE_PATHS.home,
    icon: 'home',
    matches: (pathname) => pathname.startsWith(ROUTE_PATHS.home),
  },
  {
    labelKey: 'nav.report',
    to: ROUTE_PATHS.report,
    icon: 'report',
    matches: (pathname) => pathname.startsWith(ROUTE_PATHS.report),
  },
  {
    labelKey: 'nav.calculator',
    to: ROUTE_PATHS.calculator,
    icon: 'calculator',
    matches: (pathname) => pathname === ROUTE_PATHS.calculator,
  },
  {
    labelKey: 'nav.settings',
    to: ROUTE_PATHS.settings,
    icon: 'settings',
    matches: (pathname) => pathname === ROUTE_PATHS.settings,
  },
]

const homeTabs = [
  {
    labelKey: 'nav.expenseInput',
    to: ROUTE_PATHS.home,
    matches: (pathname: string) =>
      pathname === ROUTE_PATHS.home || pathname === ROUTE_PATHS.expenseCreate,
  },
  {
    labelKey: 'nav.expenseHistory',
    to: ROUTE_PATHS.expenses,
    matches: (pathname: string) =>
      pathname.startsWith(ROUTE_PATHS.expenses) &&
      pathname !== ROUTE_PATHS.expenseCreate,
  },
  {
    labelKey: 'nav.pots',
    to: ROUTE_PATHS.pots,
    matches: (pathname: string) => pathname === ROUTE_PATHS.pots,
  },
]

const reportTabs = [
  {
    labelKey: 'nav.report',
    to: ROUTE_PATHS.report,
    matches: (pathname: string) => pathname === ROUTE_PATHS.report,
  },
  {
    labelKey: 'nav.memo',
    to: ROUTE_PATHS.reportMemos,
    matches: (pathname: string) => pathname === ROUTE_PATHS.reportMemos,
  },
]

function BudgetEditModal({
  initialBudget,
  maximumBudget,
  currencySymbol,
  onClose,
  onSave,
}: {
  initialBudget: number
  maximumBudget: number
  currencySymbol: string
  onClose: () => void
  onSave: (budget: number) => void
}) {
  const { locale, t } = useI18n()
  const [budget, setBudget] = useState(() => Math.min(initialBudget, maximumBudget))
  const progress = maximumBudget > 0 ? (budget / maximumBudget) * 100 : 0
  const rangeStep = currencySymbol === '₩' ? 10000 : 1

  const updateBudget = (value: string) => {
    const nextBudget = Math.min(Number(value.replace(/\D/g, '')) || 0, maximumBudget)
    setBudget(nextBudget)
  }

  return (
    <ModalShell
      title={t('dashboard.budgetEdit')}
      titleId="budget-modal-title"
      closeLabel={t('dashboard.budgetEditClose')}
      width="44rem"
      bodyClassName={styles.budgetModalBody}
      onClose={onClose}
    >
      <form onSubmit={(event) => { event.preventDefault(); onSave(budget) }}>
          <div className={styles.budgetModalCopy}>
            <h3>{t('dashboard.monthlyBudgetAmount')}</h3>
            <p>{t('dashboard.budgetDescription')}</p>
          </div>

          <label className={styles.budgetInput}>
            <span className={styles.srOnly}>{t('dashboard.monthlyBudgetAmount')}</span>
            <span aria-hidden="true">{currencySymbol}</span>
            <input inputMode="numeric" value={budget.toLocaleString(locale)} onChange={(event) => updateBudget(event.target.value)} />
          </label>

          <div
            className={styles.budgetRangeWrap}
            style={{ '--budget-progress': `${progress}%` } as React.CSSProperties}
          >
            <output style={{ left: `${progress}%`, transform: `translateX(-${progress}%)` }}>
              {currencySymbol} {budget.toLocaleString(locale)}
            </output>
            <input
              type="range"
              min="0"
              max={maximumBudget}
              step={rangeStep}
              value={budget}
              aria-label={t('dashboard.budgetSlider')}
              onChange={(event) => setBudget(Number(event.target.value))}
            />
            <div className={styles.budgetRangeLabels}><span>{currencySymbol} 0</span><span>{currencySymbol} {maximumBudget.toLocaleString(locale)}</span></div>
          </div>

          <div className={styles.budgetModalActions}>
            <button type="button" onClick={onClose}>{t('common.cancel')}</button>
            <button type="submit" disabled={budget <= 0}>{t('common.save')}</button>
          </div>
      </form>
    </ModalShell>
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
  const { locale, t } = useI18n()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const now = new Date()
  const currentYearMonth = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}`
  const currentYearMonthApi = currentYearMonth.replace('.', '-')
  const sessionUser = useSessionUser()
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [budgetVersion, setBudgetVersion] = useState(0)
  const { toast, showToast, closeToast } = useToastQueue()
  const showBudgetLoadError = useCallback(() => {
    showToast({ variant: 'error', title: t('dashboard.budgetLoadError') })
  }, [showToast, t])
  const { assetSummary, setAssetSummary } = useDashboardAssetSummary({
    yearMonth: currentYearMonthApi,
    onError: showBudgetLoadError,
    enabled: pathname !== ROUTE_PATHS.reportMemos,
  })
  const displayName = sessionUser?.nickname || t('common.user')
  // The shared sidebar summary only has the budget response. Page-specific
  // expense screens provide their own live usage/remaining values.
  const mobileBudgetUsagePercent = 0
  const isExpenseHistoryPage = pathname === ROUTE_PATHS.expenses
  const activeItem =
    navigationItems.find((item) => item.matches(pathname)) ?? navigationItems[0]
  const pageTabs =
    activeItem.icon === 'home'
      ? homeTabs
      : activeItem.icon === 'report'
        ? reportTabs
        : [activeItem]
  const activeNavigationIndex = navigationItems.indexOf(activeItem)
  const navigationItemsBefore = navigationItems.slice(0, activeNavigationIndex)
  const navigationItemsAfter = navigationItems.slice(activeNavigationIndex + 1)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
    } catch {
      // 서버 로그아웃이 실패해도 브라우저의 인증 정보는 반드시 제거합니다.
    } finally {
      clearSession()
      setIsLogoutModalOpen(false)
      setIsLoggingOut(false)
      navigate(ROUTE_PATHS.login, { replace: true })
    }
  }

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
      <span>{t(item.labelKey)}</span>
    </Link>
  )

  return (
    <div className={styles.layout}>
      {toast && <Toast key={toast.id} {...toast} onClose={closeToast} />}
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

        <div className={styles.userChip} aria-label={t('dashboard.currentUser', { name: displayName })}>
          <span className={styles.avatar} aria-hidden="true">
            {sessionUser?.profileImage
              ? <img src={sessionUser.profileImage} alt="" />
              : displayName.charAt(0).toUpperCase()}
          </span>
          <span>{displayName}</span>
        </div>
      </header>

      <section
        className={styles.mobileAssetSummary}
        aria-labelledby="mobile-asset-summary-title"
      >
        <button className={styles.assetEditButton} type="button" aria-label={t('dashboard.editMonthlyBudget')} onClick={() => setIsBudgetModalOpen(true)}>
          <img src="/assets/icons/actions/action-edit-assets.png" alt="" aria-hidden="true" />
        </button>
        <div className={styles.mobileAssetOverview}>
          <div className={styles.assetRing} aria-hidden="true">
            <img className={styles.assetRingGraphic} src="/assets/illustrations/asset-ring.png" alt="" />
            <span className={styles.assetRingContent}>
              <img className={styles.assetRingWallet} src="/assets/icons/pots/pot-wallet.png" alt="" />
              <small>{currentYearMonth}</small>
            </span>
          </div>
          <div className={styles.mobileAssetCopy}>
            <h2 id="mobile-asset-summary-title">{t('dashboard.monthlyBudget')}</h2>
            <p className={styles.assetTotal}>
              {assetSummary.currencySymbol} {assetSummary.totalAssetHome.toLocaleString(locale)}
            </p>
            <p className={styles.assetUsd}>({assetSummary.localCurrencyAmountLabel})</p>
          </div>
        </div>
        <div className={`${styles.mobileBudgetSummary} ${isExpenseHistoryPage ? '' : styles.mobileBudgetSummaryHidden}`}>
          <div className={styles.mobileBudgetHeader}>
            <span>{t('dashboard.monthlyBudget')}</span>
            <strong>{mobileBudgetUsagePercent}%</strong>
          </div>
          <div className={styles.mobileBudgetTrack}>
            <span style={{ width: `${mobileBudgetUsagePercent}%` }} />
          </div>
          <div className={styles.mobileBudgetRemaining}>
            <span>{t('expenseInput.remainingBudget')}</span>
            <strong>{assetSummary.currencySymbol} {assetSummary.totalAssetHome.toLocaleString(locale)}</strong>
          </div>
        </div>
      </section>

      <aside className={styles.sidebar}>
        <nav className={styles.navigation} aria-label={t('dashboard.mainMenu')}>
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
                <button className={styles.assetEditButton} type="button" aria-label={t('dashboard.editMonthlyBudget')} onClick={() => setIsBudgetModalOpen(true)}>
                  <img src="/assets/icons/actions/action-edit-assets.png" alt="" aria-hidden="true" />
                </button>
                <div className={styles.assetRing} aria-hidden="true">
                  <img className={styles.assetRingGraphic} src="/assets/illustrations/asset-ring.png" alt="" />
                  <span className={styles.assetRingContent}>
                    <img className={styles.assetRingWallet} src="/assets/icons/pots/pot-wallet.png" alt="" />
                    <small>{currentYearMonth}</small>
                  </span>
                </div>
                <h2 id="asset-summary-title">{t('dashboard.monthlyBudget')}</h2>
                <p className={styles.assetTotal}>
                  {assetSummary.currencySymbol} {assetSummary.totalAssetHome.toLocaleString(locale)}
                </p>
                <p className={styles.assetUsd}>({assetSummary.localCurrencyAmountLabel})</p>
              </section>

              <Link
                className={styles.logoutLink}
                to={ROUTE_PATHS.login}
                onClick={(event) => {
                  event.preventDefault()
                  setIsLogoutModalOpen(true)
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9" />
                </svg>
                {t('nav.logout')}
              </Link>
            </div>
          </div>
        </nav>
      </aside>

      <nav
        className={styles.pageTabs}
        aria-label={activeItem.icon === 'home' ? t('dashboard.homeMenu') : t('dashboard.currentScreen')}
      >
        {pageTabs.map((tab) => {
          const isActive = tab.matches(pathname)

          return (
            <Link
              key={tab.labelKey}
              to={tab.to}
              className={isActive ? styles.activePageTab : undefined}
              aria-current={isActive ? 'page' : undefined}
            >
              {t(tab.labelKey)}
            </Link>
          )
        })}
      </nav>

      <div className={styles.workspace}>
        <main className={styles.content}>
          <Outlet key={budgetVersion} />
        </main>
      </div>

      {isBudgetModalOpen && (
        <BudgetEditModal
          initialBudget={assetSummary.totalAssetHome}
          maximumBudget={assetSummary.homeCurrency === 'KRW' ? 3_000_000 : 3_000}
          currencySymbol={assetSummary.currencySymbol}
          onClose={() => setIsBudgetModalOpen(false)}
          onSave={async (budget) => {
            try {
              const updated = await upsertBudget(currentYearMonthApi, budget)
              setAssetSummary((current) => ({
                ...current,
                totalAssetHome: updated.monthlyLimitHome ?? budget,
              }))
              setBudgetVersion((version) => version + 1)
              setIsBudgetModalOpen(false)
              showToast({ variant: 'success', title: t('dashboard.updated') })
            } catch {
              showToast({ variant: 'error', title: t('dashboard.budgetUpdateError') })
            }
          }}
        />
      )}

      {isLogoutModalOpen && (
        <ModalShell
          title={t('dashboard.logoutTitle')}
          titleId="logout-modal-title"
          closeLabel={t('dashboard.logoutClose')}
          width="31rem"
          bodyClassName={styles.logoutModalBody}
          onClose={() => {
            if (!isLoggingOut) setIsLogoutModalOpen(false)
          }}
        >
          <img
            className={styles.logoutMascot}
            src="/assets/illustrations/mascot-warning.png"
            alt=""
            aria-hidden="true"
          />
          <p>{t('dashboard.logoutDescription')}</p>
          <div className={styles.logoutModalActions}>
            <button
              type="button"
              disabled={isLoggingOut}
              onClick={() => setIsLogoutModalOpen(false)}
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              disabled={isLoggingOut}
              onClick={() => void handleLogout()}
            >
              {isLoggingOut ? t('dashboard.loggingOut') : t('nav.logout')}
            </button>
          </div>
        </ModalShell>
      )}
    </div>
  )
}

export default DashboardLayout
