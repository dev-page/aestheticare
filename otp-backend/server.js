import express from 'express'
import cors from 'cors'
import sgMail from '@sendgrid/mail'
import dotenv from 'dotenv'
import admin from 'firebase-admin'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import archiver from 'archiver'
import { PassThrough } from 'node:stream'
import { google } from 'googleapis'

dotenv.config()

const app = express()
const PORT = Number(process.env.PORT || 3000)
const isDevelopment = String(process.env.NODE_ENV || 'development').toLowerCase() !== 'production'
const OTP_PATH = '/send-otp'
const ATTENDANCE_PIN_PATH = '/send-attendance-pin'
const STAFF_WELCOME_PATH = '/send-staff-welcome'
const RESET_PASSWORD_PATH = '/auth/reset-password'
const CHECK_USER_PATH = '/auth/check-user'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '.env') })

console.log("Loaded ENV:", {
  PORT: process.env.PORT,
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY ? "present" : "missing",
  SENDGRID_SENDER: process.env.SENDGRID_SENDER,
  PAYMONGO_SECRET_KEY: process.env.PAYMONGO_SECRET_KEY ? "present" : "missing",
  PAYMONGO_PUBLIC_KEY: process.env.PAYMONGO_PUBLIC_KEY ? "present" : "missing",
  FRONTEND_BASE_URL: process.env.FRONTEND_BASE_URL,
  GOOGLE_OAUTH_CLIENT_ID: process.env.GOOGLE_OAUTH_CLIENT_ID ? "present" : "missing",
  GOOGLE_OAUTH_CLIENT_SECRET: process.env.GOOGLE_OAUTH_CLIENT_SECRET ? "present" : "missing",
  GOOGLE_OAUTH_REFRESH_TOKEN: process.env.GOOGLE_OAUTH_REFRESH_TOKEN ? "present" : "missing",
  GOOGLE_CALENDAR_ID: process.env.GOOGLE_CALENDAR_ID || "primary",
});

app.use(cors())
app.use(express.json())

const sendGridApiKey = process.env.SENDGRID_API_KEY
const senderEmail = process.env.SENDGRID_SENDER
const payMongoSecretKey = process.env.PAYMONGO_SECRET_KEY || ''
const frontendBaseUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:5173'
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(__dirname, 'serviceAccountKey.json')
const googleOauthClientId = process.env.GOOGLE_OAUTH_CLIENT_ID || ''
const googleOauthClientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET || ''
const googleOauthRefreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN || ''
const googleCalendarId = process.env.GOOGLE_CALENDAR_ID || 'primary'
const googleMeetDefaultTimezone = process.env.GOOGLE_MEET_DEFAULT_TIMEZONE || 'Asia/Manila'

if (sendGridApiKey) {
  sgMail.setApiKey(sendGridApiKey)
}

let adminReady = false
let adminInitError = ''
let firebaseProjectId = ''
let firebaseStorageBucket = ''
const backupScheduleEnabled = String(process.env.BACKUP_SCHEDULE_ENABLED || '').toLowerCase() === 'true'
const backupDailyHour = Number(process.env.BACKUP_DAILY_HOUR || 2)
const backupMonthlyDay = Number(process.env.BACKUP_MONTHLY_DAY || 1)
const backupDailyRetentionDays = Number(process.env.BACKUP_DAILY_RETENTION_DAYS || 30)
const backupMonthlyRetentionDays = Number(process.env.BACKUP_MONTHLY_RETENTION_DAYS || 365)

try {
  const serviceAccountRaw = fs.readFileSync(serviceAccountPath, 'utf8')
  const serviceAccount = JSON.parse(serviceAccountRaw)
  firebaseProjectId = String(serviceAccount?.project_id || '').trim()
  firebaseStorageBucket =
    process.env.FIREBASE_STORAGE_BUCKET ||
    String(serviceAccount?.storageBucket || '').trim() ||
    (firebaseProjectId ? `${firebaseProjectId}.firebasestorage.app` : '') ||
    (firebaseProjectId ? `${firebaseProjectId}.appspot.com` : '')
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    ...(firebaseStorageBucket ? { storageBucket: firebaseStorageBucket } : {}),
  })
  adminReady = true
  console.log('firebase-admin initialized:', { serviceAccountPath })
} catch (error) {
  adminReady = false
  adminInitError = error?.message || 'Failed to initialize firebase-admin'
  console.error('firebase-admin init error:', adminInitError)
}

const buildPayMongoHeaders = () => ({
  accept: 'application/json',
  'content-type': 'application/json',
  Authorization: `Basic ${Buffer.from(`${payMongoSecretKey}:`).toString('base64')}`,
})

const assertPayMongoConfigured = (res) => {
  if (payMongoSecretKey) return true
  res.status(500).json({
    success: false,
    error: 'PAYMONGO_SECRET_KEY is missing',
  })
  return false
}

const isGoogleMeetConfigured = () =>
  Boolean(googleOauthClientId && googleOauthClientSecret && googleOauthRefreshToken)

const getGoogleCalendarClient = () => {
  const oauth2Client = new google.auth.OAuth2(googleOauthClientId, googleOauthClientSecret)
  oauth2Client.setCredentials({ refresh_token: googleOauthRefreshToken })
  return google.calendar({ version: 'v3', auth: oauth2Client })
}

const sendSendGridMessage = async (message) => {
  const [response] = await sgMail.send(message)
  const messageId = response?.headers?.['x-message-id'] || response?.headers?.['X-Message-Id'] || null
  return {
    statusCode: response?.statusCode || null,
    messageId,
  }
}

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const normalizeWelcomeAccountType = (value) => {
  const raw = String(value || '').trim().toLowerCase()
  if (raw.includes('clinic')) return 'clinic'
  if (raw.includes('staff') || raw.includes('employee') || raw.includes('practitioner') || raw.includes('receptionist') || raw.includes('finance') || raw.includes('hr') || raw.includes('manager') || raw.includes('supply')) {
    return 'staff'
  }
  return 'customer'
}

