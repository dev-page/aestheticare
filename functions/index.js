const functions = require('firebase-functions')
const admin = require('firebase-admin')
const express = require('express')
const cors = require('cors')
const sgMail = require('@sendgrid/mail')
const { google } = require('googleapis')
require('dotenv').config()

admin.initializeApp()

const app = express()
app.use(express.json({ limit: '1mb' }))

const DAY_MS = 24 * 60 * 60 * 1000
const GRACE_DAYS = 7
const isDevelopment =
  process.env.FUNCTIONS_EMULATOR === 'true' ||
  String(process.env.NODE_ENV || 'development').toLowerCase() !== 'production'

const frontendBaseUrl = String(
  process.env.FRONTEND_BASE_URL || functions.config?.()?.frontend?.base_url || 'https://aestheticare.io'
).trim().replace(/\/+$/, '')
const sendGridApiKey = String(
  process.env.SENDGRID_API_KEY || functions.config?.()?.sendgrid?.key || ''
).trim()
const senderEmail = String(
  process.env.SENDGRID_SENDER || functions.config?.()?.sendgrid?.sender || ''
).trim()
const paymongoSecretKey = String(
  process.env.PAYMONGO_SECRET_KEY || functions.config?.()?.paymongo?.secret_key || ''
).trim()
const googleOauthClientId = String(
  process.env.GOOGLE_OAUTH_CLIENT_ID || functions.config?.()?.google?.oauth_client_id || ''
).trim()
const googleOauthClientSecret = String(
  process.env.GOOGLE_OAUTH_CLIENT_SECRET || functions.config?.()?.google?.oauth_client_secret || ''
).trim()
const googleOauthRefreshToken = String(
  process.env.GOOGLE_OAUTH_REFRESH_TOKEN || functions.config?.()?.google?.oauth_refresh_token || ''
).trim()
const googleCalendarId = String(
  process.env.GOOGLE_CALENDAR_ID || functions.config?.()?.google?.calendar_id || 'primary'
).trim() || 'primary'
const googleMeetDefaultTimezone = String(
  process.env.GOOGLE_MEET_DEFAULT_TIMEZONE || 'Asia/Manila'
).trim() || 'Asia/Manila'

if (sendGridApiKey) {
  sgMail.setApiKey(sendGridApiKey)
}

const allowedOrigins = new Set(
  [
    frontendBaseUrl,
    'http://localhost:5173',
    'http://localhost:4173',
    'http://localhost:3000',
    'http://localhost:3001',
    'https://aestheticare.io',
    'https://www.aestheticare.io',
    'https://aestheticare--aesthetic-db.asia-southeast1.hosted.app',
  ]
    .flatMap((value) => String(value || '').split(','))
    .map((value) => String(value || '').trim().replace(/\/+$/, ''))
    .filter(Boolean)
)

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true)
      const normalizedOrigin = String(origin || '').trim().replace(/\/+$/, '')
      if (allowedOrigins.has(normalizedOrigin)) return callback(null, true)
      return callback(new Error(`Not allowed by CORS: ${normalizedOrigin}`))
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
)
app.options('*', cors())

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const loginUrl = `${frontendBaseUrl}/login`

const sendMail = async (message) => {
  const [response] = await sgMail.send(message)
  return {
    statusCode: response?.statusCode || null,
    messageId: response?.headers?.['x-message-id'] || response?.headers?.['X-Message-Id'] || null,
  }
}

const buildOtpMessage = (recipient, otp) => ({
  to: recipient,
  from: senderEmail,
  subject: 'Your OTP Code',
  text: `Your one-time password is: ${otp}`,
  html: `<strong>Your OTP code is: ${escapeHtml(otp)}</strong>`,
})

const buildWelcomeMessage = ({ recipient, fullName, accountType = 'customer', defaultPassword = '' }) => {
  const safeName = String(fullName || 'there').trim() || 'there'
  const safeRecipient = String(recipient || '').trim().toLowerCase()
  const displayName = escapeHtml(safeName)
  const recipientLabel = escapeHtml(safeRecipient)
  const loginLink = escapeHtml(loginUrl)
  const passwordLine = String(defaultPassword || '').trim()
  const passwordHtml = passwordLine ? `<p><strong>Temporary password:</strong> ${escapeHtml(passwordLine)}</p>` : ''

  if (String(accountType || '').trim().toLowerCase() === 'staff') {
    return {
      to: safeRecipient,
      from: senderEmail,
      subject: 'Your AesthetiCare Staff Account Is Ready',
      text:
        `Hi ${safeName},\n\n` +
        `Your staff account has been created.\n` +
        `Email: ${safeRecipient}\n` +
        `Temporary password: ${passwordLine}\n\n` +
        `Login page: ${loginUrl}\n`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.7;color:#2a1408;background:#fffaf3;padding:28px;border:1px solid #e6c79b;border-radius:20px;max-width:640px;margin:0 auto;">
          <h1 style="margin:0 0 14px;font-size:26px;color:#5d3412;">Your staff account is ready, ${displayName}.</h1>
          <p style="margin:0 0 12px;">You can now sign in to the platform and begin using your role-based workspace.</p>
          <p style="margin:0 0 12px;"><strong>Email:</strong> ${recipientLabel}</p>
          ${passwordHtml}
          <p style="margin:0 0 18px;"><a href="${loginLink}" style="display:inline-block;background:#bb7a18;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:700;">Go to AesthetiCare Login</a></p>
        </div>
      `,
    }
  }

  return {
    to: safeRecipient,
    from: senderEmail,
    subject: 'Welcome to AesthetiCare',
    text:
      `Hi ${safeName},\n\n` +
      `Welcome to AesthetiCare.\n` +
      `Email: ${safeRecipient}\n` +
      `Login page: ${loginUrl}\n`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.7;color:#2a1408;background:#fffaf3;padding:28px;border:1px solid #e6c79b;border-radius:20px;max-width:640px;margin:0 auto;">
        <h1 style="margin:0 0 14px;font-size:26px;color:#5d3412;">Welcome aboard, ${displayName}.</h1>
        <p style="margin:0 0 12px;">Your account is ready, and your care journey can begin.</p>
        <p style="margin:0 0 12px;"><strong>Email:</strong> ${recipientLabel}</p>
        <p style="margin:0 0 22px;"><a href="${loginLink}" style="display:inline-block;background:#bb7a18;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:700;">Go to AesthetiCare Login</a></p>
      </div>
    `,
  }
}

const buildAttendancePinMessage = ({ recipient, attendancePin, fullName }) => {
  const safeName = String(fullName || 'Staff').trim() || 'Staff'
  const safePin = String(attendancePin || '').trim()
  return {
    to: recipient,
    from: senderEmail,
    subject: 'Your Attendance PIN (Do Not Share)',
    text: `Hi ${safeName},\n\nYour attendance PIN is: ${safePin}\n\nDo not share this PIN with anyone.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#2a1408;">
        <p>Hi ${escapeHtml(safeName)},</p>
        <p>Your attendance PIN is:</p>
        <p style="font-size:22px;font-weight:700;letter-spacing:2px;">${escapeHtml(safePin)}</p>
        <p><strong>Do not share this PIN with anyone.</strong></p>
      </div>
    `,
  }
}

const isGoogleMeetConfigured = () =>
  Boolean(googleOauthClientId && googleOauthClientSecret && googleOauthRefreshToken)

const getGoogleCalendarClient = () => {
  const oauth2Client = new google.auth.OAuth2(googleOauthClientId, googleOauthClientSecret)
  oauth2Client.setCredentials({ refresh_token: googleOauthRefreshToken })
  return google.calendar({ version: 'v3', auth: oauth2Client })
}

const deleteGoogleCalendarEvent = async (eventId) => {
  const cleanEventId = String(eventId || '').trim()
  if (!cleanEventId) return { deleted: false, skipped: true }
  const calendar = getGoogleCalendarClient()
  await calendar.events.delete({
    calendarId: googleCalendarId,
    eventId: cleanEventId,
    sendUpdates: 'none',
  })
  return { deleted: true, eventId: cleanEventId }
}

const requireAuth = async (req, res, next) => {
  const authHeader = String(req.headers?.authorization || '').trim()
  const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i)
  if (!tokenMatch) {
    return res.status(401).json({ success: false, error: 'Missing authorization token' })
  }
  try {
    req.user = await admin.auth().verifyIdToken(tokenMatch[1])
    return next()
  } catch (_error) {
    return res.status(401).json({ success: false, error: 'Invalid authorization token' })
  }
}

