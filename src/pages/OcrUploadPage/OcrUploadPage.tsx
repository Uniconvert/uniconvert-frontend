import { useState } from 'react'
import { importExpenses } from '@/api/expenses'
import FileUploadModal from '@/components/common/FileUploadModal/FileUploadModal'
import Button from '@/components/common/Button/Button'
import Toast from '@/components/common/Toast/Toast'
import { useToastQueue } from '@/components/common/Toast/useToastQueue'
import { getApiErrorNotice } from '@/utils/apiError'
import styles from './OcrUploadPage.module.css'

function OcrUploadPage() {
  const [isModalOpen, setIsModalOpen] = useState(true)
  const [statusMessage, setStatusMessage] = useState('')
  const { toast, showToast, closeToast } = useToastQueue()

  return (
    <section className={styles.page} aria-labelledby="ocr-title">
      {toast && <Toast key={toast.id} {...toast} onClose={closeToast} />}
      <div className={styles.previewCard}>
        <span>CSV</span>
        <h1 id="ocr-title">CSV로 지출 내역 등록</h1>
        <p>Wise 또는 Monzo CSV 파일을 업로드해 지출 데이터를 불러올 수 있습니다.</p>
        <Button onClick={() => setIsModalOpen(true)}>파일 업로드</Button>
        {statusMessage && <p className={styles.status} role="status">{statusMessage}</p>}
      </div>

      <FileUploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onError={(error) => showToast({
          variant: 'error',
          ...getApiErrorNotice(error, '지출 내역을 가져오지 못했습니다.'),
        })}
        onUpload={async (file) => {
          const result = await importExpenses(file)
          setStatusMessage(
            `${file.name}: 저장 ${result.savedCount ?? 0}건 · 제외 ${result.excludedCount ?? 0}건 · 오류 ${result.errorCount ?? 0}건`,
          )
          setIsModalOpen(false)
          showToast({
            variant: 'success',
            title: `${result.savedCount ?? 0}건의 지출을 가져왔어요`,
            description: `제외 ${result.excludedCount ?? 0}건 · 오류 ${result.errorCount ?? 0}건`,
          })
        }}
      />
    </section>
  )
}

export default OcrUploadPage
