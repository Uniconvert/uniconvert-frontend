export type SupportedLanguage = 'ko' | 'en' | 'ja' | 'zh'

export function resolveSupportedLanguage(languages: readonly string[]): SupportedLanguage {
  const normalized = languages.map((language) => language.toLowerCase())

  if (normalized.some((language) => language.startsWith('ko'))) return 'ko'
  if (normalized.some((language) => language.startsWith('ja'))) return 'ja'
  if (normalized.some((language) => language.startsWith('zh'))) return 'zh'
  return 'en'
}

export function resolveBrowserLanguage(): SupportedLanguage {
  if (typeof navigator === 'undefined') return 'ko'

  const languages = navigator.languages?.length ? navigator.languages : [navigator.language]
  return resolveSupportedLanguage(languages)
}

export function getApiLanguage(language = resolveBrowserLanguage()) {
  return {
    ko: 'ko-KR',
    en: 'en-US',
    ja: 'ja-JP',
    zh: 'zh-CN',
  }[language]
}

export function getLocale(language = resolveBrowserLanguage()) {
  return {
    ko: 'ko-KR',
    en: 'en-US',
    ja: 'ja-JP',
    zh: 'zh-CN',
  }[language]
}