const loadUserContext = async (uid) => {
  const firestore = admin.firestore()
  const userSnap = await firestore.collection('users').doc(uid).get()
  const userData = userSnap.exists ? userSnap.data() || {} : {}
  const roleRaw = String(userData.role || userData.userType || '').trim().toLowerCase()
  const compact = roleRaw.replace(/[\s_-]+/g, '')
  const hasFullAccess = compact === 'clinicadmin' || compact === 'clinicadministrator' || compact === 'superadmin'
  let permissions = []
  const roleKey = compact === 'clinicadmin' || compact === 'clinicadministrator'
    ? 'Owner'
    : compact === 'superadmin' || compact === 'systemadmin' || compact === 'sysadmin'
      ? 'Superadmin'
      : roleRaw.charAt(0).toUpperCase() + roleRaw.slice(1)

  if (roleKey) {
    const roleSnap = await firestore.collection('rolePermissions').doc(roleKey).get()
    const roleData = roleSnap.exists ? roleSnap.data() || {} : {}
    permissions = Array.isArray(roleData.permissions) ? roleData.permissions : []
  }

  const userPermissions = Array.isArray(userData.permissions) ? userData.permissions : []
  return {
    uid,
    hasFullAccess,
    permissions: new Set([...permissions, ...userPermissions]),
  }
}

const requirePermission = (permission) => async (req, res, next) => {
  const uid = req.user?.uid
  if (!uid) {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }
  try {
    if (!req.userContext || req.userContext.uid !== uid) {
      req.userContext = await loadUserContext(uid)
      req.userContext.uid = uid
    }
    if (req.userContext.hasFullAccess || req.userContext.permissions.has(permission)) {
      return next()
    }
    return res.status(403).json({ success: false, error: 'Forbidden' })
  } catch (_error) {
    return res.status(500).json({ success: false, error: 'Failed to verify permission' })
  }
}

const requireRole = (roles = []) => async (req, res, next) => {
  const uid = req.user?.uid
  if (!uid) {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }
  try {
    const snap = await admin.firestore().collection('users').doc(uid).get()
    const data = snap.exists ? snap.data() || {} : {}
    const role = String(data.role || data.userType || '').trim().toLowerCase()
    const allowed = roles.map((entry) => String(entry || '').trim().toLowerCase())
    if (!allowed.includes(role)) {
      return res.status(403).json({ success: false, error: 'Forbidden' })
    }
    return next()
  } catch (_error) {
    return res.status(500).json({ success: false, error: 'Failed to verify role' })
  }
}

const optionalAuth = async (req, _res, next) => {
  const authHeader = String(req.headers?.authorization || '').trim()
  const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i)
  if (!tokenMatch) {
    return next()
  }
  try {
    req.user = await admin.auth().verifyIdToken(tokenMatch[1])
  } catch (_error) {
    // Ignore auth failures for optional routes.
  }
  return next()
}

const assertPayMongoConfigured = (res) => {
  if (!paymongoSecretKey) {
    res.status(503).json({
      success: false,
      error: 'PAYMONGO_SECRET_KEY is not configured',
    })
    return false
  }
  return true
}

const buildPayMongoHeaders = () => ({
  Authorization: `Basic ${Buffer.from(`${paymongoSecretKey}:`).toString('base64')}`,
  'Content-Type': 'application/json',
})

const sendSendGridMessage = async (message) => {
  if (!sendGridApiKey || !senderEmail) {
    if (isDevelopment) {
      return { ok: true, devMode: true }
    }
    throw new Error('SENDGRID_API_KEY or SENDGRID_SENDER is missing')
  }
  const [response] = await sgMail.send(message)
  return {
    ok: true,
    statusCode: response?.statusCode || null,
    messageId: response?.headers?.['x-message-id'] || response?.headers?.['X-Message-Id'] || null,
  }
}

