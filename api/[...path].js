import admin from 'firebase-admin'
import sgMail from '@sendgrid/mail'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cache-Control': 'no-store',
}

const sendJson = (res, statusCode, payload) => {
  res.statusCode = statusCode
  for (const [key, value] of Object.entries(corsHeaders)) {
    res.setHeader(key, value)
  }
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

const readBody = async (req) => {
  if (req.body && typeof req.body === 'object') return req.body

  const chunks = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  const raw = Buffer.concat(chunks).toString('utf8').trim()
  if (!raw) return {}

  try {
    return JSON.parse(raw)
  } catch (_error) {
    return {}
  }
}

const normalizeEmail = (value) => String(value || '').trim().toLowerCase()

const getPath = (req) => {
  const url = new URL(req.url || '/', 'http://localhost')
  return (url.pathname.replace(/^\/api/, '') || '/').replace(/\/+$/, '') || '/'
}

const getSendGridConfig = () => {
  const apiKey = String(process.env.SENDGRID_API_KEY || '').trim()
  const sender = String(process.env.SENDGRID_SENDER || '').trim()
  return { apiKey, sender }
}

const initAdmin = () => {
  if (admin.apps.length) return admin.app()

  const rawServiceAccount = String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim()
  if (!rawServiceAccount) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is missing')
  }

  const serviceAccount = JSON.parse(rawServiceAccount)
  if (serviceAccount.private_key) {
    serviceAccount.private_key = String(serviceAccount.private_key).replace(/\\n/g, '\n')
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  })

  return admin.app()
}

const sendMail = async ({ to, subject, text, html }) => {
  const { apiKey, sender } = getSendGridConfig()
  if (!apiKey || !sender) {
    throw new Error('SENDGRID_API_KEY or SENDGRID_SENDER is missing')
  }

  sgMail.setApiKey(apiKey)
  await sgMail.send({
    to,
    from: sender,
    subject,
    text,
    html,
  })
}

