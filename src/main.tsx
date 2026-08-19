import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { I18nProvider } from './i18n/I18nProvider'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { registerServiceWorker } from './pwa/registerServiceWorker'
import './styles/globals.css'

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } } })

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <I18nProvider><App /></I18nProvider>
  </QueryClientProvider>,
)

registerServiceWorker()
