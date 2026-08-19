import { useId, useRef, useState } from 'react'
import Button from '@/components/common/Button/Button'
import ModalShell from '@/components/common/ModalShell/ModalShell'
import { useI18n } from '@/i18n/I18nContext'
import { getUploadErrorMessage } from './uploadError'
import styles from './FileUploadModal.module.css'

interface FileUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onUpload?: (file: File) => void | Promise<void>
  onError?: (error: unknown) => void
}

const MAX_FILE_SIZE = 30 * 1024 * 1024
const ACCEPTED_EXTENSIONS = ['csv']

function FileUploadModal({ isOpen, onClose, onUpload, onError }: FileUploadModalProps) {
  const { t } = useI18n()
  const inputId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  const resetFile = () => {
    setSelectedFile(null)
    setErrorMessage('')
    setIsDragging(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleClose = () => {
    if (isUploading) return
    resetFile()
    onClose()
  }

  if (!isOpen) return null

  const validateFile = (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      setErrorMessage(t('expenseInput.uploadTypeError'))
      return false
    }
    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage(t('expenseInput.uploadSizeError'))
      return false
    }
    setErrorMessage('')
    setSelectedFile(file)
    return true
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setErrorMessage(t('expenseInput.uploadSelectError'))
      return
    }

    setIsUploading(true)
    try {
      await onUpload?.(selectedFile)
      resetFile()
    } catch (error) {
      const message = getUploadErrorMessage(error, t('expenseInput.uploadError'))
      setErrorMessage(message)
      onError?.(new Error(message))
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <ModalShell
      title={t('expenseInput.uploadModalTitle')}
      titleId="file-upload-title"
      closeLabel={t('expenseInput.uploadModalClose')}
      width="47.25rem"
      minHeight="39.75rem"
      bodyClassName={styles.modalBody}
      onClose={handleClose}
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
            <p>{t('expenseInput.uploadDrop')} <label htmlFor={inputId}>{t('expenseInput.uploadBrowse')}</label></p>
          )}
          <input ref={fileInputRef} id={inputId} type="file" accept=".csv,text/csv" onChange={(event) => { const file = event.target.files?.[0]; if (file) validateFile(file) }} />
        </div>

        <div className={styles.guide}>
          <span>{t('expenseInput.uploadFormat')}</span>
          <span>{t('expenseInput.uploadMaxSize')}</span>
        </div>
        {errorMessage && <p className={styles.error} role="alert">{errorMessage}</p>}

        <div className={styles.actions}>
          <Button onClick={handleUpload} isLoading={isUploading} disabled={!selectedFile || isUploading}>{t('common.upload')}</Button>
        </div>
    </ModalShell>
  )
}

export default FileUploadModal