const buildPaymentReceiptMessage = ({ recipient, payerName, planName, amount, currency, referenceNumber, paymentMethod }) => {
  const safeName = String(payerName || 'Customer').trim() || 'Customer'
  const safePlan = String(planName || 'Subscription').trim() || 'Subscription'
  const safeCurrency = String(currency || 'PHP').trim() || 'PHP'
  const safeAmount = Number(amount || 0)
  const safeReference = String(referenceNumber || '').trim()
  const safeMethod = String(paymentMethod || '').trim()
  const formatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: safeCurrency })
  const amountLabel = formatter.format(safeAmount)
  return {
    to: recipient,
    from: senderEmail,
    subject: 'Your payment was successful',
    text:
      `Hi ${safeName},\n\n` +
      `Your payment was successful.\n` +
      `Plan: ${safePlan}\n` +
      `Amount: ${amountLabel}\n` +
      `Reference: ${safeReference}\n` +
      `Method: ${safeMethod}\n`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.7;color:#2a1408;background:#fffaf3;padding:28px;border:1px solid #e6c79b;border-radius:20px;max-width:640px;margin:0 auto;">
        <h1 style="margin:0 0 14px;font-size:26px;color:#5d3412;">Payment received</h1>
        <p style="margin:0 0 12px;">Hi ${escapeHtml(safeName)}, your payment was successful.</p>
        <p style="margin:0 0 8px;"><strong>Plan:</strong> ${escapeHtml(safePlan)}</p>
        <p style="margin:0 0 8px;"><strong>Amount:</strong> ${escapeHtml(amountLabel)}</p>
        <p style="margin:0 0 8px;"><strong>Reference:</strong> ${escapeHtml(safeReference)}</p>
        <p style="margin:0 0 8px;"><strong>Method:</strong> ${escapeHtml(safeMethod)}</p>
      </div>
    `,
  }
}

const buildClinicRejectionEmailMessage = ({ recipient, fullName, clinicName, rejectionReason }) => ({
  to: recipient,
  from: senderEmail,
  subject: 'Your clinic registration was rejected',
  text:
    `Hi ${String(fullName || 'there').trim() || 'there'},\n\n` +
    `Your clinic registration for ${String(clinicName || 'your clinic').trim() || 'your clinic'} was rejected.\n` +
    `Reason: ${String(rejectionReason || '').trim() || 'No reason provided'}\n`,
  html: `
    <div style="font-family:Arial,sans-serif;line-height:1.7;color:#2a1408;background:#fffaf3;padding:28px;border:1px solid #e6c79b;border-radius:20px;max-width:640px;margin:0 auto;">
      <h1 style="margin:0 0 14px;font-size:26px;color:#5d3412;">Registration rejected</h1>
      <p style="margin:0 0 12px;">Hi ${escapeHtml(String(fullName || 'there').trim() || 'there')}, your clinic registration for ${escapeHtml(String(clinicName || 'your clinic').trim() || 'your clinic')} was rejected.</p>
      <p style="margin:0 0 8px;"><strong>Reason:</strong> ${escapeHtml(String(rejectionReason || '').trim() || 'No reason provided')}</p>
    </div>
  `,
})

const BOOKING_RESERVATIONS_COLLECTION = 'bookingReservations'
const BOOKING_LOCKS_COLLECTION = 'bookingLocks'
const BOOKING_RESERVATION_TTL_MINUTES = Math.max(5, Number(process.env.BOOKING_RESERVATION_TTL_MINUTES || 15))
const BOOKING_BLOCKING_STATUSES = new Set(['scheduled', 'pending', 'confirmed', 'paid', 'in progress', 'ongoing'])

const normalizeBookingStatus = (value) => String(value || '').trim().toLowerCase()

const parseClockToMinutes = (value) => {
  const text = String(value || '').trim()
  if (!text) return null
  const match = text.match(/^(\d{1,2}):(\d{2})(?:\s*([ap]m))?$/i)
  if (!match) return null
  let hours = Number(match[1])
  const minutes = Number(match[2])
  const period = String(match[3] || '').toLowerCase()
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || minutes < 0 || minutes > 59) return null
  if (period === 'pm' && hours < 12) hours += 12
  if (period === 'am' && hours === 12) hours = 0
  if (!period && hours >= 24) return null
  return hours * 60 + minutes
}

const rangesOverlap = (leftStart, leftEnd, rightStart, rightEnd) =>
  leftStart < rightEnd && leftEnd > rightStart

const getBookingRange = (payload) => {
  const start = parseClockToMinutes(payload?.time)
  if (start === null) return null
  const endFromPayload = parseClockToMinutes(payload?.endTime)
  const durationMinutes = Math.max(
    15,
    Number(
      payload?.totalServiceDurationMinutes ||
      payload?.consultationForServiceDurationMinutes ||
      payload?.durationMinutes ||
      payload?.bookingDurationMinutes ||
      60
    )
  )
  const end = endFromPayload !== null && endFromPayload > start ? endFromPayload : start + durationMinutes
  return { start, end: end <= start ? start + durationMinutes : end }
}

const safeTimestamp = (value) => {
  if (!value) return null
  if (typeof value?.toMillis === 'function') return value
  if (typeof value?.toDate === 'function') return admin.firestore.Timestamp.fromDate(value.toDate())
  if (value instanceof Date) return admin.firestore.Timestamp.fromDate(value)
  if (typeof value === 'number') return admin.firestore.Timestamp.fromMillis(value)
  if (typeof value === 'string') {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) {
      return admin.firestore.Timestamp.fromDate(parsed)
    }
  }
  return null
}

const buildBookingAppointmentPayload = ({ reservation, paymongo, paymentMethodType, paymentMethod }) => {
  const flowType = String(reservation.flowType || 'booking').trim().toLowerCase()
  const selectedServices = Array.isArray(reservation.selectedServices) ? reservation.selectedServices : []
  const serviceNames = selectedServices.map((service) => String(service?.title || service?.name || '').trim()).filter(Boolean)
  const serviceIds = Array.isArray(reservation.selectedServiceIds) ? reservation.selectedServiceIds.filter(Boolean) : []
  const serviceDurations = Array.isArray(reservation.serviceDurations)
    ? reservation.serviceDurations.map((value) => Number(value || 0)).filter((value) => value > 0)
    : []
  const totalServiceDurationMinutes = Number(
    reservation.totalServiceDurationMinutes ||
    serviceDurations.reduce((sum, value) => sum + value, 0) ||
    0
  )
  const totalAmount = Number(reservation.amount || reservation.consultationFee || 0)
  const commissionAmount = Number(reservation.commissionAmount || 0)
  const netAmount = Number(reservation.netAmount || 0)
  const basePayload = {
    customerId: reservation.customerId || '',
    customerName: reservation.customerName || reservation.customerEmail || 'Customer',
    clientName: reservation.customerName || reservation.customerEmail || 'Customer',
    practitionerId: reservation.practitionerId || '',
    assignedPractitionerId: reservation.practitionerId || '',
    practitionerName: reservation.practitionerName || '',
    assignedPractitionerName: reservation.practitionerName || '',
    service: serviceNames.join(', '),
    services: serviceNames,
    serviceIds,
    serviceDetails: selectedServices,
    serviceDurations,
    totalServiceDurationMinutes,
    date: reservation.date || '',
    time: reservation.time || '',
    endTime: reservation.endTime || '',
    notes: reservation.notes || '',
    status: 'Scheduled',
    paymentStatus: 'Paid',
    paymentMethod: paymentMethod || paymentMethodType || reservation.paymentMethod || 'GCash',
    paymentCoverage: 'full',
    amount: totalAmount,
    amountPaid: totalAmount,
    totalAmount,
    commissionPercent: Number(reservation.commissionPercent || 10),
    commissionAmount,
    merchantNetAmount: netAmount,
    requiresConsultationFirst: Boolean(reservation.requiresConsultationFirst),
    followUpAllowed: Boolean(reservation.followUpAllowed),
    followUpWindowDays: reservation.followUpWindowDays != null ? Number(reservation.followUpWindowDays) : null,
    branchId: reservation.branchId || '',
    centerId: reservation.centerId || reservation.branchId || '',
    paymongoCheckoutSessionId: reservation.checkoutSessionId || null,
    paymongoStatus: paymongo?.status || null,
    paymongoPaidAt: paymongo?.paid_at || null,
    paymongoPaymentId: paymongo?.paymentId || null,
    paymongoPaymentMethodType: paymentMethodType || null,
    referenceNumber: reservation.referenceNumber || '',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    reservationId: reservation.id,
  }

  return flowType === 'consultation'
    ? {
        ...basePayload,
        type: 'Consultation',
        service: 'Online Consultation',
        services: ['Online Consultation'],
        consultationMode: 'online',
        consultationFee: totalAmount,
        consultationForServices: serviceNames,
        consultationForServiceIds: serviceIds,
        consultationForServiceDetails: selectedServices,
        consultationForServiceDurationMinutes: totalServiceDurationMinutes,
        followUpAllowed: false,
        followUpWindowDays: null,
      }
    : basePayload
}

app.get('/', (_req, res) => {
  res.json({
    ok: true,
    service: 'aestheticare-functions',
    health: '/health',
  })
})

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'aestheticare-functions',
    sendgridConfigured: Boolean(sendGridApiKey && senderEmail),
    googleMeetConfigured: isGoogleMeetConfigured(),
    firebaseAdminConfigured: true,
  })
})

app.post('/send-otp', async (req, res) => {
  try {
    const { recipient, otp } = req.body ?? {}
    const normalizedRecipient = String(recipient || '').trim()
    const normalizedOtp = String(otp || '').trim()

    if (!normalizedRecipient || !normalizedOtp) {
      return res.status(400).json({ success: false, error: 'recipient and otp are required' })
    }

    if (!sendGridApiKey || !senderEmail) {
      if (isDevelopment) return res.json({ success: true, devMode: true })
      return res.status(500).json({ success: false, error: 'SENDGRID_API_KEY or SENDGRID_SENDER is missing' })
    }

    await sendMail(buildOtpMessage(normalizedRecipient, normalizedOtp))
    return res.json({ success: true })
  } catch (error) {
    return res.status(500).json({ success: false, error: error?.message || 'Unexpected OTP route error' })
  }
})

app.post('/auth/check-user', async (req, res) => {
  const normalizedEmail = String(req.body?.email || '').trim().toLowerCase()
  if (!normalizedEmail) {
    return res.status(400).json({ success: false, error: 'email is required' })
  }
  try {
    const userRecord = await admin.auth().getUserByEmail(normalizedEmail)
    return res.json({ success: true, exists: true, uid: userRecord.uid })
  } catch (error) {
    if (error?.code === 'auth/user-not-found') {
      return res.json({ success: true, exists: false })
    }
    return res.status(400).json({ success: false, error: error?.message || 'Failed to check user.' })
  }
})

app.post('/auth/reset-password', async (req, res) => {
  const normalizedEmail = String(req.body?.email || '').trim().toLowerCase()
  const passwordValue = String(req.body?.newPassword || '')
  if (!normalizedEmail || !passwordValue) {
    return res.status(400).json({ success: false, error: 'email and newPassword are required' })
  }
  if (passwordValue.length < 8) {
    return res.status(400).json({ success: false, error: 'Password must be at least 8 characters.' })
  }
  try {
    const userRecord = await admin.auth().getUserByEmail(normalizedEmail)
    await admin.auth().updateUser(userRecord.uid, { password: passwordValue })
    return res.json({ success: true })
  } catch (error) {
    const code = error?.code || ''
    const message = code === 'auth/user-not-found' ? 'No account found with this email.' : error?.message || 'Failed to reset password.'
    return res.status(400).json({ success: false, error: message, code })
  }
})

app.post('/send-staff-welcome', requireAuth, requirePermission('staff:create'), async (req, res) => {
  const normalizedRecipient = String(req.body?.recipient || '').trim().toLowerCase()
  const defaultPassword = String(req.body?.defaultPassword || '').trim()
  if (!normalizedRecipient || !defaultPassword) {
    return res.status(400).json({ success: false, error: 'recipient and defaultPassword are required' })
  }
  if (!sendGridApiKey || !senderEmail) {
    return res.status(500).json({ success: false, error: 'SENDGRID_API_KEY or SENDGRID_SENDER is missing' })
  }
  try {
    const delivery = await sendMail(
      buildWelcomeMessage({
        recipient: normalizedRecipient,
        fullName: req.body?.fullName,
        accountType: 'staff',
        defaultPassword,
      })
    )
    return res.json({ success: true, statusCode: delivery.statusCode || null, messageId: delivery.messageId || null })
  } catch (error) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to send welcome email' })
  }
})

app.post('/send-attendance-pin', requireAuth, requirePermission('staff:create'), async (req, res) => {
  const recipient = String(req.body?.recipient || '').trim()
  const attendancePin = String(req.body?.attendancePin || '').trim()
  if (!recipient || !attendancePin) {
    return res.status(400).json({ success: false, error: 'recipient and attendancePin are required' })
  }
  if (!sendGridApiKey || !senderEmail) {
    return res.status(500).json({ success: false, error: 'SENDGRID_API_KEY or SENDGRID_SENDER is missing' })
  }
  try {
    const delivery = await sendMail(
      buildAttendancePinMessage({
        recipient,
        attendancePin,
        fullName: req.body?.fullName,
      })
    )
    return res.json({ success: true, messageId: delivery.messageId || null })
  } catch (error) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to send attendance PIN' })
  }
})

app.post('/google-meet/create-consultation-link', requireAuth, requirePermission('consultations:create'), async (req, res) => {
  if (!isGoogleMeetConfigured()) {
    return res.status(503).json({
      success: false,
      error:
        'Google Meet integration is not configured. Set GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, and GOOGLE_OAUTH_REFRESH_TOKEN.',
    })
  }

  const {
    summary,
    description,
    startDateTime,
    endDateTime,
    timezone,
    attendeeEmails,
    requestId,
    replaceEventId,
  } = req.body ?? {}

  const cleanSummary = String(summary || '').trim()
  const cleanDescription = String(description || '').trim()
  const cleanStart = String(startDateTime || '').trim()
  const cleanEnd = String(endDateTime || '').trim()
  const cleanTimezone = String(timezone || googleMeetDefaultTimezone).trim() || googleMeetDefaultTimezone

  if (!cleanSummary || !cleanStart || !cleanEnd) {
    return res.status(400).json({ success: false, error: 'summary, startDateTime, and endDateTime are required' })
  }

  const attendees = Array.isArray(attendeeEmails)
    ? attendeeEmails.map((email) => ({ email: String(email || '').trim() })).filter((entry) => entry.email)
    : []

  try {
    const calendar = getGoogleCalendarClient()
    const response = await calendar.events.insert({
      calendarId: googleCalendarId,
      conferenceDataVersion: 1,
      sendUpdates: 'none',
      requestBody: {
        summary: cleanSummary,
        description: cleanDescription,
        start: { dateTime: cleanStart, timeZone: cleanTimezone },
        end: { dateTime: cleanEnd, timeZone: cleanTimezone },
        attendees,
        conferenceData: {
          createRequest: {
            requestId: String(requestId || '').trim() || `meet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      },
    })

    const data = response?.data || {}
    const meetEntry = (data?.conferenceData?.entryPoints || []).find((item) => item?.entryPointType === 'video')
    const meetLink = data?.hangoutLink || meetEntry?.uri || ''

    if (!meetLink) {
      return res.status(500).json({ success: false, error: 'Google Meet link was not returned by Google Calendar API' })
    }

    const cleanReplaceEventId = String(replaceEventId || '').trim()
    if (cleanReplaceEventId && cleanReplaceEventId !== String(data.id || '').trim()) {
      deleteGoogleCalendarEvent(cleanReplaceEventId).catch((error) => {
        console.error('Failed to revoke previous consultation event:', error?.message || error)
      })
    }

    return res.json({
      success: true,
      data: {
        eventId: data.id,
        meetLink,
        htmlLink: data.htmlLink || '',
        calendarId: googleCalendarId,
      },
    })
  } catch (error) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to create Google Meet link' })
  }
})

