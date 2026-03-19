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
const OTP_PATH = '/send-otp'
const ATTENDANCE_PIN_PATH = '/send-attendance-pin'
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

app.post('/google-meet/create-consultation-link', async (req, res) => {
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
  const { recipient, otp } = req.body ?? {}

  if (!recipient || !otp) {
    return res.status(400).json({
      success: false,
      error: 'recipient and otp are required',
    })
  }

  if (!sendGridApiKey || !senderEmail) {
    return res.status(500).json({
      success: false,
      error: 'SENDGRID_API_KEY or SENDGRID_SENDER is missing',
    })
  }

  const message = {
    to: recipient,
    from: senderEmail,
    subject: 'Your OTP Code',
    text: `Your one-time password is: ${otp}`,
    html: `<strong>Your OTP code is: ${otp}</strong>`,
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

app.post('/owner/backup', requireAuth, async (req, res) => {

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

app.post('/owner/backup/zip', requireAuth, async (req, res) => {

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

app.post(ATTENDANCE_PIN_PATH, async (req, res) => {
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
    subject: 'Your Attendance PIN',
    text: `Hi ${safeName}, your attendance PIN is: ${safePin}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#2a1408;">
        <p>Hi ${safeName},</p>
        <p>Your attendance PIN is:</p>
        <p style="font-size:22px;font-weight:700;letter-spacing:2px;">${safePin}</p>
        <p>Keep this PIN private and use it when recording attendance.</p>
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

app.post('/paymongo/create-checkout-session', async (req, res) => {
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

app.get('/paymongo/checkout-session/:id', async (req, res) => {
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

app.listen(PORT, () => {
  console.log(`OTP backend running on http://localhost:${PORT}`)
})
