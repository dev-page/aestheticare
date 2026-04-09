import admin from 'firebase-admin'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
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

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return sendJson(res, 204, {})
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { success: false, error: 'Method not allowed' })
  }

  const email = String(req.body?.email || '').trim().toLowerCase()
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
