import { createContext, useContext } from 'react'
import type { SupportedLanguage } from './language'

export type MessageValues = Record<string, string | number>

export interface I18nValue {
  language: SupportedLanguage
  locale: string
  t: (key: string, values?: MessageValues) => string
}

export const I18nContext = createContext<I18nValue | null>(null)

export function useI18n() {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n must be used inside I18nProvider')
  return value
}
