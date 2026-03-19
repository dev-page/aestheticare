const functions = require('firebase-functions')
const admin = require('firebase-admin')
const sgMail = require('@sendgrid/mail')

admin.initializeApp()

const DAY_MS = 24 * 60 * 60 * 1000
const GRACE_DAYS = 7

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

const getSendGridConfig = () => {
  try {
    const config = functions.config?.() || {}
    const key = String(config?.sendgrid?.key || '').trim()
    const sender = String(config?.sendgrid?.sender || '').trim()
    if (key && sender) {
      sgMail.setApiKey(key)
      return { key, sender }
    }
  } catch (_error) {
    // ignore
  }
  return { key: '', sender: '' }
}

const formatDate = (value) => {
  if (!value) return ''
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(value)
  } catch (_error) {
    return value.toISOString()
  }
}

exports.subscriptionMaintenance = functions.pubsub
  .schedule('every 24 hours')
  .timeZone('Asia/Manila')
  .onRun(async () => {
    const firestore = admin.firestore()
    const now = new Date()
    const { key, sender } = getSendGridConfig()
    const canEmail = Boolean(key && sender)

    const clinicsSnapshot = await firestore.collection('clinics').get()
    if (clinicsSnapshot.empty) {
      return { updated: 0, notified: 0 }
    }

    const ownerCache = new Map()
    const updates = []
    const mailJobs = []

    for (const docSnap of clinicsSnapshot.docs) {
      const data = docSnap.data() || {}
      const expiresAt = toDate(data.subscriptionExpiresAt)
      if (!expiresAt) continue

      const ownerId = String(data.ownerId || '').trim()
      const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / DAY_MS)
      const isExpired = now.getTime() > expiresAt.getTime()
      const isPublished = data.isPublished === true

      if (isExpired && isPublished) {
        updates.push(
          docSnap.ref.update({
            isPublished: false,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          })
        )
      }

      if (!canEmail || !ownerId) continue

      let ownerEmail = ownerCache.get(ownerId)
      if (ownerEmail === undefined) {
        const ownerSnap = await firestore.collection('users').doc(ownerId).get()
        ownerEmail = ownerSnap.exists ? String(ownerSnap.data().email || '').trim() : ''
        ownerCache.set(ownerId, ownerEmail)
      }
      if (!ownerEmail) continue

      if (isExpired && !data.subscriptionExpiredNotifiedAt) {
        mailJobs.push(
          sgMail.send({
            to: ownerEmail,
            from: sender,
            subject: 'Your subscription has expired',
            text:
              `Your subscription expired on ${formatDate(expiresAt)}.\n` +
              `Your clinic page has been unpublished and your account is now read-only.`,
            html: `
              <div style="font-family:Arial,sans-serif;line-height:1.5;color:#2a1408;">
                <h2 style="margin:0 0 12px;">Subscription expired</h2>
                <p>Your subscription expired on <strong>${formatDate(expiresAt)}</strong>.</p>
                <p>Your clinic page has been unpublished and your account is now read-only.</p>
              </div>
            `
          })
        )
        updates.push(
          docSnap.ref.update({
            subscriptionExpiredNotifiedAt: admin.firestore.FieldValue.serverTimestamp()
          })
        )
        continue
      }

      if (daysLeft >= 0 && daysLeft <= GRACE_DAYS && !data.subscriptionGraceNotifiedAt) {
        mailJobs.push(
          sgMail.send({
            to: ownerEmail,
            from: sender,
            subject: 'Your subscription is about to expire',
            text:
              `Your subscription will expire on ${formatDate(expiresAt)}.\n` +
              `You have ${daysLeft} day(s) left before your account becomes read-only.`,
            html: `
              <div style="font-family:Arial,sans-serif;line-height:1.5;color:#2a1408;">
                <h2 style="margin:0 0 12px;">Subscription expiring soon</h2>
                <p>Your subscription will expire on <strong>${formatDate(expiresAt)}</strong>.</p>
                <p>You have <strong>${daysLeft}</strong> day(s) left before your account becomes read-only.</p>
              </div>
            `
          })
        )
        updates.push(
          docSnap.ref.update({
            subscriptionGraceNotifiedAt: admin.firestore.FieldValue.serverTimestamp()
          })
        )
      }
    }

    if (updates.length) {
      await Promise.all(updates)
    }
    if (mailJobs.length) {
      await Promise.allSettled(mailJobs)
    }

    return { updated: updates.length, notified: mailJobs.length }
  })
