import potsMock from '@/mocks/pots.json'
import type { ApiResponse } from '@/types/api'
import type { CreatePotInput, Pot, PotsData } from '@/types/pot'
import { apiRequest } from './client'

export function getPots() {
  // TODO: Swagger 확정 후 실제 Pots 또는 서브 지갑 API 경로로 수정합니다.
  return apiRequest('/pots', potsMock as ApiResponse<PotsData>)
}

export function createPot(input: CreatePotInput) {
  const createdPot: Pot = {
    potId: `pot-${Date.now()}`,
    ...input,
  }

  // TODO: Swagger 확정 후 POST 요청·응답 필드를 실제 명세에 맞춥니다.
  return apiRequest('/pots', { success: true, data: createdPot }, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}