app.post('/google-meet/revoke-consultation-link', requireAuth, requirePermission('consultations:create'), async (req, res) => {
  const cleanEventId = String(req.body?.eventId || '').trim()
  const cleanAppointmentId = String(req.body?.appointmentId || '').trim()
  const cleanReason = String(req.body?.reason || 'revoked').trim() || 'revoked'

  if (!cleanEventId && !cleanAppointmentId) {
    return res.status(400).json({ success: false, error: 'eventId or appointmentId is required' })
  }

  try {
    let deletedEventId = cleanEventId || ''
    if (!deletedEventId && cleanAppointmentId) {
      const snap = await admin.firestore().collection('appointments').doc(cleanAppointmentId).get()
      const data = snap.exists ? snap.data() || {} : {}
      deletedEventId = String(data.meetEventId || '').trim()
    }

    if (deletedEventId) {
      await deleteGoogleCalendarEvent(deletedEventId)
    }

    if (cleanAppointmentId) {
      await admin.firestore().collection('appointments').doc(cleanAppointmentId).set(
        {
          consultationMode: 'online',
          meetLink: '',
          meetEventId: '',
          meetRevokedAt: admin.firestore.FieldValue.serverTimestamp(),
          meetRevocationReason: cleanReason,
        },
        { merge: true }
      )
    }

    return res.json({
      success: true,
      data: {
        revoked: Boolean(deletedEventId),
        eventId: deletedEventId || '',
        appointmentId: cleanAppointmentId || '',
      },
    })
  } catch (error) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to revoke Google Meet link' })
  }
})

