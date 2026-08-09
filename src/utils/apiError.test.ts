import { describe, expect, it } from 'vitest'

import { ApiError } from '@/api/client'
import { getApiErrorNotice } from './apiError'

describe('getApiErrorNotice', () => {
  it('네트워크 오류에 공통 안내 문구를 제공한다', () => {
    expect(getApiErrorNotice(new ApiError('원본 메시지', 0, 'NETWORK_ERROR'))).toEqual({
      title: '서버에 연결할 수 없습니다.',
      description: '네트워크 상태를 확인한 뒤 다시 시도해 주세요.',
    })
  })

  it('서버 내부 오류의 기술 메시지를 사용자에게 노출하지 않는다', () => {
    expect(getApiErrorNotice(new ApiError('NullPointerException', 500))).toEqual({
      title: '서버에서 요청을 처리하지 못했습니다.',
      description: '잠시 후 다시 시도해 주세요.',
    })
  })

  it('검증 오류는 백엔드의 사용자용 메시지를 유지한다', () => {
    expect(getApiErrorNotice(new ApiError('닉네임은 20자 이하여야 합니다.', 400))).toEqual({
      title: '닉네임은 20자 이하여야 합니다.',
    })
  })

  it('알 수 없는 오류에는 화면별 기본 문구를 사용한다', () => {
    expect(getApiErrorNotice(null, '로그인에 실패했습니다.')).toEqual({
      title: '로그인에 실패했습니다.',
    })
  })
})