const buildWelcomeEmailMessage = ({
  recipient,
  fullName,
  accountType = 'customer',
  defaultPassword = '',
}) => {
  const safeRecipient = String(recipient || '').trim().toLowerCase()
  const safeName = String(fullName || 'there').trim() || 'there'
  const safeAccountType = normalizeWelcomeAccountType(accountType)
  const loginUrl = `${String(frontendBaseUrl || '').replace(/\/$/, '')}/login`
  const displayName = escapeHtml(safeName)
  const loginLink = escapeHtml(loginUrl)
  const recipientLabel = escapeHtml(safeRecipient)
  const passwordLine = String(defaultPassword || '').trim()
  const passwordHtml = passwordLine
    ? `<p><strong>Temporary password:</strong> ${escapeHtml(passwordLine)}</p>`
    : ''

  if (safeAccountType === 'clinic') {
    return {
      to: safeRecipient,
      from: senderEmail,
      subject: 'Welcome to AesthetiCare - Your clinic workspace is ready',
      text:
        `Hi ${safeName},\n\n` +
        `Welcome to AesthetiCare. Your clinic account is ready, and your workspace is now one step closer to serving patients with confidence.\n\n` +
        `Use this email to sign in anytime: ${safeRecipient}\n` +
        `Login page: ${loginUrl}\n\n` +
        `Please complete any remaining verification steps inside the platform so your clinic can fully get started.\n\n` +
        `If you were not expecting this email, please contact AesthetiCare support.`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.7;color:#2a1408;background:#fffaf3;padding:28px;border:1px solid #e6c79b;border-radius:20px;max-width:640px;margin:0 auto;">
          <div style="text-transform:uppercase;letter-spacing:0.16em;font-size:12px;color:#9b5f10;font-weight:700;margin-bottom:10px;">AesthetiCare</div>
          <h1 style="margin:0 0 14px;font-size:26px;color:#5d3412;">Welcome, ${displayName}.</h1>
          <p style="margin:0 0 12px;">Your clinic workspace is ready. You can now sign in, continue verification, and begin preparing your branch for patients.</p>
          <p style="margin:0 0 12px;"><strong>Email:</strong> ${recipientLabel}</p>
          <p style="margin:0 0 18px;">Please visit the login page below to continue:</p>
          <p style="margin:0 0 22px;"><a href="${loginLink}" style="display:inline-block;background:#bb7a18;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:700;">Go to AesthetiCare Login</a></p>
          <p style="margin:0 0 0;color:#6a4b25;">If you were not expecting this email, please contact AesthetiCare support.</p>
        </div>
      `,
    }
  }

  if (safeAccountType === 'staff') {
    return {
      to: safeRecipient,
      from: senderEmail,
      subject: 'Your AesthetiCare Staff Account Is Ready',
      text:
        `Hi ${safeName},\n\n` +
        `Welcome to AesthetiCare. Your staff account has been created and is ready for first sign-in.\n\n` +
        `Email: ${safeRecipient}\n` +
        `Temporary password: ${passwordLine}\n\n` +
        `Login page: ${loginUrl}\n\n` +
        `Please sign in and change your password right away to keep your account secure.\n\n` +
        `If you were not expecting this email, please contact your clinic administrator.`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.7;color:#2a1408;background:#fffaf3;padding:28px;border:1px solid #e6c79b;border-radius:20px;max-width:640px;margin:0 auto;">
          <div style="text-transform:uppercase;letter-spacing:0.16em;font-size:12px;color:#9b5f10;font-weight:700;margin-bottom:10px;">AesthetiCare</div>
          <h1 style="margin:0 0 14px;font-size:26px;color:#5d3412;">Your staff account is ready, ${displayName}.</h1>
          <p style="margin:0 0 12px;">You can now sign in to the platform and begin using your role-based workspace.</p>
          <p style="margin:0 0 12px;"><strong>Email:</strong> ${recipientLabel}</p>
          ${passwordHtml}
          <p style="margin:0 0 18px;">Please sign in and change your password immediately after your first login.</p>
          <p style="margin:0 0 22px;"><a href="${loginLink}" style="display:inline-block;background:#bb7a18;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:700;">Go to AesthetiCare Login</a></p>
          <p style="margin:0 0 0;color:#6a4b25;">If you were not expecting this email, please contact your clinic administrator.</p>
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
      `Welcome to AesthetiCare — your digital home for effortless bookings, reminders, and a smoother care experience.\n\n` +
      `Email: ${safeRecipient}\n` +
      `Login page: ${loginUrl}\n\n` +
      `We’re glad you’re here. Log in anytime to explore your dashboard, book appointments, and stay connected with the clinic.\n\n` +
      `If you were not expecting this email, please contact AesthetiCare support.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.7;color:#2a1408;background:#fffaf3;padding:28px;border:1px solid #e6c79b;border-radius:20px;max-width:640px;margin:0 auto;">
        <div style="text-transform:uppercase;letter-spacing:0.16em;font-size:12px;color:#9b5f10;font-weight:700;margin-bottom:10px;">AesthetiCare</div>
        <h1 style="margin:0 0 14px;font-size:26px;color:#5d3412;">Welcome aboard, ${displayName}.</h1>
        <p style="margin:0 0 12px;">Your account is ready, and your care journey can begin.</p>
        <p style="margin:0 0 12px;"><strong>Email:</strong> ${recipientLabel}</p>
        <p style="margin:0 0 18px;">Sign in anytime to manage your appointments and stay connected with the platform.</p>
        <p style="margin:0 0 22px;"><a href="${loginLink}" style="display:inline-block;background:#bb7a18;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:700;">Go to AesthetiCare Login</a></p>
        <p style="margin:0 0 0;color:#6a4b25;">If you were not expecting this email, please contact AesthetiCare support.</p>
      </div>
    `,
  }
}

const buildClinicRejectionEmailMessage = ({ recipient, fullName, clinicName, rejectionReason }) => {
  const safeRecipient = String(recipient || '').trim().toLowerCase()
  const safeName = String(fullName || 'there').trim() || 'there'
  const safeClinicName = String(clinicName || '').trim() || 'your clinic'
  const safeReason = String(rejectionReason || '').trim() || 'Please review your submission and try again.'
  const loginUrl = `${String(frontendBaseUrl || '').replace(/\/$/, '')}/login`
  const registerUrl = `${String(frontendBaseUrl || '').replace(/\/$/, '')}/register`
  const displayName = escapeHtml(safeName)
  const clinicLabel = escapeHtml(safeClinicName)
  const reasonLabel = escapeHtml(safeReason)
  const loginLink = escapeHtml(loginUrl)
  const registerLink = escapeHtml(registerUrl)
  const recipientLabel = escapeHtml(safeRecipient)

  return {
    to: safeRecipient,
    from: senderEmail,
    subject: 'Update on your AesthetiCare registration',
    text:
      `Hi ${safeName},\n\n` +
      `Thank you for applying to join AesthetiCare.\n\n` +
      `After reviewing ${safeClinicName}, we’re unable to approve the registration at this time.\n\n` +
      `Reason: ${safeReason}\n\n` +
      `You may submit a new application again once the required details are ready.\n` +
      `Login page: ${loginUrl}\n` +
      `Registration page: ${registerUrl}\n\n` +
      `If you have questions, please contact AesthetiCare support.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.7;color:#2a1408;background:#fffaf3;padding:28px;border:1px solid #e6c79b;border-radius:20px;max-width:640px;margin:0 auto;">
        <div style="text-transform:uppercase;letter-spacing:0.16em;font-size:12px;color:#9b5f10;font-weight:700;margin-bottom:10px;">AesthetiCare</div>
        <h1 style="margin:0 0 14px;font-size:26px;color:#5d3412;">Hello, ${displayName}.</h1>
        <p style="margin:0 0 12px;">Thank you for submitting <strong>${clinicLabel}</strong> for review.</p>
        <p style="margin:0 0 12px;">After carefully reviewing your application, we’re unable to approve it at this time.</p>
        <div style="margin:18px 0;padding:16px 18px;border-radius:16px;background:#fff;border:1px solid #efd3a2;">
          <p style="margin:0 0 6px;font-weight:700;color:#7a4714;">Reviewer note</p>
          <p style="margin:0;color:#5d3412;">${reasonLabel}</p>
        </div>
        <p style="margin:0 0 12px;">You’re welcome to review the details and submit a new application when you’re ready.</p>
        <p style="margin:0 0 18px;"><strong>Email:</strong> ${recipientLabel}</p>
        <p style="margin:0 0 18px;">
          <a href="${registerLink}" style="display:inline-block;background:#bb7a18;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:700;margin-right:10px;">Apply Again</a>
          <a href="${loginLink}" style="display:inline-block;background:#fff;color:#bb7a18;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:700;border:1px solid #bb7a18;">Go to Login</a>
        </p>
        <p style="margin:0;color:#6a4b25;">If you’d like help understanding the feedback, please contact AesthetiCare support.</p>
      </div>
    `,
  }
}

const requireAuth = async (req, res, next) => {
  if (!adminReady) {
    return res.status(500).json({
      success: false,
      error: adminInitError || 'firebase-admin is not ready',
    })
  }
  const authHeader = String(req.headers?.authorization || '').trim()
  const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i)
  if (!tokenMatch) {
    return res.status(401).json({
      success: false,
      error: 'Missing authorization token',
    })
  }
  try {
    const decoded = await admin.auth().verifyIdToken(tokenMatch[1])
    req.user = decoded
    return next()
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid authorization token',
    })
  }
}

const optionalAuth = async (req, res, next) => {
  if (!adminReady) {
    return res.status(500).json({
      success: false,
      error: adminInitError || 'firebase-admin is not ready',
    })
  }
  const authHeader = String(req.headers?.authorization || '').trim()
  const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i)
  if (!tokenMatch) {
    return next()
  }
  try {
    const decoded = await admin.auth().verifyIdToken(tokenMatch[1])
    req.user = decoded
    return next()
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid authorization token',
    })
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
    const allowed = roles.map((r) => String(r).trim().toLowerCase())
    if (!allowed.includes(role)) {
      return res.status(403).json({ success: false, error: 'Forbidden' })
    }
    return next()
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to verify role' })
  }
}

const normalizeRoleKey = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const compact = raw.toLowerCase().replace(/[\s_-]+/g, '')
  if (compact === 'clinicadmin' || compact === 'clinicadministrator') return 'Owner'
  if (compact === 'superadmin' || compact === 'systemadmin' || compact === 'sysadmin') return 'Superadmin'
  if (compact === 'hr') return 'HR'
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

const loadUserContext = async (uid) => {
  const firestore = admin.firestore()
  const userSnap = await firestore.collection('users').doc(uid).get()
  const userData = userSnap.exists ? userSnap.data() || {} : {}
  const roleKey = normalizeRoleKey(userData.role || userData.userType || '')
  let rolePermissions = []
  if (roleKey) {
    const roleSnap = await firestore.collection('rolePermissions').doc(roleKey).get()
    const roleData = roleSnap.exists ? roleSnap.data() || {} : {}
    rolePermissions = Array.isArray(roleData.permissions) ? roleData.permissions : []
  }
  const userPermissions = Array.isArray(userData.permissions) ? userData.permissions : []
  return {
    uid,
    roleKey,
    userData,
    permissions: new Set([...userPermissions, ...rolePermissions]),
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
    }
    const allowed = req.userContext.permissions.has(permission)
    if (!allowed) {
      return res.status(403).json({ success: false, error: 'Forbidden' })
    }
    return next()
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to verify permission' })
  }
}

const BOOKING_RESERVATIONS_COLLECTION = 'bookingReservations'
const BOOKING_LOCKS_COLLECTION = 'bookingLocks'
const BOOKING_RESERVATION_TTL_MINUTES = Math.max(5, Number(process.env.BOOKING_RESERVATION_TTL_MINUTES || 15))
const BOOKING_BLOCKING_STATUSES = new Set([
  'scheduled',
  'approved',
  'paid',
  'completed',
  'in progress',
  'ongoing',
  'held',
])

const getBookingLockDocId = (branchId, practitionerId, date) =>
  [branchId, practitionerId, date]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join('__')

const getBookingLockRef = (firestore, branchId, practitionerId, date) =>
  (() => {
    const docId = getBookingLockDocId(branchId, practitionerId, date)
    return docId ? firestore.collection(BOOKING_LOCKS_COLLECTION).doc(docId) : null
  })()

const parseClockToMinutes = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return null

  const hhmm = raw.match(/^(\d{1,2}):(\d{2})$/)
  if (hhmm) {
    const hour = Number(hhmm[1])
    const minute = Number(hhmm[2])
    if (Number.isNaN(hour) || Number.isNaN(minute)) return null
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
    return hour * 60 + minute
  }

  const ampm = raw.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/)
  if (!ampm) return null

  let hour = Number(ampm[1])
  const minute = Number(ampm[2])
  const marker = ampm[3].toUpperCase()
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null
  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null
  if (marker === 'PM' && hour !== 12) hour += 12
  if (marker === 'AM' && hour === 12) hour = 0
  return hour * 60 + minute
}

const normalizeBookingStatus = (value) => String(value || '').trim().toLowerCase()

const getMinutesFromData = (value, fallback = 60) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const getBookingRange = (data = {}) => {
  const start = parseClockToMinutes(data.time)
  if (start === null) return null
  const end = parseClockToMinutes(data.endTime)
  const durationMinutes = getMinutesFromData(
    data.totalServiceDurationMinutes ||
    data.consultationForServiceDurationMinutes ||
    data.durationMinutes ||
    data.bookingDurationMinutes,
    60
  )
  let normalizedEnd = end !== null && end > start ? end : start + durationMinutes
  if (normalizedEnd <= start) {
    normalizedEnd = start + durationMinutes
  }
  return { start, end: normalizedEnd }
}

const rangesOverlap = (leftStart, leftEnd, rightStart, rightEnd) =>
  leftStart < rightEnd && leftEnd > rightStart

const toMillis = (value) => {
  if (!value) return 0
  if (typeof value.toMillis === 'function') return value.toMillis()
  if (typeof value.toDate === 'function') return value.toDate().getTime()
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'number') return value
  const parsed = Date.parse(String(value))
  return Number.isNaN(parsed) ? 0 : parsed
}

const buildBookingAppointmentPayload = ({
  reservation,
  paymongo,
  paymentMethodType,
  paymentMethod,
}) => {
  const flowType = String(reservation.flowType || 'booking').trim().toLowerCase()
  const selectedServices = Array.isArray(reservation.selectedServices) ? reservation.selectedServices : []
  const serviceNames = selectedServices.map((service) => String(service?.title || service?.name || '').trim()).filter(Boolean)
  const serviceIds = Array.isArray(reservation.selectedServiceIds) ? reservation.selectedServiceIds.filter(Boolean) : []
  const serviceDurations = Array.isArray(reservation.serviceDurations) ? reservation.serviceDurations.map((value) => Number(value || 0)).filter((value) => value > 0) : []
  const totalServiceDurationMinutes = Number(reservation.totalServiceDurationMinutes || serviceDurations.reduce((sum, value) => sum + value, 0) || 0)
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

const zipJsonBuffer = async (jsonBuffer, fileBaseName) => {
  const archive = archiver('zip', { zlib: { level: 9 } })
  const stream = new PassThrough()
  const chunks = []

  stream.on('data', (chunk) => chunks.push(chunk))

  const finalizePromise = new Promise((resolve, reject) => {
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
    archive.on('error', reject)
  })

  archive.pipe(stream)
  archive.append(jsonBuffer, { name: `${fileBaseName}.json` })
  archive.finalize()

  return finalizePromise
}

const buildBackupPayload = async (firestore, ownerId) => {
  const clinicsSnapshot = await firestore.collection('clinics').where('ownerId', '==', ownerId).get()
  const clinics = clinicsSnapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
  const branchIds = clinics.map((clinic) => clinic.id)

  const chunkArray = (items, size) => {
    const chunks = []
    for (let i = 0; i < items.length; i += size) {
      chunks.push(items.slice(i, i + size))
    }
    return chunks
  }

  const fetchByBranches = async (collectionName, extraFilter = null) => {
    if (!branchIds.length) return []
    const chunks = chunkArray(branchIds, 10)
    const results = []
    for (const chunk of chunks) {
      let queryRef = firestore.collection(collectionName).where('branchId', 'in', chunk)
      if (extraFilter) {
        queryRef = queryRef.where(extraFilter.field, extraFilter.op, extraFilter.value)
      }
      const snap = await queryRef.get()
      snap.forEach((docSnap) => results.push({ id: docSnap.id, ...docSnap.data() }))
    }
    return results
  }

  const [ownerSnap, staffUsers, clients, appointments, transactions, attendance, payrolls, inventoryItems, suppliers, purchaseRequests, productServicePosts, reviews, messages] =
    await Promise.all([
      firestore.collection('users').doc(ownerId).get(),
      fetchByBranches('users', { field: 'userType', op: '==', value: 'Staff' }),
      fetchByBranches('clients'),
      fetchByBranches('appointments'),
      fetchByBranches('transactions'),
      fetchByBranches('attendance'),
      fetchByBranches('payrolls'),
      fetchByBranches('inventoryItems'),
      fetchByBranches('suppliers'),
      fetchByBranches('purchaseRequests'),
      fetchByBranches('productServicePosts'),
      fetchByBranches('reviews'),
      fetchByBranches('messages'),
    ])

  const ownerData = ownerSnap.exists ? ownerSnap.data() : {}
  return {
    ownerId,
    generatedAt: new Date().toISOString(),
    owner: ownerData,
    clinics,
    collections: {
      users: staffUsers,
      clients,
      appointments,
      transactions,
      attendance,
      payrolls,
      inventoryItems,
      suppliers,
      purchaseRequests,
      productServicePosts,
      reviews,
      messages,
    },
  }
}

const pruneOldBackups = async (firestore, bucket, ownerId) => {
  const cutoffDaily = new Date(Date.now() - backupDailyRetentionDays * 24 * 60 * 60 * 1000)
  const cutoffMonthly = new Date(Date.now() - backupMonthlyRetentionDays * 24 * 60 * 60 * 1000)
  const backupsSnap = await firestore.collection('backups').where('ownerId', '==', ownerId).get()

  const deletions = []
  backupsSnap.forEach((docSnap) => {
    const data = docSnap.data() || {}
    const createdAt = data.createdAt?.toDate?.() || null
    const kind = String(data.kind || '').toLowerCase()
    const shouldDelete =
      (kind === 'daily' && createdAt && createdAt < cutoffDaily) ||
      (kind === 'monthly' && createdAt && createdAt < cutoffMonthly)

    if (!shouldDelete) return
    const storagePath = data.storagePath
    if (storagePath) {
      deletions.push(bucket.file(storagePath).delete({ ignoreNotFound: true }))
    }
    deletions.push(docSnap.ref.delete())
  })

  if (deletions.length) {
    await Promise.all(deletions)
  }
}

const generateOwnerBackup = async ({ ownerId, kind = 'manual', triggeredBy = 'system' }) => {
  const firestore = admin.firestore()
  const bucketName = firebaseStorageBucket || admin.app().options.storageBucket
  if (!bucketName) {
    throw new Error('Firebase Storage bucket is not configured.')
  }
  const bucket = admin.storage().bucket(bucketName)
  const backupPayload = await buildBackupPayload(firestore, ownerId)

  const backupJson = JSON.stringify(backupPayload, null, 2)
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const fileName = `backup-${timestamp}.json`
  const storagePath = `backups/${ownerId}/${timestamp}/${fileName}`
  const file = bucket.file(storagePath)
  await file.save(backupJson, {
    contentType: 'application/json',
    resumable: false,
  })

  const backupDoc = {
    ownerId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    status: 'complete',
    size: Buffer.byteLength(backupJson, 'utf8'),
    storagePath,
    fileName,
    kind,
    triggeredBy,
  }
  await firestore.collection('backups').add(backupDoc)
  await pruneOldBackups(firestore, bucket, ownerId)

  return { storagePath, fileName }
}

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'otp-backend',
    port: PORT,
    sendgridConfigured: Boolean(sendGridApiKey && senderEmail),
    paymongoConfigured: Boolean(payMongoSecretKey),
    googleMeetConfigured: isGoogleMeetConfigured(),
    firebaseAdminConfigured: adminReady,
    firebaseAdminError: adminReady ? null : adminInitError,
  })
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
  } = req.body ?? {}

  const cleanSummary = String(summary || '').trim()
  const cleanDescription = String(description || '').trim()
  const cleanStart = String(startDateTime || '').trim()
  const cleanEnd = String(endDateTime || '').trim()
  const cleanTimezone = String(timezone || googleMeetDefaultTimezone).trim() || googleMeetDefaultTimezone

  if (!cleanSummary || !cleanStart || !cleanEnd) {
    return res.status(400).json({
      success: false,
      error: 'summary, startDateTime, and endDateTime are required',
    })
  }

  const attendees = Array.isArray(attendeeEmails)
    ? attendeeEmails
        .map((email) => String(email || '').trim())
        .filter(Boolean)
        .map((email) => ({ email }))
    : []

  const eventPayload = {
    summary: cleanSummary,
    description: cleanDescription,
    start: { dateTime: cleanStart, timeZone: cleanTimezone },
    end: { dateTime: cleanEnd, timeZone: cleanTimezone },
    attendees,
    conferenceData: {
      createRequest: {
        requestId:
          String(requestId || '').trim() ||
          `meet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
  }

  try {
    const calendar = getGoogleCalendarClient()
    const response = await calendar.events.insert({
      calendarId: googleCalendarId,
      conferenceDataVersion: 1,
      sendUpdates: 'none',
      requestBody: eventPayload,
    })

    const data = response?.data || {}
    const entryPoints = data?.conferenceData?.entryPoints || []
    const meetEntry = entryPoints.find((item) => item?.entryPointType === 'video')
    const meetLink = data?.hangoutLink || meetEntry?.uri || ''

    if (!meetLink) {
      return res.status(500).json({
        success: false,
        error: 'Google Meet link was not returned by Google Calendar API',
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
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to create Google Meet link',
    })
  }
})

app.post('/admin/reject-clinic-registration', requireAuth, requireRole(['superadmin']), async (req, res) => {

  const uid = String(req.body?.uid || '').trim()
  const rejectionReason = String(req.body?.rejectionReason || '').trim()
  const reviewedBy = String(req.body?.reviewedBy || '').trim() || null

  if (!uid) {
    return res.status(400).json({
      success: false,
      error: 'uid is required',
    })
  }

  if (!rejectionReason) {
    return res.status(400).json({
      success: false,
      error: 'rejectionReason is required',
    })
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
        const message = buildClinicRejectionEmailMessage({
          recipient,
          fullName,
          clinicName,
          rejectionReason,
        })
        await sendSendGridMessage(message)
      } catch (emailError) {
        console.error('Failed to send clinic rejection email:', emailError?.response?.body?.errors?.[0]?.message || emailError?.message || emailError)
      }
    }

    // Write rejection audit fields first, then hard delete docs.
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

    await Promise.all([
      userRef.delete(),
      clinicRef.delete(),
    ])

    try {
      await admin.auth().deleteUser(uid)
    } catch (authError) {
      if (authError?.code !== 'auth/user-not-found') {
        throw authError
      }
    }

    return res.json({
      success: true,
      data: { uid, deleted: true },
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to reject and delete account',
    })
  }
})