app.post('/auth/check-registration-status', async (req, res) => {
  const normalizedEmail = String(req.body?.email || '').trim().toLowerCase()
  if (!normalizedEmail) {
    return res.status(400).json({ success: false, error: 'email is required' })
  }

  try {
    const userRecord = await admin.auth().getUserByEmail(normalizedEmail)
    const uid = userRecord.uid
    const firestore = admin.firestore()
    const [userSnap, clinicSnap] = await Promise.all([
      firestore.collection('users').doc(uid).get(),
      firestore.collection('clinics').doc(uid).get(),
    ])

    const userData = userSnap.exists ? userSnap.data() || {} : {}
    const clinicData = clinicSnap.exists ? clinicSnap.data() || {} : {}
    const userStatus = String(userData.status || '').toLowerCase()
    const clinicStatus = String(clinicData.approvalStatus || '').toLowerCase()
    const businessType = String(userData.businessType || clinicData.businessType || '').trim()

    const hasSubmittedDocs =
      Boolean(clinicData.documentsSubmittedAt) ||
      (clinicData.submittedDocuments && Object.keys(clinicData.submittedDocuments || {}).length > 0)

    const pendingApprovalSignals =
      userStatus.includes('pending approval') ||
      clinicStatus.includes('pending approval') ||
      clinicStatus.includes('waiting') ||
      clinicStatus.includes('for approval') ||
      clinicStatus.includes('submitted') ||
      hasSubmittedDocs

    let resumeStep = 1
    if (userStatus === 'active') {
      resumeStep = 'active'
    } else if (pendingApprovalSignals) {
      resumeStep = 4
    } else if (userStatus.includes('pending document') || clinicStatus.includes('pending document')) {
      resumeStep = 3
    } else if (userStatus.includes('pending otp') || clinicStatus.includes('pending otp')) {
      resumeStep = 2
    }

    return res.json({
      success: true,
      exists: true,
      uid,
      resumeStep,
      userStatus,
      clinicStatus,
      hasSubmittedDocs,
      businessType,
    })
  } catch (error) {
    const code = error?.code || ''
    if (code === 'auth/user-not-found') {
      return res.json({ success: true, exists: false })
    }
    return res.status(400).json({
      success: false,
      error: error?.message || 'Failed to check registration status.',
      code,
    })
  }
})

app.post('/auth/verify-registration-otp', async (req, res) => {
  const { uid, email } = req.body ?? {}
  const normalizedEmail = String(email || '').trim().toLowerCase()
  const normalizedUid = String(uid || '').trim()
  if (!normalizedEmail || !normalizedUid) {
    return res.status(400).json({ success: false, error: 'uid and email are required' })
  }

  try {
    const userRecord = await admin.auth().getUser(normalizedUid)
    const recordEmail = String(userRecord?.email || '').trim().toLowerCase()
    if (recordEmail && recordEmail !== normalizedEmail) {
      return res.status(403).json({ success: false, error: 'Email does not match user record' })
    }

    const firestore = admin.firestore()
    await Promise.all([
      firestore.collection('users').doc(normalizedUid).set(
        {
          status: 'Pending Document Submission',
          emailVerified: true,
          emailVerifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      ),
      firestore.collection('clinics').doc(normalizedUid).set(
        {
          approvalStatus: 'Pending Document Submission',
        },
        { merge: true }
      ),
    ])

    return res.json({ success: true })
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error?.message || 'Failed to verify OTP.',
      code: error?.code || '',
    })
  }
})

app.post('/auth/registration-profile', async (req, res) => {
  const normalizedEmail = String(req.body?.email || '').trim().toLowerCase()
  if (!normalizedEmail) {
    return res.status(400).json({ success: false, error: 'email is required' })
  }

  try {
    const userRecord = await admin.auth().getUserByEmail(normalizedEmail)
    const uid = userRecord.uid
    const firestore = admin.firestore()
    const [userSnap, clinicSnap] = await Promise.all([
      firestore.collection('users').doc(uid).get(),
      firestore.collection('clinics').doc(uid).get(),
    ])

    const userData = userSnap.exists ? userSnap.data() || {} : {}
    const clinicData = clinicSnap.exists ? clinicSnap.data() || {} : {}
    const safeDate = (value) => {
      if (!value) return null
      if (typeof value?.toDate === 'function') {
        const d = value.toDate()
        return Number.isNaN(d.getTime()) ? null : d.toISOString()
      }
      if (value instanceof Date) return value.toISOString()
      if (typeof value === 'string' || typeof value === 'number') {
        const d = new Date(value)
        return Number.isNaN(d.getTime()) ? null : d.toISOString()
      }
      return null
    }

    return res.json({
      success: true,
      exists: true,
      uid,
      profile: {
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        birthDate: safeDate(userData.birthDate),
        email: userData.email || normalizedEmail,
        contactNumber: userData.contactNumber || '',
        businessType: userData.businessType || clinicData.businessType || '',
        authorizedRepPosition: userData.authorizedRepPosition || clinicData.authorizedRepPosition || '',
        companyName: userData.companyName || clinicData.companyName || '',
        companyType: userData.companyType || clinicData.companyType || '',
        clinicName: clinicData.clinicName || '',
        clinicLocation: clinicData.clinicLocation || '',
        clinicLocationLat: clinicData.clinicLocationLat || '',
        clinicLocationLng: clinicData.clinicLocationLng || '',
        clinicLocationAddress: clinicData.clinicLocationAddress || '',
        subscriptionPlan: clinicData.subscriptionPlan || userData.subscriptionPlan || '',
        paymentStatus: clinicData.paymentStatus || userData.paymentStatus || '',
        paymentId: clinicData.paymentId || userData.paymentId || '',
        submittedDocuments: clinicData.submittedDocuments || {},
        draftDocuments: clinicData.draftDocuments || {},
        status: userData.status || '',
        approvalStatus: clinicData.approvalStatus || '',
      },
    })
  } catch (error) {
    const code = error?.code || ''
    if (code === 'auth/user-not-found') {
      return res.json({ success: true, exists: false })
    }
    return res.status(400).json({
      success: false,
      error: error?.message || 'Failed to load registration profile.',
      code,
    })
  }
})

app.post('/send-account-welcome', requireAuth, async (req, res) => {
  const { recipient, fullName, accountType } = req.body ?? {}
  const normalizedRecipient = String(recipient || '').trim().toLowerCase()
  const signedInEmail = String(req.user?.email || '').trim().toLowerCase()

  if (!normalizedRecipient || !signedInEmail) {
    return res.status(400).json({ success: false, error: 'recipient is required' })
  }
  if (normalizedRecipient !== signedInEmail) {
    return res.status(403).json({ success: false, error: 'You can only request a welcome email for your own account.' })
  }

  try {
    const result = await sendSendGridMessage(
      buildWelcomeMessage({
        recipient: normalizedRecipient,
        fullName,
        accountType,
      })
    )
    return res.json({ success: true, statusCode: result.statusCode || null, messageId: result.messageId || null })
  } catch (error) {
    if (isDevelopment) {
      return res.json({ success: true, devMode: true })
    }
    return res.status(500).json({ success: false, error: error?.message || 'Failed to send welcome email' })
  }
})

