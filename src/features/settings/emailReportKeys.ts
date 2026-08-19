export const emailReportKeys = {
  all: ['email-report'] as const,
  preview: () => ['email-report-preview'] as const,
  setting: () => [...emailReportKeys.all, 'setting'] as const,
}