app.post(OTP_PATH, async (req, res) => {
  try {
    const { recipient, otp } = req.body ?? {}
    const normalizedRecipient = String(recipient || '').trim()
    const normalizedOtp = String(otp || '').trim()

    if (!normalizedRecipient || !normalizedOtp) {
      return res.status(400).json({
        success: false,
        error: 'recipient and otp are required',
      })
    }

    if (!sendGridApiKey || !senderEmail) {
      if (isDevelopment) {
        console.warn(`[DEV OTP BYPASS] Missing SendGrid config. OTP for ${normalizedRecipient}: ${normalizedOtp}`)
        return res.json({ success: true, devMode: true })
      }
      return res.status(500).json({
        success: false,
        error: 'SENDGRID_API_KEY or SENDGRID_SENDER is missing',
      })
    }

    const message = {
      to: normalizedRecipient,
      from: senderEmail,
      subject: 'Your OTP Code',
      text: `Your one-time password is: ${normalizedOtp}`,
      html: `<strong>Your OTP code is: ${normalizedOtp}</strong>`,
    }

    try {
      await sgMail.send(message)
      return res.json({ success: true })
    } catch (error) {
      const providerMessage =
        error?.response?.body?.errors?.[0]?.message ||
        error?.response?.body?.errors?.[0]?.field ||
        error?.message ||
        'Unknown SendGrid error'

      console.error('SendGrid error:', providerMessage)
      if (isDevelopment) {
        console.warn(`[DEV OTP BYPASS] SendGrid failed. OTP for ${normalizedRecipient}: ${normalizedOtp}`)
        return res.json({ success: true, devMode: true, warning: providerMessage })
      }
      return res.status(500).json({ success: false, error: providerMessage })
    }
  } catch (error) {
    const unexpectedMessage = error?.message || 'Unexpected OTP route error'
    console.error('OTP route error:', unexpectedMessage)
    if (isDevelopment) {
      const safeRecipient = String(req.body?.recipient || '').trim()
      const safeOtp = String(req.body?.otp || '').trim()
      if (safeRecipient && safeOtp) {
        console.warn(`[DEV OTP BYPASS] Route-level failure. OTP for ${safeRecipient}: ${safeOtp}`)
        return res.json({ success: true, devMode: true, warning: unexpectedMessage })
      }
    }
    return res.status(500).json({ success: false, error: unexpectedMessage })
  }
})

