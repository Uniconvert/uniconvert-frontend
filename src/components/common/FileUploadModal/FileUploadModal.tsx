import { useEffect, useId, useRef, useState } from 'react'
import Button from '@/components/common/Button/Button'
import styles from './FileUploadModal.module.css'

interface FileUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onUpload?: (file: File) => void
}

const MAX_FILE_SIZE = 30 * 1024 * 1024
const ACCEPTED_EXTENSIONS = ['pdf', 'csv']

function FileUploadModal({ isOpen, onClose, onUpload }: FileUploadModalProps) {
  const inputId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

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

  const handleUpload = () => {
    if (!selectedFile) {
      setErrorMessage('업로드할 파일을 선택해주세요.')
      return
    }
    onUpload?.(selectedFile)
  }

  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="file-upload-title">
        <header className={styles.header}>
          <h2 id="file-upload-title">업로드 파일</h2>
          <button className={styles.closeButton} type="button" onClick={onClose} aria-label="파일 업로드 닫기">×</button>
        </header>

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
          <Button onClick={handleUpload}>업로드</Button>
        </div>
      </section>
    </div>
  )
}

export default FileUploadModal