app.post('/send-payment-receipt', async (req, res) => {
  const { recipient, payerName, planName, amount, currency, referenceNumber, paymentMethod } = req.body ?? {}
  const normalizedRecipient = String(recipient || '').trim().toLowerCase()
  if (!normalizedRecipient) {
    return res.status(400).json({ success: false, error: 'recipient is required' })
  }

  try {
    const result = await sendSendGridMessage(
      buildPaymentReceiptMessage({
        recipient: normalizedRecipient,
        payerName,
        planName,
        amount,
        currency,
        referenceNumber,
        paymentMethod,
      })
    )
    return res.json({ success: true, statusCode: result.statusCode || null, messageId: result.messageId || null })
  } catch (error) {
    if (isDevelopment) {
      return res.json({ success: true, devMode: true })
    }
    return res.status(500).json({ success: false, error: error?.message || 'Failed to send payment receipt' })
  }
})

app.post('/admin/reject-clinic-registration', requireAuth, requireRole(['superadmin']), async (req, res) => {
  const uid = String(req.body?.uid || '').trim()
  const rejectionReason = String(req.body?.rejectionReason || '').trim()
  const reviewedBy = String(req.body?.reviewedBy || '').trim() || null

  if (!uid) {
    return res.status(400).json({ success: false, error: 'uid is required' })
  }
  if (!rejectionReason) {
    return res.status(400).json({ success: false, error: 'rejectionReason is required' })
  }

  try {
    const firestore = admin.firestore()
    const userRef = firestore.collection('users').doc(uid)
    const clinicRef = firestore.collection('clinics').doc(uid)
    const [userSnap, clinicSnap] = await Promise.all([userRef.get(), clinicRef.get()])
    const userData = userSnap.exists ? userSnap.data() || {} : {}
    const clinicData = clinicSnap.exists ? clinicSnap.data() || {} : {}
    const recipient = String(userData.email || clinicData.email || '').trim().toLowerCase()
    const fullName =
      String(
        [
          userData.firstName || clinicData.firstName || '',
          userData.lastName || clinicData.lastName || '',
        ]
          .map((part) => String(part || '').trim())
          .filter(Boolean)
          .join(' ')
      ).trim() || 'there'
    const clinicName = String(clinicData.clinicName || clinicData.companyName || userData.companyName || '').trim() || 'your clinic'

    if (recipient && sendGridApiKey && senderEmail) {
      try {
        await sendSendGridMessage(
          buildClinicRejectionEmailMessage({
            recipient,
            fullName,
            clinicName,
            rejectionReason,
          })
        )
      } catch (emailError) {
        console.error('Failed to send clinic rejection email:', emailError?.response?.body?.errors?.[0]?.message || emailError?.message || emailError)
      }
    }

    await Promise.all([
      userRef.set(
        {
          status: 'Rejected',
          rejectionReason,
          rejectedAt: admin.firestore.FieldValue.serverTimestamp(),
          reviewedBy,
        },
        { merge: true }
      ),
      clinicRef.set(
        {
          approvalStatus: 'Rejected',
          rejectionReason,
          rejectedAt: admin.firestore.FieldValue.serverTimestamp(),
          reviewedBy,
        },
        { merge: true }
      ),
    ])

    await Promise.all([userRef.delete(), clinicRef.delete()])

    try {
      await admin.auth().deleteUser(uid)
    } catch (authError) {
      if (authError?.code !== 'auth/user-not-found') {
        throw authError
      }
    }

    return res.json({ success: true, data: { uid, deleted: true } })
  } catch (error) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to reject and delete account' })
  }
})

app.post('/appointments/reservations', requireAuth, async (req, res) => {
  const body = req.body || {}
  const branchId = String(body.branchId || '').trim()
  const centerId = String(body.centerId || body.branchId || '').trim()
  const customerId = String(body.customerId || '').trim() || String(req.user?.uid || '').trim()
  const customerName = String(body.customerName || body.customerEmail || 'Customer').trim() || 'Customer'
  const customerEmail = String(body.customerEmail || req.user?.email || '').trim()
  const practitionerId = String(body.practitionerId || '').trim()
  const practitionerName = String(body.practitionerName || '').trim()
  const date = String(body.date || '').trim()
  const time = String(body.time || '').trim()
  const endTime = String(body.endTime || '').trim()
  const flowType = String(body.flowType || 'booking').trim().toLowerCase()
  const selectedServices = Array.isArray(body.selectedServices) ? body.selectedServices : []
  const selectedServiceIds = Array.isArray(body.selectedServiceIds) ? body.selectedServiceIds.filter(Boolean) : []
  const selectedServiceNames = Array.isArray(body.selectedServiceNames) ? body.selectedServiceNames.filter(Boolean) : []
  const serviceDurations = Array.isArray(body.serviceDurations) ? body.serviceDurations.map((value) => Number(value || 0)).filter((value) => value > 0) : []
  const totalServiceDurationMinutes = Math.max(15, Number(body.totalServiceDurationMinutes || serviceDurations.reduce((sum, value) => sum + value, 0) || 60))
  const consultationFee = Number(body.consultationFee || 0)
  const amount = Number(body.amount || consultationFee || 0)
  const paymentMethod = String(body.paymentMethod || '').trim()
  const paymentCoverage = String(body.paymentCoverage || 'full').trim()
  const commissionPercent = Number(body.commissionPercent || 10)
  const commissionAmount = Number(body.commissionAmount || 0)
  const netAmount = Number(body.netAmount || 0)
  const requiresConsultationFirst = Boolean(body.requiresConsultationFirst)
  const followUpAllowed = Boolean(body.followUpAllowed)
  const followUpWindowDays = body.followUpWindowDays != null ? Number(body.followUpWindowDays) : null
  const notes = String(body.notes || '').trim()

  if (!customerId || !branchId || !practitionerId || !date || !time) {
    return res.status(400).json({ success: false, error: 'branchId, practitionerId, date, time, and customerId are required' })
  }

  const start = parseClockToMinutes(time)
  if (start === null) {
    return res.status(400).json({ success: false, error: 'Invalid booking time' })
  }
  const normalizedEnd = parseClockToMinutes(endTime)
  const end = normalizedEnd !== null && normalizedEnd > start ? normalizedEnd : start + totalServiceDurationMinutes
  const firestore = admin.firestore()
  const reservationsCol = firestore.collection(BOOKING_RESERVATIONS_COLLECTION)
  const reservationRef = reservationsCol.doc()
  const nowMs = Date.now()
  const expiresAt = admin.firestore.Timestamp.fromMillis(nowMs + BOOKING_RESERVATION_TTL_MINUTES * 60 * 1000)

  try {
    await firestore.runTransaction(async (transaction) => {
      const appointmentsSnap = await transaction.get(
        firestore.collection('appointments')
          .where('branchId', '==', branchId)
          .where('date', '==', date)
          .where('assignedPractitionerId', '==', practitionerId)
      )
      const reservationsSnap = await transaction.get(
        reservationsCol
          .where('branchId', '==', branchId)
          .where('date', '==', date)
          .where('practitionerId', '==', practitionerId)
          .where('status', '==', 'held')
      )

      const blocks = []
      appointmentsSnap.docs.forEach((snap) => {
        const data = snap.data() || {}
        const status = normalizeBookingStatus(data.status)
        if (!BOOKING_BLOCKING_STATUSES.has(status)) return
        const range = getBookingRange(data)
        if (range) blocks.push(range)
      })

      for (const snap of reservationsSnap.docs) {
        const data = snap.data() || {}
        if (normalizeBookingStatus(data.status) !== 'held') continue
        if (Number(safeTimestamp(data.expiresAt)?.toMillis?.() || 0) <= nowMs) continue
        const range = getBookingRange(data)
        if (range) blocks.push(range)
      }

      const conflictingBlock = blocks.find((range) => rangesOverlap(start, end, range.start, range.end))
      if (conflictingBlock) {
        throw new Error('That schedule was just taken. Please choose another available time.')
      }

      transaction.set(reservationRef, {
        branchId,
        centerId,
        customerId,
        customerName,
        customerEmail,
        practitionerId,
        practitionerName,
        flowType,
        date,
        time,
        endTime,
        durationMinutes: totalServiceDurationMinutes,
        selectedServices,
        selectedServiceIds,
        selectedServiceNames,
        serviceDurations,
        totalServiceDurationMinutes,
        consultationFee,
        amount,
        paymentMethod,
        paymentCoverage,
        commissionPercent,
        commissionAmount,
        netAmount,
        requiresConsultationFirst,
        followUpAllowed,
        followUpWindowDays,
        notes,
        status: 'held',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt,
      })
    })

    return res.json({
      success: true,
      data: {
        id: reservationRef.id,
        expiresAt: expiresAt.toDate().toISOString(),
        reused: false,
      },
    })
  } catch (error) {
    return res.status(400).json({ success: false, error: error?.message || 'Failed to reserve the selected time.' })
  }
})