app.post(RESET_PASSWORD_PATH, async (req, res) => {
  const { email, newPassword } = req.body ?? {}

  if (!adminReady) {
    return res.status(500).json({
      success: false,
      error: adminInitError || 'firebase-admin is not ready',
    })
  }

  const normalizedEmail = String(email || '').trim().toLowerCase()
  const passwordValue = String(newPassword || '')

  if (!normalizedEmail || !passwordValue) {
    return res.status(400).json({
      success: false,
      error: 'email and newPassword are required',
    })
  }

  if (passwordValue.length < 8) {
    return res.status(400).json({
      success: false,
      error: 'Password must be at least 8 characters.',
    })
  }

  try {
    const userRecord = await admin.auth().getUserByEmail(normalizedEmail)
    await admin.auth().updateUser(userRecord.uid, { password: passwordValue })
    return res.json({ success: true })
  } catch (error) {
    const code = error?.code || ''
    const message =
      code === 'auth/user-not-found'
        ? 'No account found with this email.'
        : error?.message || 'Failed to reset password.'
    return res.status(400).json({ success: false, error: message, code })
  }
})

app.post(CHECK_USER_PATH, async (req, res) => {
  const { email } = req.body ?? {}

  if (!adminReady) {
    return res.status(500).json({
      success: false,
      error: adminInitError || 'firebase-admin is not ready',
    })
  }

  const normalizedEmail = String(email || '').trim().toLowerCase()
  if (!normalizedEmail) {
    return res.status(400).json({
      success: false,
      error: 'email is required',
    })
  }

  try {
    const userRecord = await admin.auth().getUserByEmail(normalizedEmail)
    return res.json({ success: true, exists: true, uid: userRecord.uid })
  } catch (error) {
    const code = error?.code || ''
    if (code === 'auth/user-not-found') {
      return res.json({ success: true, exists: false })
    }
    return res.status(400).json({
      success: false,
      error: error?.message || 'Failed to check user.',
      code,
    })
  }
})

