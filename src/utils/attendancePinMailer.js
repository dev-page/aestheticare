const BACKEND_URL =
  (import.meta.env.VITE_OTP_BACKEND_URL || '').trim() ||
  (import.meta.env.VITE_OTP_API_BASE_URL || '').trim() ||
  'http://localhost:3001'

const EMAIL_SENDING_ENABLED = String(import.meta.env.VITE_ENABLE_ATTENDANCE_PIN_EMAIL || '')
  .trim()
  .toLowerCase() === 'true'
const fallbackUrls = ['http://localhost:3001']

const toCandidates = (baseUrl) => {
  const normalized = String(baseUrl || '').replace(/\/$/, '')
  const merged = [normalized, ...fallbackUrls].filter(Boolean)
  return [...new Set(merged)]
}

export const sendAttendancePinEmail = async ({ recipient, fullName, attendancePin }) => {
  const cleanRecipient = String(recipient || '').trim()
  const cleanName = String(fullName || '').trim()
  const cleanPin = String(attendancePin || '').trim()

  if (!cleanRecipient || !cleanPin) {
    return { success: false, error: 'recipient and attendancePin are required' }
  }
  if (!EMAIL_SENDING_ENABLED) {
    return {
      success: true,
      sent: false,
      skipped: true,
      error: '',
    }
  }

  let lastError = null
  for (const baseUrl of toCandidates(BACKEND_URL)) {
    try {
      const response = await fetch(`${baseUrl}/send-attendance-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: cleanRecipient,
          fullName: cleanName,
          attendancePin: cleanPin,
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || `HTTP ${response.status}`)
      }

      return { success: true, sent: true, skipped: false, error: '' }
    } catch (error) {
      lastError = error
    }
  }

  return {
    success: false,
    sent: false,
    skipped: false,
    error: lastError?.message || 'Unable to send attendance PIN email',
  }
}
