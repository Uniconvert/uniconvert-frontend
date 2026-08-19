export const exchangeRateKeys = {
  current: (from: string, to: string) => ['exchange-rate', from.toUpperCase(), to.toUpperCase()] as const,
}
