import { describe, expect, it } from 'vitest'

import { ApiError } from '@/api/client'
import { getUploadErrorMessage } from './uploadError'

describe('FileUploadModal error handling', () => {
  it('hides internal API error details from the upload UI', () => {
    expect(
      getUploadErrorMessage(new ApiError('SQL connection string', 500), '업로드에 실패했습니다.'),
    ).toBe('서버에서 요청을 처리하지 못했습니다.')
  })

  it('keeps a user-facing API validation message', () => {
    expect(
      getUploadErrorMessage(new ApiError('CSV 형식을 확인해 주세요.', 400), '업로드에 실패했습니다.'),
    ).toBe('CSV 형식을 확인해 주세요.')
  })

  it('uses the fallback for unexpected client errors', () => {
    expect(
      getUploadErrorMessage(new Error('internal parser details'), '업로드에 실패했습니다.'),
    ).toBe('업로드에 실패했습니다.')
  })
})
