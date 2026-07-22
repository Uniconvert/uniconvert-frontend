export interface ApiResponse<T> {
  success: boolean
  code: string
  message: string
  data: T
}

/** Mock JSON은 아직 확정 전인 code/message를 생략해도 사용할 수 있습니다. */
export type MockApiResponse<T> = Pick<ApiResponse<T>, 'data'> &
  Partial<Omit<ApiResponse<T>, 'data'>>