app.post('/auth/check-registration-status', async (req, res) => {
  const { email } = req.body ?? {}

  if (!adminReady) {
    return res.status(500).json({
      success: false,
      error: adminInitError || 'firebase-admin is not ready',
    })
  }

  const normalizedEmail = String(email || '').trim().toLowerCase()
  if (!normalizedEmail) {
    return res.status(400).json({
      success: false,
      error: 'email is required',
    })
  }

  try {
    const userRecord = await admin.auth().getUserByEmail(normalizedEmail)
    const uid = userRecord.uid
    const firestore = admin.firestore()
    const [userSnap, clinicSnap] = await Promise.all([
      firestore.collection('users').doc(uid).get(),
      firestore.collection('clinics').doc(uid).get(),
    ])

    const userData = userSnap.data() || {}
    const clinicData = clinicSnap.data() || {}
    const userStatus = String(userData.status || '').toLowerCase()
    const clinicStatus = String(clinicData.approvalStatus || '').toLowerCase()
    const businessType =
      String(userData.businessType || clinicData.businessType || '').trim()

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

  if (!adminReady) {
    return res.status(500).json({
      success: false,
      error: adminInitError || 'firebase-admin is not ready',
    })
  }

  const normalizedEmail = String(email || '').trim().toLowerCase()
  const normalizedUid = String(uid || '').trim()
  if (!normalizedEmail || !normalizedUid) {
    return res.status(400).json({
      success: false,
      error: 'uid and email are required',
    })
  }

  try {
    const userRecord = await admin.auth().getUser(normalizedUid)
    const recordEmail = String(userRecord?.email || '').trim().toLowerCase()
    if (recordEmail && recordEmail !== normalizedEmail) {
      return res.status(403).json({
        success: false,
        error: 'Email does not match user record',
      })
    }

    const firestore = admin.firestore()
    await Promise.all([
      firestore.collection('users').doc(normalizedUid).update({
        status: 'Pending Document Submission',
        emailVerified: true,
        emailVerifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      }),
      firestore.collection('clinics').doc(normalizedUid).update({
        approvalStatus: 'Pending Document Submission',
      }),
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
  const { email } = req.body ?? {}

  if (!adminReady) {
    return res.status(500).json({
      success: false,
      error: adminInitError || 'firebase-admin is not ready',
    })
  }

  const normalizedEmail = String(email || '').trim().toLowerCase()
  if (!normalizedEmail) {
    return res.status(400).json({
      success: false,
      error: 'email is required',
    })
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

app.post('/admin/unpublish-expired-clinics', requireAuth, requireRole(['superadmin']), async (req, res) => {

  const ownerId = String(req.body?.ownerId || '').trim()
  const firestore = admin.firestore()
  const now = new Date()

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

  try {
    const clinicsRef = firestore.collection('clinics')
    const clinicsSnapshot = ownerId
      ? await clinicsRef.where('ownerId', '==', ownerId).get()
      : await clinicsRef.get()

    if (clinicsSnapshot.empty) {
      return res.json({ success: true, updated: 0 })
    }

    const updates = []
    clinicsSnapshot.forEach((docSnap) => {
      const data = docSnap.data() || {}
      if (data.isPublished !== true) return
      const expiresAt = toDate(data.subscriptionExpiresAt)
      if (!expiresAt) return
      if (now.getTime() <= expiresAt.getTime()) return
      updates.push(
        docSnap.ref.update({
          isPublished: false,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        })
      )
    })

    if (!updates.length) {
      return res.json({ success: true, updated: 0 })
    }

    await Promise.all(updates)
    return res.json({ success: true, updated: updates.length })
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to unpublish expired clinics',
    })
  }
})

app.post('/owner/backup', requireAuth, requirePermission('backups:create'), async (req, res) => {

  const ownerId = String(req.body?.ownerId || '').trim()
  if (!ownerId) {
    return res.status(400).json({
      success: false,
      error: 'ownerId is required',
    })
  }

  try {
    if (!req.user?.uid || req.user.uid !== ownerId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized backup request',
      })
    }

    const result = await generateOwnerBackup({ ownerId, kind: 'manual', triggeredBy: 'owner' })
    return res.json({ success: true, data: result })
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to generate backup',
    })
  }
})

app.post('/owner/backup/zip', requireAuth, requirePermission('backups:view'), async (req, res) => {

  const ownerId = String(req.body?.ownerId || '').trim()
  const storagePath = String(req.body?.storagePath || '').trim()
  const fileName = String(req.body?.fileName || 'backup').trim().replace(/\.json$/i, '')

  if (!ownerId || !storagePath) {
    return res.status(400).json({
      success: false,
      error: 'ownerId and storagePath are required',
    })
  }

  if (!storagePath.startsWith(`backups/${ownerId}/`)) {
    return res.status(403).json({
      success: false,
      error: 'Unauthorized backup path',
    })
  }

  try {
    if (!req.user?.uid || req.user.uid !== ownerId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized backup request',
      })
    }

    const bucketName = firebaseStorageBucket || admin.app().options.storageBucket
    if (!bucketName) {
      return res.status(500).json({
        success: false,
        error: 'Firebase Storage bucket is not configured.',
      })
    }

    const bucket = admin.storage().bucket(bucketName)
    const [jsonBuffer] = await bucket.file(storagePath).download()
    const zipBuffer = await zipJsonBuffer(jsonBuffer, fileName)

    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}.zip"`)
    return res.status(200).send(zipBuffer)
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to generate ZIP backup',
    })
  }
})


if (backupScheduleEnabled && adminReady) {
  let lastDailyKey = ''
  let lastMonthlyKey = ''

  const toKey = (date) => date.toISOString().slice(0, 10)
  const toMonthKey = (date) => date.toISOString().slice(0, 7)

  const runScheduledBackups = async () => {
    const now = new Date()
    const hour = now.getHours()
    const day = now.getDate()
    const dailyKey = toKey(now)
    const monthlyKey = toMonthKey(now)

    const shouldRunDaily = hour === backupDailyHour && lastDailyKey !== dailyKey
    const shouldRunMonthly = hour === backupDailyHour && day === backupMonthlyDay && lastMonthlyKey !== monthlyKey

    if (!shouldRunDaily && !shouldRunMonthly) return

    try {
      const firestore = admin.firestore()
      const ownerIds = new Set()
      const ownersSnap = await firestore.collection('users').where('role', '==', 'Owner').get()
      ownersSnap.forEach((docSnap) => ownerIds.add(docSnap.id))
      const clinicsSnap = await firestore.collection('clinics').get()
      clinicsSnap.forEach((docSnap) => {
        const ownerId = docSnap.data()?.ownerId
        if (ownerId) ownerIds.add(ownerId)
      })

      const tasks = []
      ownerIds.forEach((ownerId) => {
        if (shouldRunDaily) tasks.push(generateOwnerBackup({ ownerId, kind: 'daily', triggeredBy: 'system' }))
        if (shouldRunMonthly) tasks.push(generateOwnerBackup({ ownerId, kind: 'monthly', triggeredBy: 'system' }))
      })

      if (tasks.length) {
        await Promise.allSettled(tasks)
      }
      if (shouldRunDaily) lastDailyKey = dailyKey
      if (shouldRunMonthly) lastMonthlyKey = monthlyKey
      console.log('Scheduled backups completed', { daily: shouldRunDaily, monthly: shouldRunMonthly })
    } catch (error) {
      console.error('Scheduled backup error:', error?.message || error)
    }
  }

  setInterval(runScheduledBackups, 15 * 60 * 1000)
  runScheduledBackups().catch(() => {})
}

app.post(ATTENDANCE_PIN_PATH, requireAuth, requirePermission('staff:create'), async (req, res) => {
  const { recipient, attendancePin, fullName } = req.body ?? {}

  if (!recipient || !attendancePin) {
    return res.status(400).json({
      success: false,
      error: 'recipient and attendancePin are required',
    })
  }

  if (!sendGridApiKey || !senderEmail) {
    return res.status(500).json({
      success: false,
      error: 'SENDGRID_API_KEY or SENDGRID_SENDER is missing',
    })
  }

  const safeName = String(fullName || 'Staff').trim() || 'Staff'
  const safePin = String(attendancePin || '').trim()

  const message = {
    to: recipient,
    from: senderEmail,
    subject: 'Your Attendance PIN (Do Not Share)',
    text:
      `Hi ${safeName},\n\n` +
      `Your attendance PIN is: ${safePin}\n\n` +
      `Do not share this PIN with anyone. You will use it for attendance as verification that you are the person who says you are.\n\n` +
      `If you did not expect this email, please contact your administrator.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#2a1408;">
        <p>Hi ${safeName},</p>
        <p>Your attendance PIN is:</p>
        <p style="font-size:22px;font-weight:700;letter-spacing:2px;">${safePin}</p>
        <p><strong>Do not share this PIN with anyone.</strong> You will use it for attendance as verification that you are the person who says you are.</p>
        <p>If you did not expect this email, please contact your administrator.</p>
      </div>
    `,
  }

  try {
    const [response] = await sgMail.send(message)
    const messageId = response?.headers?.['x-message-id'] || response?.headers?.['X-Message-Id']
    console.log('SendGrid OTP sent', {
      status: response?.statusCode,
      messageId: messageId || 'unknown',
      to: recipient,
    })
    return res.json({ success: true, messageId: messageId || null })
  } catch (error) {
    const providerMessage =
      error?.response?.body?.errors?.[0]?.message ||
      error?.message ||
      'Unknown SendGrid error'

    console.error('SendGrid error:', providerMessage)
    return res.status(500).json({ success: false, error: providerMessage })
  }
})

