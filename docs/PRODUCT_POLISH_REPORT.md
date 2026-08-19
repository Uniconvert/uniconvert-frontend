# Product Polish Report

## Email Scope

이메일 리포트는 사용자가 Report 또는 Settings의 “이메일로 리포트 보내기” 버튼을 직접 클릭했을 때만 Google Apps Script Web App으로 발송합니다. 자동·예약 발송은 구현하지 않습니다.

## Manual Send Flow

```text
버튼 클릭
  → executeManualEmailReport()
  → reportImageCapture (버튼 제외 PNG)
  → sendReportEmail()
  → Google Apps Script Web App
```

전송 payload에는 로그인 사용자의 이메일, 현재 리포트 기간, 캡처된 PNG만 포함합니다.

## Google Apps Script Adapter

`src/features/report/emailReportSender.ts`가 `VITE_REPORT_MAIL_SCRIPT_URL`로 JSON payload를 POST합니다. HTTP 성공뿐 아니라 응답의 `success: true`를 확인하며, provider 원문 오류는 사용자에게 노출하지 않습니다.

## Image Capture

- Report는 모달 외곽 shell 전체를 캡처합니다.
- Settings는 리포트 미리보기 패널을 캡처합니다.
- 전송 버튼에는 `data-report-capture-ignore="true"`를 지정해 PNG에서 제외합니다.
- 캡처 fallback 배경은 흰색이며 캡처 중 CSS animation/transition을 중지합니다.

## Environment

```env
VITE_REPORT_MAIL_SCRIPT_URL=https://script.google.com/macros/s/your-deployment-id/exec
```

## Verification

- Apps Script 요청 전송 테스트
- `success: true` 응답 검증
- PNG 캡처 및 버튼 제외 테스트
- 중복 전송 방지와 오류 정규화 테스트
