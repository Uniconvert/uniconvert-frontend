import { ApiError } from '@/api/client'
import { getApiErrorNotice } from '@/utils/apiError'

export function getUploadErrorMessage(error: unknown, fallback: string) {
  // API validation messages are already user-facing; all other errors use the
  // generic upload message so internal exception text cannot reach the UI.
  return error instanceof ApiError
    ? getApiErrorNotice(error, fallback).title
    : fallback
}