const dispatchWelcomeEmail = async ({ recipient, fullName, accountType = 'customer', defaultPassword = '' }) => {
  const normalizedRecipient = String(recipient || '').trim().toLowerCase()
  const safeName = String(fullName || '').trim() || 'there'

  if (!normalizedRecipient) {
    return {
      ok: false,
      status: 400,
      error: 'recipient is required',
    }
  }

  if (!sendGridApiKey || !senderEmail) {
    if (isDevelopment) {
      console.warn(`[DEV WELCOME EMAIL BYPASS] Welcome email not sent to ${normalizedRecipient}.`)
      return {
        ok: true,
        devMode: true,
      }
    }
    return {
      ok: false,
      status: 500,
      error: 'SENDGRID_API_KEY or SENDGRID_SENDER is missing',
    }
  }

  const message = buildWelcomeEmailMessage({
    recipient: normalizedRecipient,
    fullName: safeName,
    accountType,
    defaultPassword,
  })

  try {
    const delivery = await sendSendGridMessage(message)
    return { ok: true, ...delivery }
  } catch (error) {
    const providerMessage =
      error?.response?.body?.errors?.[0]?.message ||
      error?.message ||
      'Unknown SendGrid error'
    return {
      ok: false,
      status: 500,
      error: providerMessage,
    }
  }
}

app.post('/send-account-welcome', requireAuth, async (req, res) => {
  const { recipient, fullName, accountType } = req.body ?? {}
  const normalizedRecipient = String(recipient || '').trim().toLowerCase()
  const signedInEmail = String(req.user?.email || '').trim().toLowerCase()

  if (!normalizedRecipient || !signedInEmail) {
    return res.status(400).json({
      success: false,
      error: 'recipient is required',
    })
  }

  if (normalizedRecipient !== signedInEmail) {
    return res.status(403).json({
      success: false,
      error: 'You can only request a welcome email for your own account.',
    })
  }

  const result = await dispatchWelcomeEmail({
    recipient: normalizedRecipient,
    fullName,
    accountType,
  })

  if (!result.ok) {
    if (isDevelopment && result.devMode) {
      return res.json({ success: true, devMode: true })
    }
    return res.status(result.status || 500).json({
      success: false,
      error: result.error || 'Failed to send welcome email',
    })
  }

  return res.json({ success: true, statusCode: result.statusCode || null, messageId: result.messageId || null })
})

app.post(STAFF_WELCOME_PATH, requireAuth, requirePermission('staff:create'), async (req, res) => {
  const { recipient, fullName, defaultPassword } = req.body ?? {}
  const normalizedRecipient = String(recipient || '').trim().toLowerCase()

  if (!normalizedRecipient || !String(defaultPassword || '').trim()) {
    return res.status(400).json({
      success: false,
      error: 'recipient and defaultPassword are required',
    })
  }

  const result = await dispatchWelcomeEmail({
    recipient: normalizedRecipient,
    fullName,
    accountType: 'staff',
    defaultPassword,
  })

  if (!result.ok) {
    if (isDevelopment && result.devMode) {
      return res.json({ success: true, devMode: true })
    }
    return res.status(result.status || 500).json({
      success: false,
      error: result.error || 'Failed to send welcome email',
    })
  }

  return res.json({ success: true, statusCode: result.statusCode || null, messageId: result.messageId || null })
})

app.post('/send-payment-receipt', async (req, res) => {
  const { recipient, payerName, planName, amount, currency, referenceNumber, paymentMethod } = req.body ?? {}

  if (!recipient) {
    return res.status(400).json({
      success: false,
      error: 'recipient is required',
    })
  }

  if (!sendGridApiKey || !senderEmail) {
    return res.status(500).json({
      success: false,
      error: 'SENDGRID_API_KEY or SENDGRID_SENDER is missing',
    })
  }

  const safeRecipient = String(recipient || '').trim().toLowerCase()
  const safeName = String(payerName || 'Customer').trim() || 'Customer'
  const safePlan = String(planName || 'Subscription').trim() || 'Subscription'
  const safeAmount = Number(amount || 0)
  const safeCurrency = String(currency || 'PHP').trim() || 'PHP'
  const safeReference = String(referenceNumber || '').trim()
  const safeMethod = String(paymentMethod || '').trim()

  const formatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: safeCurrency })
  const amountLabel = formatter.format(safeAmount)

  const message = {
    to: safeRecipient,
    from: senderEmail,
    subject: 'Subscription Payment सफल',
    text:
      `Hi ${safeName},\n\n` +
      `Your payment was successful.\n` +
      `Plan: ${safePlan}\n` +
      `Amount: ${amountLabel}\n` +
      `${safeMethod ? `Payment Method: ${safeMethod}\n` : ''}` +
      `${safeReference ? `Reference: ${safeReference}\n` : ''}` +
      `\nThank you for subscribing to AesthetiCare.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#2a1408;">
        <h2 style="margin:0 0 12px;">Payment Successful</h2>
        <p>Hi ${safeName},</p>
        <p>Your subscription payment was successful.</p>
        <table style="border-collapse:collapse;margin-top:12px;">
          <tr><td style="padding:4px 12px 4px 0;"><strong>Plan</strong></td><td>${safePlan}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;"><strong>Amount</strong></td><td>${amountLabel}</td></tr>
          ${safeMethod ? `<tr><td style="padding:4px 12px 4px 0;"><strong>Payment Method</strong></td><td>${safeMethod}</td></tr>` : ''}
          ${safeReference ? `<tr><td style="padding:4px 12px 4px 0;"><strong>Reference</strong></td><td>${safeReference}</td></tr>` : ''}
        </table>
        <p style="margin-top:16px;">Thank you for subscribing to AesthetiCare.</p>
      </div>
    `,
  }

  try {
    await sgMail.send(message)
    return res.json({ success: true })
  } catch (error) {
    const providerMessage =
      error?.response?.body?.errors?.[0]?.message ||
      error?.message ||
      'Unknown SendGrid error'
    console.error('SendGrid error:', providerMessage)
    return res.status(500).json({ success: false, error: providerMessage })
  }
})

app.post('/appointments/reservations', requireAuth, async (req, res) => {
  if (!adminReady) {
    return res.status(500).json({
      success: false,
      error: adminInitError || 'firebase-admin is not ready',
    })
  }

  const body = req.body || {}
  const branchId = String(body.branchId || '').trim()
  const centerId = String(body.centerId || branchId || '').trim()
  const customerId = String(body.customerId || '').trim()
  const customerName = String(body.customerName || '').trim()
  const customerEmail = String(body.customerEmail || '').trim()
  const practitionerId = String(body.practitionerId || '').trim()
  const practitionerName = String(body.practitionerName || '').trim()
  const date = String(body.date || '').trim()
  const time = String(body.time || '').trim()
  const endTime = String(body.endTime || '').trim()
  const notes = String(body.notes || '').trim()
  const flowType = String(body.flowType || 'booking').trim().toLowerCase()
  const selectedServices = Array.isArray(body.selectedServices) ? body.selectedServices : []
  const selectedServiceIds = Array.isArray(body.selectedServiceIds) ? body.selectedServiceIds.map((value) => String(value || '').trim()).filter(Boolean) : []
  const selectedServiceNames = Array.isArray(body.selectedServiceNames) ? body.selectedServiceNames.map((value) => String(value || '').trim()).filter(Boolean) : []
  const serviceDurations = Array.isArray(body.serviceDurations) ? body.serviceDurations.map((value) => Number(value || 0)).filter((value) => value > 0) : []
  const totalServiceDurationMinutes = Math.max(30, Number(body.totalServiceDurationMinutes || serviceDurations.reduce((sum, value) => sum + value, 0) || 0))
  const consultationFee = Number(body.consultationFee || 0)
  const amount = Number(body.amount || 0)
  const paymentMethod = String(body.paymentMethod || '').trim()
  const paymentCoverage = String(body.paymentCoverage || 'full').trim()
  const commissionPercent = Number(body.commissionPercent || 10)
  const commissionAmount = Number(body.commissionAmount || 0)
  const netAmount = Number(body.netAmount || 0)
  const requiresConsultationFirst = Boolean(body.requiresConsultationFirst)
  const followUpAllowed = Boolean(body.followUpAllowed)
  const followUpWindowDays = body.followUpWindowDays != null ? Number(body.followUpWindowDays) : null

  if (!customerId || !req.user?.uid || customerId !== req.user.uid) {
    return res.status(403).json({ success: false, error: 'Forbidden' })
  }
  if (!branchId || !practitionerId || !date || !time) {
    return res.status(400).json({ success: false, error: 'Missing booking details' })
  }

  const start = parseClockToMinutes(time)
  if (start === null) {
    return res.status(400).json({ success: false, error: 'Invalid booking time' })
  }
  const end = parseClockToMinutes(endTime)
  const normalizedEnd = end !== null && end > start ? end : start + totalServiceDurationMinutes

  const firestore = admin.firestore()
  const reservationsCol = firestore.collection(BOOKING_RESERVATIONS_COLLECTION)
  const reservationRef = reservationsCol.doc()
  const lockRef = getBookingLockRef(firestore, branchId, practitionerId, date)
  const nowMs = Date.now()
  const expiresAt = admin.firestore.Timestamp.fromMillis(nowMs + BOOKING_RESERVATION_TTL_MINUTES * 60 * 1000)
  let responseData = null

  try {
    await firestore.runTransaction(async (transaction) => {
      const lockSnap = await transaction.get(lockRef)
      const lockData = lockSnap.exists ? lockSnap.data() || {} : {}
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

      const existingBlocks = []

      appointmentsSnap.docs.forEach((snap) => {
        const data = snap.data() || {}
        const status = normalizeBookingStatus(data.status)
        if (!BOOKING_BLOCKING_STATUSES.has(status)) return
        const range = getBookingRange(data)
        if (range) existingBlocks.push(range)
      })

      for (const snap of reservationsSnap.docs) {
        const data = snap.data() || {}
        const expiry = toMillis(data.expiresAt)
        const status = normalizeBookingStatus(data.status)
        if (status !== 'held' || expiry <= nowMs) continue
        const range = getBookingRange(data)
        if (!range) continue

        if (
          String(data.customerId || '').trim() === customerId &&
          rangesOverlap(start, normalizedEnd, range.start, range.end)
        ) {
          responseData = {
            id: snap.id,
            expiresAt: expiry ? new Date(expiry).toISOString() : expiresAt.toDate().toISOString(),
            reused: true,
          }
          return
        }

        existingBlocks.push(range)
      }

      const conflictingBlock = existingBlocks.find((range) => rangesOverlap(start, normalizedEnd, range.start, range.end))
      if (conflictingBlock) {
        throw new Error('That schedule was just taken. Please choose another available time.')
      }

      transaction.set(lockRef, {
        branchId,
        practitionerId,
        date,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastReservationAt: admin.firestore.FieldValue.serverTimestamp(),
        reservationCount: Number(lockData.reservationCount || 0) + 1,
      }, { merge: true })

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
        endTime: endTime || '',
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

      responseData = {
        id: reservationRef.id,
        expiresAt: expiresAt.toDate().toISOString(),
        reused: false,
      }
    })

    return res.json({ success: true, data: responseData })
  } catch (error) {
    const message = String(error?.message || '').trim() || 'Failed to reserve the selected time.'
    return res.status(400).json({ success: false, error: message })
  }
})

