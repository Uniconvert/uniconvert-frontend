import { useId, useRef, useState } from 'react'
import Button from '@/components/common/Button/Button'
import ModalShell from '@/components/common/ModalShell/ModalShell'
import styles from './FileUploadModal.module.css'

interface FileUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onUpload?: (file: File) => void | Promise<void>
  onError?: () => void
}

const MAX_FILE_SIZE = 30 * 1024 * 1024
const ACCEPTED_EXTENSIONS = ['pdf', 'csv']

function FileUploadModal({ isOpen, onClose, onUpload, onError }: FileUploadModalProps) {
  const inputId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  if (!isOpen) return null

  const validateFile = (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      setErrorMessage('PDF 또는 CSV 파일만 업로드할 수 있습니다.')
      return false
    }
    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage('파일 크기는 최대 30MB까지 가능합니다.')
      return false
    }
    setErrorMessage('')
    setSelectedFile(file)
    return true
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setErrorMessage('업로드할 파일을 선택해주세요.')
      return
    }

    setIsUploading(true)
    try {
      await onUpload?.(selectedFile)
    } catch {
      setErrorMessage('파일을 가져오지 못했습니다. 다시 시도해주세요.')
      onError?.()
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <ModalShell
      title="업로드 파일"
      titleId="file-upload-title"
      closeLabel="파일 업로드 닫기"
      width="47.25rem"
      minHeight="39.75rem"
      bodyClassName={styles.modalBody}
      onClose={onClose}
    >
      <div
          className={`${styles.dropZone} ${isDragging ? styles.dragging : ''}`}
          onDragEnter={(event) => { event.preventDefault(); setIsDragging(true) }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => { if (event.currentTarget === event.target) setIsDragging(false) }}
          onDrop={(event) => {
            event.preventDefault()
            setIsDragging(false)
            const file = event.dataTransfer.files[0]
            if (file) validateFile(file)
          }}
        >
          <img src="/assets/icons/files/image-file.png" alt="" aria-hidden="true" />
          {selectedFile ? (
            <p className={styles.fileName}>{selectedFile.name}</p>
          ) : (
            <p>여기에 파일을 드래그하거나 <label htmlFor={inputId}>클릭하여 업로드</label></p>
          )}
          <input ref={fileInputRef} id={inputId} type="file" accept=".pdf,.csv" onChange={(event) => { const file = event.target.files?.[0]; if (file) validateFile(file) }} />
        </div>

        <div className={styles.guide}>
          <span>PDF/CSV 파일만 지원됩니다.</span>
          <span>최대 파일용량: 30MB</span>
        </div>
        {errorMessage && <p className={styles.error} role="alert">{errorMessage}</p>}

        <div className={styles.actions}>
          <Button variant="outline" onClick={onClose}>취소</Button>
          <Button onClick={handleUpload} isLoading={isUploading} disabled={isUploading}>업로드</Button>
        </div>
    </ModalShell>
  )
}

export default FileUploadModal
