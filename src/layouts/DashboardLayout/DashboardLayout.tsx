import { useCallback, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, Outlet, useLocation, useNavigate } from 'react-router'
import { logout } from '@/api/auth'
import { upsertBudget } from '@/api/budgets'
import { getExpenseHistory } from '@/api/expenses'
import { clearSession } from '@/auth/session'
import Toast from '@/components/common/Toast/Toast'
import { useToastQueue } from '@/components/common/Toast/useToastQueue'
import { useDashboardAssetSummary } from '@/hooks/useDashboardAssetSummary'
import { useSessionUser } from '@/hooks/useSessionUser'
import { ROUTE_PATHS } from '@/routes/routePaths'
import { expenseKeys } from '@/hooks/expenseKeys'
import type { ExpenseHistoryData } from '@/types/expense'
import { getMobileBudgetMetrics } from './mobileBudgetSummary'
import { useI18n } from '@/i18n/I18nContext'
import Skeleton from '@/components/common/Skeleton/Skeleton'
import BudgetEditModal from './BudgetEditModal'
import LogoutDialog from './LogoutDialog'
import NavigationIcon, { type NavigationIconName } from './NavigationIcon'
import styles from './DashboardLayout.module.css'

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

function DashboardLayout() {
  const { locale, t } = useI18n()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const now = new Date()
  const currentYearMonth = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}`
  const currentYearMonthApi = currentYearMonth.replace('.', '-')
  const sessionUser = useSessionUser()
  const isExpenseHistoryPage = pathname === ROUTE_PATHS.expenses
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [budgetVersion, setBudgetVersion] = useState(0)
  const { toast, showToast, closeToast } = useToastQueue()
  const budgetMutation = useMutation({ mutationFn: ({ yearMonth, budget }: { yearMonth: string; budget: number }) => upsertBudget(yearMonth, budget) })
  const showBudgetLoadError = useCallback(() => {
    showToast({ variant: 'error', title: t('dashboard.budgetLoadError') })
  }, [showToast, t])
  const {
    assetSummary,
    isInitialLoading: isAssetSummaryLoading,
    isBackgroundFetching: isAssetSummaryFetching,
    setAssetSummary,
  } = useDashboardAssetSummary({
    yearMonth: currentYearMonthApi,
    onError: showBudgetLoadError,
    enabled: pathname !== ROUTE_PATHS.reportMemos,
  })
  // Observe the existing Expense History cache only. ExpenseHistoryPage owns
  // the active request; this disabled observer adds no new API call.
  const expenseHistoryCache = useQuery<ExpenseHistoryData>({
    queryKey: expenseKeys.historyFor(currentYearMonthApi, 'day'),
    queryFn: () => getExpenseHistory(currentYearMonthApi, 'day', sessionUser ? { homeCurrencyCode: sessionUser.homeCurrencyCode } : null),
    enabled: false,
  })
  const displayName = sessionUser?.nickname || t('common.user')
  const mobileBudgetMetrics = isExpenseHistoryPage
    ? getMobileBudgetMetrics(expenseHistoryCache.data ?? null)
    : null
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
            <p className={styles.assetTotal} aria-busy={isAssetSummaryLoading || isAssetSummaryFetching || undefined}>
              {isAssetSummaryLoading ? <Skeleton variant="text" width="8rem" /> : `${assetSummary.currencySymbol} ${assetSummary.totalAssetHome.toLocaleString(locale)}`}
            </p>
            <p className={styles.assetUsd}>{isAssetSummaryLoading ? <Skeleton variant="text" width="6rem" /> : `(${assetSummary.localCurrencyAmountLabel})`}</p>
          </div>
        </div>
        <div className={`${styles.mobileBudgetSummary} ${isExpenseHistoryPage ? '' : styles.mobileBudgetSummaryHidden}`} aria-busy={isExpenseHistoryPage && expenseHistoryCache.isFetching || undefined}>
          <div className={styles.mobileBudgetHeader}>
            <span>{t('dashboard.monthlyBudget')}</span>
            <strong>{mobileBudgetMetrics ? `${mobileBudgetMetrics.usagePercent}%` : '—'}</strong>
          </div>
          <div className={styles.mobileBudgetTrack}>
            <span style={{ width: `${mobileBudgetMetrics?.usagePercent ?? 0}%` }} />
          </div>
          <div className={styles.mobileBudgetRemaining}>
            <span>{t('expenseInput.remainingBudget')}</span>
            <strong>{mobileBudgetMetrics ? `${assetSummary.currencySymbol} ${mobileBudgetMetrics.remainingBudgetHome.toLocaleString(locale)}` : '—'}</strong>
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
                <p className={styles.assetTotal} aria-busy={isAssetSummaryLoading || isAssetSummaryFetching || undefined}>
                  {isAssetSummaryLoading ? <Skeleton variant="text" width="8rem" /> : `${assetSummary.currencySymbol} ${assetSummary.totalAssetHome.toLocaleString(locale)}`}
                </p>
                <p className={styles.assetUsd}>{isAssetSummaryLoading ? <Skeleton variant="text" width="6rem" /> : `(${assetSummary.localCurrencyAmountLabel})`}</p>
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
          isSaving={budgetMutation.isPending}
          onClose={() => setIsBudgetModalOpen(false)}
          onSave={async (budget) => {
            if (budgetMutation.isPending) return
            try {
              const updated = await budgetMutation.mutateAsync({ yearMonth: currentYearMonthApi, budget })
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
        <LogoutDialog
          isLoggingOut={isLoggingOut}
          onClose={() => { if (!isLoggingOut) setIsLogoutModalOpen(false) }}
          onConfirm={() => { void handleLogout() }}
        />
      )}
    </div>
  )
}

export default DashboardLayout
