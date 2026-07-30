export const CURRENCY_CODES = ['USD', 'EUR', 'JPY', 'CNY', 'KRW'] as const

export type CurrencyCode = (typeof CURRENCY_CODES)[number]
