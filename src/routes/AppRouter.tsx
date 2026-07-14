import { createBrowserRouter } from 'react-router'
import AuthLayout from '@/layouts/AuthLayout/AuthLayout'
import DashboardLayout from '@/layouts/DashboardLayout/DashboardLayout'
import CalculatorPage from '@/pages/CalculatorPage/CalculatorPage'
import ExpenseDetailPage from '@/pages/ExpenseDetailPage/ExpenseDetailPage'
import ExpenseHistoryPage from '@/pages/ExpenseHistoryPage/ExpenseHistoryPage'
import ExpenseInputPage from '@/pages/ExpenseInputPage/ExpenseInputPage'
import LandingPage from '@/pages/LandingPage/LandingPage'
import LoginPage from '@/pages/LoginPage/LoginPage'
import NotFoundPage from '@/pages/NotFoundPage/NotFoundPage'
import OcrUploadPage from '@/pages/OcrUploadPage/OcrUploadPage'
import BaseCurrencyPage from '@/pages/onboarding/BaseCurrencyPage/BaseCurrencyPage'
import BudgetSetupPage from '@/pages/onboarding/BudgetSetupPage/BudgetSetupPage'
import LocalCurrenciesPage from '@/pages/onboarding/LocalCurrenciesPage/LocalCurrenciesPage'
import ProfileSetupPage from '@/pages/onboarding/ProfileSetupPage/ProfileSetupPage'
import PotsPage from '@/pages/PotsPage/PotsPage'
import ReportPage from '@/pages/ReportPage/ReportPage'
import SettingsPage from '@/pages/SettingsPage/SettingsPage'
import SignUpPage from '@/pages/SignUpPage/SignUpPage'
import TermsPage from '@/pages/TermsPage/TermsPage'
import VerifyEmailPage from '@/pages/VerifyEmailPage/VerifyEmailPage'
import { ROUTE_PATHS } from './routePaths'

export const router = createBrowserRouter([
  {
    path: ROUTE_PATHS.landing,
    Component: LandingPage,
  },
  {
    Component: AuthLayout,
    children: [
      { path: ROUTE_PATHS.login, Component: LoginPage },
      { path: ROUTE_PATHS.signUp, Component: SignUpPage },
      { path: ROUTE_PATHS.terms, Component: TermsPage },
      { path: ROUTE_PATHS.verifyEmail, Component: VerifyEmailPage },
      {
        path: ROUTE_PATHS.onboardingBaseCurrency,
        Component: BaseCurrencyPage,
      },
      {
        path: ROUTE_PATHS.onboardingLocalCurrencies,
        Component: LocalCurrenciesPage,
      },
      {
        path: ROUTE_PATHS.onboardingBudget,
        Component: BudgetSetupPage,
      },
      {
        path: ROUTE_PATHS.onboardingProfile,
        Component: ProfileSetupPage,
      },
    ],
  },
  {
    Component: DashboardLayout,
    children: [
      { path: ROUTE_PATHS.home, Component: ExpenseInputPage },
      { path: ROUTE_PATHS.expenses, Component: ExpenseHistoryPage },
      { path: ROUTE_PATHS.expenseDetail, Component: ExpenseDetailPage },
      { path: ROUTE_PATHS.pots, Component: PotsPage },
      { path: ROUTE_PATHS.report, Component: ReportPage },
      { path: ROUTE_PATHS.calculator, Component: CalculatorPage },
      { path: ROUTE_PATHS.ocr, Component: OcrUploadPage },
      { path: ROUTE_PATHS.settings, Component: SettingsPage },
    ],
  },
  {
    path: '*',
    Component: NotFoundPage,
  },
])
