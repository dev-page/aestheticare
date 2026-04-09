export const resolveApiBaseUrl = (configuredUrl, { devFallbackUrl = '' } = {}) => {
  const explicit = String(configuredUrl || '').trim().replace(/\/+$/, '')
  if (explicit) {
    return explicit
  }

  if (import.meta.env.DEV && devFallbackUrl) {
    return String(devFallbackUrl).trim().replace(/\/+$/, '')
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return String(window.location.origin).trim().replace(/\/+$/, '')
  }

  return ''
}
