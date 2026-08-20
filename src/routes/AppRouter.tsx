import type { ComponentType } from 'react'
import { createBrowserRouter } from 'react-router'
import AuthLayout from '@/layouts/AuthLayout/AuthLayout'
import DashboardLayout from '@/layouts/DashboardLayout/DashboardLayout'
import { DashboardRouteGuard, EmailVerificationRouteGuard, GuestRouteGuard, OnboardingRouteGuard } from './RouteGuards'
import { ROUTE_PATHS } from './routePaths'
import RouteErrorFallback from './RouteErrorFallback'
import PublicCalculatorLayout from '@/layouts/PublicCalculatorLayout/PublicCalculatorLayout'
import CalculatorPage from '@/pages/CalculatorPage/CalculatorPage'
import ExpenseHistoryPage from '@/pages/ExpenseHistoryPage/ExpenseHistoryPage'

const lazyComponent = (load: () => Promise<{ default: ComponentType }>) => async () => {
  const module = await load()
  return { Component: module.default }
}

export const router = createBrowserRouter([
  {
    path: ROUTE_PATHS.landing,
    errorElement: <RouteErrorFallback />,
    lazy: lazyComponent(() => import('@/pages/LandingPage/LandingPage')),
  },
  {
    Component: PublicCalculatorLayout,
    errorElement: <RouteErrorFallback />,
    children: [
      { path: ROUTE_PATHS.offlineCalculator, Component: CalculatorPage },
    ],
  },
  {
    Component: AuthLayout,
    errorElement: <RouteErrorFallback />,
    children: [
      {
        Component: GuestRouteGuard,
        children: [
          { path: ROUTE_PATHS.login, lazy: lazyComponent(() => import('@/pages/LoginPage/LoginPage')) },
          { path: ROUTE_PATHS.signUp, lazy: lazyComponent(() => import('@/pages/SignUpPage/SignUpPage')) },
        ],
      },
      {
        Component: EmailVerificationRouteGuard,
        children: [{ path: ROUTE_PATHS.verifyEmail, lazy: lazyComponent(() => import('@/pages/VerifyEmailPage/VerifyEmailPage')) }],
      },
      {
        Component: OnboardingRouteGuard,
        children: [
          { path: ROUTE_PATHS.onboardingBaseCurrency, lazy: lazyComponent(() => import('@/pages/onboarding/BaseCurrencyPage/BaseCurrencyPage')) },
          { path: ROUTE_PATHS.onboardingLocalCurrencies, lazy: lazyComponent(() => import('@/pages/onboarding/LocalCurrenciesPage/LocalCurrenciesPage')) },
          { path: ROUTE_PATHS.onboardingBudget, lazy: lazyComponent(() => import('@/pages/onboarding/BudgetSetupPage/BudgetSetupPage')) },
          { path: ROUTE_PATHS.onboardingTimezone, lazy: lazyComponent(() => import('@/pages/onboarding/TimezoneSetupPage/TimezoneSetupPage')) },
          { path: ROUTE_PATHS.onboardingProfile, lazy: lazyComponent(() => import('@/pages/onboarding/ProfileSetupPage/ProfileSetupPage')) },
        ],
      },
    ],
  },
  {
    Component: DashboardRouteGuard,
    errorElement: <RouteErrorFallback />,
    children: [
      {
        Component: DashboardLayout,
        children: [
          { path: ROUTE_PATHS.home, lazy: lazyComponent(() => import('@/pages/ExpenseInputPage/ExpenseInputPage')) },
          { path: ROUTE_PATHS.expenses, Component: ExpenseHistoryPage },
          { path: ROUTE_PATHS.pots, lazy: lazyComponent(() => import('@/pages/PotsPage/PotsPage')) },
          { path: ROUTE_PATHS.report, lazy: lazyComponent(() => import('@/pages/ReportPage/ReportPage')) },
          { path: ROUTE_PATHS.reportMemos, lazy: lazyComponent(() => import('@/pages/MemoPage/MemoPage')) },
          { path: ROUTE_PATHS.calculator, Component: CalculatorPage },
          { path: ROUTE_PATHS.ocr, lazy: lazyComponent(() => import('@/pages/OcrUploadPage/OcrUploadPage')) },
          { path: ROUTE_PATHS.settings, lazy: lazyComponent(() => import('@/pages/SettingsPage/SettingsPage')) },
        ],
      },
    ],
  },
  {
    path: '*',
    errorElement: <RouteErrorFallback />,
    lazy: lazyComponent(() => import('@/pages/NotFoundPage/NotFoundPage')),
  },
])