const buildWelcomeEmail = ({ fullName, recipient, defaultPassword, accountType }) => {
  const safeName = String(fullName || 'there').trim() || 'there'
  const safeRecipient = normalizeEmail(recipient)
  const passwordLine = String(defaultPassword || '').trim()
  const typeLabel = String(accountType || 'account').trim()
  return {
    to: safeRecipient,
    subject: `${typeLabel} welcome from AesthetiCare`,
    text: [
      `Hi ${safeName},`,
      '',
      `Your ${typeLabel} account has been prepared.`,
      passwordLine ? `Temporary password: ${passwordLine}` : '',
      '',
      'Please sign in and change your password after your first login.',
    ].filter(Boolean).join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#3b2a1f">
        <h2 style="margin:0 0 12px">Welcome to AesthetiCare</h2>
        <p>Hi ${safeName},</p>
        <p>Your ${typeLabel} account has been prepared.</p>
        ${passwordLine ? `<p><strong>Temporary password:</strong> ${passwordLine}</p>` : ''}
        <p>Please sign in and change your password after your first login.</p>
      </div>
    `,
  }
}

const requirePost = (req, res) => {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {})
    return false
  }
  if (req.method !== 'GET' && req.method !== 'POST') {
    sendJson(res, 405, { success: false, error: 'Method not allowed' })
    return false
  }
  return true
}

const handleHealth = (_req, res) => {
  sendJson(res, 200, { ok: true, service: 'vercel-api' })
}

const handleSendOtp = async (req, res, body) => {
  const recipient = normalizeEmail(body.recipient)
  const otp = String(body.otp || '').trim()
  if (!recipient || !otp) {
    return sendJson(res, 400, { success: false, error: 'recipient and otp are required' })
  }

  try {
    await sendMail({
      to: recipient,
      subject: 'Your OTP Code',
      text: `Your one-time password is: ${otp}`,
      html: `<strong>Your OTP code is: ${otp}</strong>`,
    })
    return sendJson(res, 200, { success: true })
  } catch (error) {
    return sendJson(res, 500, { success: false, error: error?.message || 'Unexpected OTP route error' })
  }
}

const handleCheckUser = async (_req, res, body) => {
  const email = normalizeEmail(body.email)
  if (!email) {
    return sendJson(res, 400, { success: false, error: 'email is required' })
  }

  try {
    initAdmin()
    const userRecord = await admin.auth().getUserByEmail(email)
    return sendJson(res, 200, { success: true, exists: true, uid: userRecord.uid })
  } catch (error) {
    if (error?.code === 'auth/user-not-found') {
      return sendJson(res, 200, { success: true, exists: false })
    }
    return sendJson(res, 400, { success: false, error: error?.message || 'Failed to check user.' })
  }
}

const handleResetPassword = async (_req, res, body) => {
  const email = normalizeEmail(body.email)
  const password = String(body.newPassword || '').trim()
  if (!email || !password) {
    return sendJson(res, 400, { success: false, error: 'email and newPassword are required' })
  }
  if (password.length < 8) {
    return sendJson(res, 400, { success: false, error: 'Password must be at least 8 characters.' })
  }

  try {
    initAdmin()
    const userRecord = await admin.auth().getUserByEmail(email)
    await admin.auth().updateUser(userRecord.uid, { password })
    return sendJson(res, 200, { success: true })
  } catch (error) {
    const code = error?.code || ''
    const message = code === 'auth/user-not-found' ? 'No account found with this email.' : error?.message || 'Failed to reset password.'
    return sendJson(res, 400, { success: false, error: message, code })
  }
}

const handleCheckRegistrationStatus = async (_req, res, body) => {
  const email = normalizeEmail(body.email)
  if (!email) {
    return sendJson(res, 400, { success: false, error: 'email is required' })
  }

  try {
    initAdmin()
    const userRecord = await admin.auth().getUserByEmail(email)
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
      Boolean(clinicData.submittedDocuments && Object.keys(clinicData.submittedDocuments || {}).length > 0)

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

    return sendJson(res, 200, {
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
      return sendJson(res, 200, { success: true, exists: false })
    }
    return sendJson(res, 400, { success: false, error: error?.message || 'Failed to check registration status.', code })
  }
}

const handleVerifyRegistrationOtp = async (_req, res, body) => {
  const uid = String(body.uid || '').trim()
  const email = normalizeEmail(body.email)
  if (!uid || !email) {
    return sendJson(res, 400, { success: false, error: 'uid and email are required' })
  }

  try {
    initAdmin()
    const userRecord = await admin.auth().getUser(uid)
    const recordEmail = normalizeEmail(userRecord?.email)
    if (recordEmail && recordEmail !== email) {
      return sendJson(res, 403, { success: false, error: 'Email does not match user record' })
    }

    const firestore = admin.firestore()
    await Promise.all([
      firestore.collection('users').doc(uid).set(
        {
          status: 'Pending Document Submission',
          emailVerified: true,
          emailVerifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      ),
      firestore.collection('clinics').doc(uid).set(
        {
          approvalStatus: 'Pending Document Submission',
        },
        { merge: true }
      ),
    ])

    return sendJson(res, 200, { success: true })
  } catch (error) {
    return sendJson(res, 400, { success: false, error: error?.message || 'Failed to verify OTP.', code: error?.code || '' })
  }
}

const handleRegistrationProfile = async (_req, res, body) => {
  const email = normalizeEmail(body.email)
  if (!email) {
    return sendJson(res, 400, { success: false, error: 'email is required' })
  }

  try {
    initAdmin()
    const userRecord = await admin.auth().getUserByEmail(email)
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

    return sendJson(res, 200, {
      success: true,
      exists: true,
      uid,
      profile: {
        user: {
          ...userData,
          createdAt: safeDate(userData.createdAt),
          updatedAt: safeDate(userData.updatedAt),
        },
        clinic: {
          ...clinicData,
          createdAt: safeDate(clinicData.createdAt),
          updatedAt: safeDate(clinicData.updatedAt),
        },
      },
    })
  } catch (error) {
    const code = error?.code || ''
    if (code === 'auth/user-not-found') {
      return sendJson(res, 200, { success: true, exists: false })
    }
    return sendJson(res, 400, { success: false, error: error?.message || 'Failed to load registration profile.', code })
  }
}

const handleWelcome = async (_req, res, body, accountType = 'customer') => {
  const recipient = normalizeEmail(body.recipient)
  if (!recipient) {
    return sendJson(res, 400, { success: false, error: 'recipient is required' })
  }

  try {
    await sendMail(buildWelcomeEmail({
      recipient,
      fullName: body.fullName,
      defaultPassword: body.defaultPassword,
      accountType,
    }))
    return sendJson(res, 200, { success: true })
  } catch (error) {
    return sendJson(res, 500, { success: false, error: error?.message || 'Failed to send welcome email.' })
  }
}

export default async function handler(req, res) {
  if (!requirePost(req, res)) return

  const path = getPath(req)
  const body = req.method === 'POST' ? await readBody(req) : {}

  try {
    if (path === '/' || path === '') return handleHealth(req, res)
    if (path === '/health') return handleHealth(req, res)
    if (path === '/send-otp') return handleSendOtp(req, res, body)
    if (path === '/auth/check-user') return handleCheckUser(req, res, body)
    if (path === '/auth/reset-password') return handleResetPassword(req, res, body)
    if (path === '/auth/check-registration-status') return handleCheckRegistrationStatus(req, res, body)
    if (path === '/auth/verify-registration-otp') return handleVerifyRegistrationOtp(req, res, body)
    if (path === '/auth/registration-profile') return handleRegistrationProfile(req, res, body)
    if (path === '/send-account-welcome') return handleWelcome(req, res, body, 'customer')
    if (path === '/send-staff-welcome') return handleWelcome(req, res, body, 'staff')

    return sendJson(res, 404, { success: false, error: `Route not found: ${path}` })
  } catch (error) {
    return sendJson(res, 500, { success: false, error: error?.message || 'Unexpected server error' })
  }
}
