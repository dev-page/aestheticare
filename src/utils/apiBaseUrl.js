export const resolveApiBaseUrl = (configuredUrl, { devFallbackUrl = '' } = {}) => {
  const explicit = String(configuredUrl || '').trim().replace(/\/+$/, '')
  if (explicit) {
    return explicit
  }

  const legacyApiUrl = String(import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '')
  if (legacyApiUrl) {
    return legacyApiUrl
  }

  if (import.meta.env.DEV && devFallbackUrl) {
    return String(devFallbackUrl).trim().replace(/\/+$/, '')
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return '/api'
  }

  return ''
}