app.delete('/appointments/reservations/:id', requireAuth, async (req, res) => {
  if (!adminReady) {
    return res.status(500).json({
      success: false,
      error: adminInitError || 'firebase-admin is not ready',
    })
  }

  const reservationId = String(req.params.id || '').trim()
  if (!reservationId) {
    return res.status(400).json({ success: false, error: 'reservation id is required' })
  }

  try {
    const firestore = admin.firestore()
    const reservationRef = firestore.collection(BOOKING_RESERVATIONS_COLLECTION).doc(reservationId)
    await firestore.runTransaction(async (transaction) => {
      const snap = await transaction.get(reservationRef)
      if (!snap.exists) return
      const data = snap.data() || {}
      if (String(data.customerId || '').trim() !== String(req.user?.uid || '').trim()) {
        throw new Error('Forbidden')
      }
      if (normalizeBookingStatus(data.status) === 'consumed') return
      const lockRef = getBookingLockRef(firestore, data.branchId || '', data.practitionerId || '', data.date || '')
      if (lockRef) {
        const lockSnap = await transaction.get(lockRef)
        const lockData = lockSnap.exists ? lockSnap.data() || {} : {}
        transaction.set(lockRef, {
          branchId: String(data.branchId || '').trim(),
          practitionerId: String(data.practitionerId || '').trim(),
          date: String(data.date || '').trim(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          lastReservationReleaseAt: admin.firestore.FieldValue.serverTimestamp(),
          reservationCount: Math.max(0, Number(lockData.reservationCount || 0) - 1),
        }, { merge: true })
      }
      transaction.update(reservationRef, {
        status: 'cancelled',
        cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    })
    return res.json({ success: true })
  } catch (error) {
    if (String(error?.message || '') === 'Forbidden') {
      return res.status(403).json({ success: false, error: 'Forbidden' })
    }
    return res.status(500).json({ success: false, error: error?.message || 'Failed to release reservation' })
  }
})

app.post('/appointments/finalize-booking', requireAuth, async (req, res) => {
  if (!adminReady) {
    return res.status(500).json({
      success: false,
      error: adminInitError || 'firebase-admin is not ready',
    })
  }

  const body = req.body || {}
  const reservationId = String(body.reservationId || '').trim()
  const paymongoCheckoutSessionId = String(body.paymongoCheckoutSessionId || '').trim() || null
  const paymongoStatus = String(body.paymongoStatus || '').trim() || null
  const paymongoPaidAt = body.paymongoPaidAt || null
  const paymongoPaymentId = String(body.paymongoPaymentId || '').trim() || null
  const paymongoPaymentMethodType = String(body.paymongoPaymentMethodType || '').trim() || null
  const paymentMethod = String(body.paymentMethod || '').trim() || null

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
      if (normalizeBookingStatus(reservation.status) === 'consumed') {
        appointmentId = String(reservation.appointmentId || '').trim()
        return
      }
      if (normalizeBookingStatus(reservation.status) !== 'held') {
        throw new Error('This reservation is no longer active.')
      }
      if (toMillis(reservation.expiresAt) <= Date.now()) {
        throw new Error('This reservation has expired. Please book again.')
      }

      const range = getBookingRange(reservation)
      if (!range) {
        throw new Error('Invalid reservation time.')
      }
      const lockRef = getBookingLockRef(
        firestore,
        reservation.branchId || '',
        reservation.practitionerId || '',
        reservation.date || ''
      )
      const lockSnap = lockRef ? await transaction.get(lockRef) : null
      const lockData = lockSnap?.exists ? lockSnap.data() || {} : {}

      const appointmentsSnap = await transaction.get(
        firestore.collection('appointments')
          .where('branchId', '==', String(reservation.branchId || '').trim())
          .where('date', '==', String(reservation.date || '').trim())
          .where('assignedPractitionerId', '==', String(reservation.practitionerId || '').trim())
      )

      appointmentsSnap.docs.forEach((docSnap) => {
        const data = docSnap.data() || {}
        const status = normalizeBookingStatus(data.status)
        if (!BOOKING_BLOCKING_STATUSES.has(status)) return
        const existingRange = getBookingRange(data)
        if (existingRange && rangesOverlap(range.start, range.end, existingRange.start, existingRange.end)) {
          throw new Error('That schedule was just taken. Please choose another available time.')
        }
      })

      if (lockRef) {
        transaction.set(lockRef, {
          branchId: String(reservation.branchId || '').trim(),
          practitionerId: String(reservation.practitionerId || '').trim(),
          date: String(reservation.date || '').trim(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          lastFinalizeAt: admin.firestore.FieldValue.serverTimestamp(),
          reservationCount: Number(lockData.reservationCount || 0),
        }, { merge: true })
      }

      const finalAppointmentRef = firestore.collection('appointments').doc()
      const appointmentPayload = buildBookingAppointmentPayload({
        reservation: {
          ...reservation,
          id: reservationId,
          checkoutSessionId: paymongoCheckoutSessionId,
          paymentMethod: paymentMethod || reservation.paymentMethod || 'GCash',
        },
        paymongo: {
          status: paymongoStatus,
          paid_at: paymongoPaidAt,
          paymentId: paymongoPaymentId,
        },
        paymentMethodType: paymongoPaymentMethodType,
        paymentMethod,
      })

      transaction.set(finalAppointmentRef, appointmentPayload)
      transaction.update(reservationRef, {
        status: 'consumed',
        appointmentId: finalAppointmentRef.id,
        paymongoCheckoutSessionId,
        paymongoStatus,
        paymongoPaidAt,
        paymongoPaymentId,
        paymongoPaymentMethodType,
        consumedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
      appointmentId = finalAppointmentRef.id
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
  const isCustomerBookingCheckout =
    moduleKey === 'customer_appointment' ||
    moduleKey === 'customer_consultation'
  const reservationId = String(metadata?.reservationId || '').trim()
  const totalServiceDurationMinutes = Math.max(
    30,
    Number(metadata?.totalServiceDurationMinutes || metadata?.durationMinutes || 0)
  )

  if (!isSubscriptionCheckout) {
    if (!req.user?.uid) {
      return res.status(401).json({
        success: false,
        error: 'Missing authorization token',
      })
    }
    if (isCustomerOrderCheckout || isCustomerBookingCheckout) {
      const metadataCustomerId = String(metadata?.customerId || '').trim()
      if (!metadataCustomerId || metadataCustomerId !== req.user.uid) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
        })
      }
      if (isCustomerBookingCheckout) {
        if (!reservationId) {
          return res.status(400).json({
            success: false,
            error: 'reservationId is required for customer bookings',
          })
        }
        const firestore = admin.firestore()
        const reservationSnap = await firestore.collection(BOOKING_RESERVATIONS_COLLECTION).doc(reservationId).get()
        if (!reservationSnap.exists) {
          return res.status(404).json({
            success: false,
            error: 'Reservation not found',
          })
        }
        const reservationData = reservationSnap.data() || {}
        if (String(reservationData.customerId || '').trim() !== req.user.uid) {
          return res.status(403).json({
            success: false,
            error: 'Forbidden',
          })
        }
        if (normalizeBookingStatus(reservationData.status) !== 'held' || toMillis(reservationData.expiresAt) <= Date.now()) {
          return res.status(409).json({
            success: false,
            error: 'Reservation is no longer active',
          })
        }
      }
    } else {
      try {
        if (!req.userContext || req.userContext.uid !== req.user.uid) {
          req.userContext = await loadUserContext(req.user.uid)
        }
        if (!req.userContext.permissions.has('payments:create')) {
          return res.status(403).json({
            success: false,
            error: 'Forbidden',
          })
        }
      } catch (error) {
        return res.status(500).json({
          success: false,
          error: 'Failed to verify permission',
        })
      }
    }
  }

  const normalizedAmount = Number(amount || 0)
  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    return res.status(400).json({
      success: false,
      error: 'amount must be a positive number in centavos',
    })
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

  const fallbackLineItem = [
    {
      amount: Math.round(normalizedAmount),
      currency: 'PHP',
      name: description || 'POS Payment',
      quantity: 1,
    },
  ]

  const payload = {
    data: {
      attributes: {
        billing: billing && typeof billing === 'object' ? billing : null,
        send_email_receipt: false,
        show_description: true,
        show_line_items: true,
        description: String(description || 'POS Payment'),
        line_items: Array.isArray(lineItems) && lineItems.length > 0 ? lineItems : fallbackLineItem,
        ...(selectedMethods.length > 0 ? { payment_method_types: selectedMethods } : {}),
        reference_number: String(referenceNumber || ''),
        metadata: metadata && typeof metadata === 'object' ? metadata : {},
        success_url:
          successUrl ||
          `${frontendBaseUrl}/receptionist/pos?paymongo_status=success`,
        cancel_url:
          cancelUrl ||
          `${frontendBaseUrl}/receptionist/pos?paymongo_status=cancelled`,
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
    return res.status(500).json({
      success: false,
      error: error?.message || 'Unexpected PayMongo error',
    })
  }
})

app.get('/paymongo/checkout-session/:id', optionalAuth, async (req, res) => {
  if (!assertPayMongoConfigured(res)) return

  const checkoutSessionId = String(req.params.id || '').trim()
  if (!checkoutSessionId) {
    return res.status(400).json({
      success: false,
      error: 'checkout session id is required',
    })
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
    const isCustomerBookingCheckout =
      moduleKey === 'customer_appointment' ||
      moduleKey === 'customer_consultation'

    if (isCustomerOrderCheckout || isCustomerBookingCheckout) {
      if (!req.user?.uid) {
        return res.status(401).json({
          success: false,
          error: 'Missing authorization token',
        })
      }
      const metadataCustomerId = String(metadata?.customerId || '').trim()
      if (!metadataCustomerId || metadataCustomerId !== req.user.uid) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
        })
      }
    } else if (moduleKey !== 'subscription') {
      if (!req.user?.uid) {
        return res.status(401).json({
          success: false,
          error: 'Missing authorization token',
        })
      }
      try {
        if (!req.userContext || req.userContext.uid !== req.user.uid) {
          req.userContext = await loadUserContext(req.user.uid)
        }
        if (!req.userContext.permissions.has('payments:view')) {
          return res.status(403).json({
            success: false,
            error: 'Forbidden',
          })
        }
      } catch (error) {
        return res.status(500).json({
          success: false,
          error: 'Failed to verify permission',
        })
      }
    }

    if (isPaid && String(metadata?.module || '').trim().toLowerCase() === 'subscription') {
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
    return res.status(500).json({
      success: false,
      error: error?.message || 'Unexpected PayMongo error',
    })
  }
})

app.post('/customer/orders/:id/cancel', requireAuth, async (req, res) => {
  if (!assertPayMongoConfigured(res)) return

  const orderId = String(req.params.id || '').trim()
  const reasonType = String(req.body?.reasonType || '').trim()
  const reasonDetails = String(req.body?.reasonDetails || '').trim()
  if (!orderId) {
    return res.status(400).json({
      success: false,
      error: 'order id is required',
    })
  }
  if (!reasonType) {
    return res.status(400).json({
      success: false,
      error: 'reasonType is required',
    })
  }
  if (reasonType === 'Other' && !reasonDetails) {
    return res.status(400).json({
      success: false,
      error: 'reasonDetails is required when reasonType is Other',
    })
  }

  try {
    const firestore = admin.firestore()
    const orderRef = firestore.collection('customerOrders').doc(orderId)
    const orderSnap = await orderRef.get()

    if (!orderSnap.exists) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      })
    }

    const orderData = orderSnap.data() || {}
    if (String(orderData.customerId || '').trim() !== String(req.user?.uid || '').trim()) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
      })
    }

    const status = String(orderData.status || '').trim().toLowerCase()
    if (['cancelled', 'completed', 'refunded'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'This order can no longer be cancelled.',
      })
    }

    const createdAt = orderData.createdAt?.toDate?.() || new Date(orderData.createdAt || 0)
    if (!(createdAt instanceof Date) || Number.isNaN(createdAt.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Order creation date is invalid.',
      })
    }

    const diffHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60)
    if (diffHours > 24) {
      return res.status(400).json({
        success: false,
        error: 'Orders can only be cancelled within 24 hours.',
      })
    }

    const totalAmount = Number(orderData.total || 0)
    const paymentId = String(orderData.paymongoPaymentId || '').trim()
    const isPayMongoPaid =
      String(orderData.source || '').trim().toLowerCase() === 'paymongo_checkout' &&
      String(orderData.paymentStatus || '').trim().toLowerCase() === 'paid' &&
      Boolean(paymentId)

    let refundId = null
    let refundStatus = null

    if (isPayMongoPaid) {
      const refundResponse = await fetch('https://api.paymongo.com/v1/refunds', {
        method: 'POST',
        headers: buildPayMongoHeaders(),
        body: JSON.stringify({
          data: {
            attributes: {
              amount: Math.round(totalAmount * 100),
              payment_id: paymentId,
              reason: 'requested_by_customer',
            },
          },
        }),
      })

      const refundData = await refundResponse.json()
      if (!refundResponse.ok) {
        return res.status(refundResponse.status).json({
          success: false,
          error: refundData?.errors?.[0]?.detail || 'Failed to refund payment via PayMongo',
          provider: refundData,
        })
      }

      refundId = refundData?.data?.id || null
      refundStatus = refundData?.data?.attributes?.status || 'pending'
    }

    const updatePayload = {
      status: 'Cancelled',
      cancelReasonType: reasonType,
      cancelReasonDetails: reasonType === 'Other' ? reasonDetails : '',
      cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }

    if (isPayMongoPaid) {
      updatePayload.paymentStatus = 'Refunded'
      updatePayload.refundType = 'PayMongo'
      updatePayload.refundReason = 'Order cancelled within 24 hours by customer'
      updatePayload.refundAmount = totalAmount
      updatePayload.paymongoRefundId = refundId
      updatePayload.paymongoRefundStatus = refundStatus
      updatePayload.refundedAt = admin.firestore.FieldValue.serverTimestamp()
    }

    await orderRef.update(updatePayload)

    if (isPayMongoPaid) {
      const branchId =
        String(orderData.branchId || '').trim() ||
        String(orderData.items?.[0]?.branchId || '').trim() ||
        ''

      await firestore.collection('transactions').add({
        branchId,
        amount: -Math.abs(totalAmount),
        method: orderData.paymentMethod || 'PayMongo',
        status: 'Refunded',
        type: 'customer_order_refund',
        orderId,
        clientName: orderData.customerName || orderData.delivery?.fullName || 'Customer',
        service: 'Customer Order Cancellation Refund',
        paymongoPaymentId: paymentId,
        paymongoRefundId: refundId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    }

    return res.json({
      success: true,
      data: {
        orderId,
        status: 'Cancelled',
        cancelReasonType: reasonType,
        cancelReasonDetails: reasonType === 'Other' ? reasonDetails : '',
        paymentStatus: isPayMongoPaid ? 'Refunded' : String(orderData.paymentStatus || ''),
        refundType: isPayMongoPaid ? 'PayMongo' : null,
        refundAmount: isPayMongoPaid ? totalAmount : 0,
        paymongoRefundId: refundId,
        paymongoRefundStatus: refundStatus,
      },
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to cancel order',
    })
  }
})

app.listen(PORT, () => {
  console.log(`OTP backend running on http://localhost:${PORT}`)
})