app.delete('/appointments/reservations/:id', requireAuth, async (req, res) => {
  const reservationId = String(req.params.id || '').trim()
  if (!reservationId) {
    return res.status(400).json({ success: false, error: 'reservation id is required' })
  }

  try {
    const firestore = admin.firestore()
    const reservationRef = firestore.collection(BOOKING_RESERVATIONS_COLLECTION).doc(reservationId)
    const snap = await reservationRef.get()
    if (!snap.exists) {
      return res.json({ success: true })
    }
    const data = snap.data() || {}
    if (String(data.customerId || '').trim() !== String(req.user?.uid || '').trim()) {
      return res.status(403).json({ success: false, error: 'Forbidden' })
    }
    if (normalizeBookingStatus(data.status) === 'consumed') {
      return res.json({ success: true })
    }
    await reservationRef.set(
      {
        status: 'cancelled',
        cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    )
    return res.json({ success: true })
  } catch (error) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to release reservation' })
  }
})

app.post('/appointments/finalize-booking', requireAuth, async (req, res) => {
  const reservationId = String(req.body?.reservationId || '').trim()
  if (!reservationId) {
    return res.status(400).json({ success: false, error: 'reservation id is required' })
  }

  const firestore = admin.firestore()
  const reservationRef = firestore.collection(BOOKING_RESERVATIONS_COLLECTION).doc(reservationId)
  let appointmentId = ''

  try {
    await firestore.runTransaction(async (transaction) => {
      const snap = await transaction.get(reservationRef)
      if (!snap.exists) {
        throw new Error('Reservation not found.')
      }
      const reservation = snap.data() || {}
      if (String(reservation.customerId || '').trim() !== String(req.user?.uid || '').trim()) {
        throw new Error('Forbidden')
      }
      if (normalizeBookingStatus(reservation.status) !== 'held') {
        throw new Error('This reservation is no longer active.')
      }
      if (Number(safeTimestamp(reservation.expiresAt)?.toMillis?.() || 0) <= Date.now()) {
        throw new Error('This reservation has expired. Please book again.')
      }

      const paymongoPayload = req.body?.paymongoPayload || null
      const paymongoStatus = String(req.body?.paymongoStatus || '').trim() || null
      const paymongoPaidAt = req.body?.paymongoPaidAt || null
      const paymongoPaymentId = String(req.body?.paymongoPaymentId || '').trim() || null
      const paymongoPaymentMethodType = String(req.body?.paymongoPaymentMethodType || '').trim() || null
      const paymentMethod = String(req.body?.paymentMethod || '').trim() || null

      const appointmentRef = firestore.collection('appointments').doc()
      const appointmentPayload = buildBookingAppointmentPayload({
        reservation: { ...reservation, id: reservationId },
        paymongo: {
          status: paymongoStatus,
          paid_at: paymongoPaidAt,
          paymentId: paymongoPaymentId,
          payload: paymongoPayload,
        },
        paymentMethodType: paymongoPaymentMethodType,
        paymentMethod,
      })

      transaction.set(appointmentRef, appointmentPayload)
      transaction.set(
        reservationRef,
        {
          status: 'consumed',
          appointmentId: appointmentRef.id,
          paymongoCheckoutSessionId: String(req.body?.paymongoCheckoutSessionId || '').trim() || null,
          paymongoStatus,
          paymongoPaidAt,
          paymongoPaymentId,
          paymongoPaymentMethodType,
          consumedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      )
      appointmentId = appointmentRef.id
    })

    return res.json({ success: true, data: { appointmentId } })
  } catch (error) {
    if (String(error?.message || '') === 'Forbidden') {
      return res.status(403).json({ success: false, error: 'Forbidden' })
    }
    return res.status(400).json({ success: false, error: error?.message || 'Failed to finalize booking' })
  }
})

app.post('/paymongo/create-checkout-session', optionalAuth, async (req, res) => {
  if (!assertPayMongoConfigured(res)) return

  const {
    amount,
    paymentMethodType,
    paymentMethodTypes,
    description,
    referenceNumber,
    metadata,
    billing,
    lineItems,
    successUrl,
    cancelUrl,
  } = req.body ?? {}

  const moduleKey = String(metadata?.module || '').trim().toLowerCase()
  const isSubscriptionCheckout = moduleKey === 'subscription'
  const isCustomerOrderCheckout = moduleKey === 'customer_order'
  const isCustomerBookingCheckout = moduleKey === 'customer_appointment' || moduleKey === 'customer_consultation'

  if (!isSubscriptionCheckout) {
    if (!req.user?.uid) {
      return res.status(401).json({ success: false, error: 'Missing authorization token' })
    }
    if (isCustomerOrderCheckout || isCustomerBookingCheckout) {
      const metadataCustomerId = String(metadata?.customerId || '').trim()
      if (!metadataCustomerId || metadataCustomerId !== req.user.uid) {
        return res.status(403).json({ success: false, error: 'Forbidden' })
      }
    } else {
      try {
        if (!req.userContext || req.userContext.uid !== req.user.uid) {
          req.userContext = await loadUserContext(req.user.uid)
        }
        if (!req.userContext.permissions.has('payments:create')) {
          return res.status(403).json({ success: false, error: 'Forbidden' })
        }
      } catch (_error) {
        return res.status(500).json({ success: false, error: 'Failed to verify permission' })
      }
    }
  }

  const normalizedAmount = Number(amount || 0)
  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    return res.status(400).json({ success: false, error: 'amount must be a positive number in centavos' })
  }

  const normalizeMethod = (value) => String(value || '').trim().toLowerCase()
  const allowedMethods = [
    'card',
    'gcash',
    'grab_pay',
    'billease',
    'paymaya',
    'dob',
    'dob_ubp',
    'brankas_bdo',
    'brankas_landbank',
    'brankas_metrobank',
  ]
  const methodsFromArray = Array.isArray(paymentMethodTypes)
    ? paymentMethodTypes.map(normalizeMethod).filter((method) => allowedMethods.includes(method))
    : []
  const methodFromSingle = normalizeMethod(paymentMethodType)
  const selectedMethods =
    methodsFromArray.length > 0
      ? methodsFromArray
      : allowedMethods.includes(methodFromSingle)
        ? [methodFromSingle]
        : []

  const payload = {
    data: {
      attributes: {
        billing: billing && typeof billing === 'object' ? billing : null,
        send_email_receipt: false,
        show_description: true,
        show_line_items: true,
        description: String(description || 'POS Payment'),
        line_items: Array.isArray(lineItems) && lineItems.length > 0
          ? lineItems
          : [{
              amount: Math.round(normalizedAmount),
              currency: 'PHP',
              name: description || 'POS Payment',
              quantity: 1,
            }],
        ...(selectedMethods.length > 0 ? { payment_method_types: selectedMethods } : {}),
        reference_number: String(referenceNumber || ''),
        metadata: metadata && typeof metadata === 'object' ? metadata : {},
        success_url: successUrl || `${frontendBaseUrl}/receptionist/pos?paymongo_status=success`,
        cancel_url: cancelUrl || `${frontendBaseUrl}/receptionist/pos?paymongo_status=cancelled`,
      },
    },
  }

  try {
    const response = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
      method: 'POST',
      headers: buildPayMongoHeaders(),
      body: JSON.stringify(payload),
    })

    const data = await response.json()
    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: data?.errors?.[0]?.detail || 'Failed to create checkout session',
        provider: data,
      })
    }

    return res.json({
      success: true,
      data: {
        id: data?.data?.id,
        checkout_url: data?.data?.attributes?.checkout_url,
        client_key: data?.data?.attributes?.client_key,
      },
    })
  } catch (error) {
    return res.status(500).json({ success: false, error: error?.message || 'Unexpected PayMongo error' })
  }
})

