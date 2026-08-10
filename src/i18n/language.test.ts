import { describe, expect, it } from 'vitest'
import { getApiLanguage, resolveSupportedLanguage } from './language'

describe('browser language resolution', () => {
  it.each([
    [['ko-KR'], 'ko', 'ko-KR'],
    [['ja-JP'], 'ja', 'ja-JP'],
    [['zh-TW'], 'zh', 'zh-CN'],
    [['fr-FR', 'en-US'], 'en', 'en-US'],
  ] as const)('%j resolves to %s', (languages, expectedLanguage, expectedHeader) => {
    const language = resolveSupportedLanguage(languages)

    expect(language).toBe(expectedLanguage)
    expect(getApiLanguage(language)).toBe(expectedHeader)
  })
})
