import { useState } from 'react'
import { importExpenses } from '@/api/expenses'
import FileUploadModal from '@/components/common/FileUploadModal/FileUploadModal'
import Button from '@/components/common/Button/Button'
import Toast from '@/components/common/Toast/Toast'
import { useToastQueue } from '@/components/common/Toast/useToastQueue'
import { getApiErrorNotice } from '@/utils/apiError'
import { useI18n } from '@/i18n/I18nContext'
import styles from './OcrUploadPage.module.css'

function OcrUploadPage() {
  const { t } = useI18n()
  const [isModalOpen, setIsModalOpen] = useState(true)
  const [statusMessage, setStatusMessage] = useState('')
  const { toast, showToast, closeToast } = useToastQueue()

  return (
    <section className={styles.page} aria-labelledby="ocr-title">
      {toast && <Toast key={toast.id} {...toast} onClose={closeToast} />}
      <div className={styles.previewCard}>
        <span>CSV</span>
        <h1 id="ocr-title">{t('expenseInput.csvTitle')}</h1>
        <p>{t('expenseInput.csvDescription')}</p>
        <Button onClick={() => setIsModalOpen(true)}>{t('expenseInput.uploadButton')}</Button>
        {statusMessage && <p className={styles.status} role="status">{statusMessage}</p>}
      </div>

      <FileUploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onError={(error) => showToast({
          variant: 'error',
          ...getApiErrorNotice(error, t('expenseInput.importError')),
        })}
        onUpload={async (file) => {
          const result = await importExpenses(file)
          setStatusMessage(
            t('expenseInput.importStatus', {
              saved: result.savedCount ?? 0,
              excluded: result.excludedCount ?? 0,
              errors: result.errorCount ?? 0,
            }),
          )
          setIsModalOpen(false)
          showToast({
            variant: 'success',
            title: t('expenseInput.importSuccess', { saved: result.savedCount ?? 0 }),
            description: t('expenseInput.importSummary', {
              excluded: result.excludedCount ?? 0,
              errors: result.errorCount ?? 0,
            }),
          })
        }}
      />
    </section>
  )
}

export default OcrUploadPage