app.get('/paymongo/checkout-session/:id', optionalAuth, async (req, res) => {
  if (!assertPayMongoConfigured(res)) return

  const checkoutSessionId = String(req.params.id || '').trim()
  if (!checkoutSessionId) {
    return res.status(400).json({ success: false, error: 'checkout session id is required' })
  }

  try {
    const response = await fetch(`https://api.paymongo.com/v1/checkout_sessions/${checkoutSessionId}`, {
      method: 'GET',
      headers: buildPayMongoHeaders(),
    })

    const data = await response.json()
    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: data?.errors?.[0]?.detail || 'Failed to retrieve checkout session',
        provider: data,
      })
    }

    const attributes = data?.data?.attributes || {}
    const isPaid = Boolean(attributes?.paid_at) || (Array.isArray(attributes?.payments) && attributes.payments.length > 0)
    const metadata = attributes?.metadata || {}
    const moduleKey = String(metadata?.module || '').trim().toLowerCase()
    const isCustomerOrderCheckout = moduleKey === 'customer_order'
    const isCustomerBookingCheckout = moduleKey === 'customer_appointment' || moduleKey === 'customer_consultation'

    if (isCustomerOrderCheckout || isCustomerBookingCheckout) {
      if (!req.user?.uid) {
        return res.status(401).json({ success: false, error: 'Missing authorization token' })
      }
      const metadataCustomerId = String(metadata?.customerId || '').trim()
      if (!metadataCustomerId || metadataCustomerId !== req.user.uid) {
        return res.status(403).json({ success: false, error: 'Forbidden' })
      }
    } else if (moduleKey !== 'subscription') {
      if (!req.user?.uid) {
        return res.status(401).json({ success: false, error: 'Missing authorization token' })
      }
      try {
        if (!req.userContext || req.userContext.uid !== req.user.uid) {
          req.userContext = await loadUserContext(req.user.uid)
        }
        if (!req.userContext.permissions.has('payments:view')) {
          return res.status(403).json({ success: false, error: 'Forbidden' })
        }
      } catch (_error) {
        return res.status(500).json({ success: false, error: 'Failed to verify permission' })
      }
    }

    if (isPaid && moduleKey === 'subscription') {
      try {
        const payerEmail = String(metadata?.payerEmail || metadata?.email || '').trim().toLowerCase()
        const planId = String(metadata?.planId || '').trim().toLowerCase()
        if (payerEmail && planId) {
          const firestore = admin.firestore()
          const usersSnap = await firestore.collection('users').where('email', '==', payerEmail).get()
          if (!usersSnap.empty) {
            const userDoc = usersSnap.docs[0]
            const uid = userDoc.id
            const paidAtMs = attributes?.paid_at ? Date.parse(attributes.paid_at) : Date.now()
            const planDays = planId === 'free-trial' ? 14 : 30
            const startedAt = new Date(Number.isNaN(paidAtMs) ? Date.now() : paidAtMs)
            const expiresAt = new Date(startedAt.getTime() + planDays * 24 * 60 * 60 * 1000)

            await firestore.collection('users').doc(uid).set(
              {
                subscriptionPlan: planId,
                paymentStatus: 'paid',
                paymentId: String(data?.data?.id || '') || null,
                subscriptionStartedAt: startedAt,
                subscriptionExpiresAt: expiresAt,
                subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true }
            )

            const clinicsByOwnerSnap = await firestore.collection('clinics').where('ownerId', '==', uid).get()
            for (const clinicDoc of clinicsByOwnerSnap.docs) {
              await firestore.collection('clinics').doc(clinicDoc.id).set(
                {
                  subscriptionPlan: planId,
                  paymentStatus: 'paid',
                  paymentId: String(data?.data?.id || '') || null,
                  subscriptionStartedAt: startedAt,
                  subscriptionExpiresAt: expiresAt,
                  subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
                },
                { merge: true }
              )
            }

            const clinicDocByUid = await firestore.collection('clinics').doc(uid).get()
            if (clinicDocByUid.exists) {
              await firestore.collection('clinics').doc(uid).set(
                {
                  subscriptionPlan: planId,
                  paymentStatus: 'paid',
                  paymentId: String(data?.data?.id || '') || null,
                  subscriptionStartedAt: startedAt,
                  subscriptionExpiresAt: expiresAt,
                  subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
                },
                { merge: true }
              )
            }
          }
        }
      } catch (error) {
        console.error('Failed to backfill subscription after PayMongo payment:', error?.message || error)
      }
    }

    return res.json({
      success: true,
      data: {
        id: data?.data?.id,
        status: attributes?.status || null,
        paid_at: attributes?.paid_at || null,
        payments: attributes?.payments || [],
        metadata: attributes?.metadata || {},
        isPaid,
      },
    })
  } catch (error) {
    return res.status(500).json({ success: false, error: error?.message || 'Unexpected PayMongo error' })
  }
})

const toDate = (value) => {
  if (!value) return null
  if (typeof value?.toDate === 'function') return value.toDate()
  if (value instanceof Date) return value
  if (typeof value === 'number') return new Date(value)
  if (typeof value === 'string') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  return null
}

const formatDate = (value) => {
  if (!value) return ''
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(value)
  } catch (_error) {
    return value.toISOString()
  }
}

exports.api = functions.https.onRequest(app)

if (isDevelopment) {
  setInterval(() => {}, 60 * 60 * 1000)
}
