import { useState } from 'react'
import FileUploadModal from '@/components/common/FileUploadModal/FileUploadModal'
import Button from '@/components/common/Button/Button'
import styles from './OcrUploadPage.module.css'

function OcrUploadPage() {
  const [isModalOpen, setIsModalOpen] = useState(true)
  const [statusMessage, setStatusMessage] = useState('')

  return (
    <section className={styles.page} aria-labelledby="ocr-title">
      <div className={styles.previewCard}>
        <span>OCR</span>
        <h1 id="ocr-title">파일로 지출 내역 등록</h1>
        <p>PDF 또는 CSV 파일을 업로드해 지출 데이터를 불러올 수 있습니다.</p>
        <Button onClick={() => setIsModalOpen(true)}>파일 업로드</Button>
        {statusMessage && <p className={styles.status} role="status">{statusMessage}</p>}
      </div>

      <FileUploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUpload={(file) => {
          // TODO: Swagger 확정 후 파일 업로드 API 요청으로 교체합니다.
          setStatusMessage(`${file.name} 파일을 선택했습니다.`)
          setIsModalOpen(false)
        }}
      />
    </section>
  )
}

export default OcrUploadPage
