export const DEFAULT_TIME_ZONE = 'Asia/Seoul'

/**
 * 브라우저의 IANA 시간대를 반환합니다.
 * 감지할 수 없는 환경에서는 프로젝트 기본 시간대를 사용합니다.
 */
export function getBrowserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIME_ZONE
  } catch {
    return DEFAULT_TIME_ZONE
  }
}
