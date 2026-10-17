// EcoLoop Cloud Functions — BR (E.1) serverless back end.
//
// sendReportEmail (BR D.2): emails a PDF report, exported from the
// Data & reports page, as an attachment via the SendGrid API.
//
// Why this has to be server-side: the SendGrid API key gives full
// sending rights on the account. If it lived in the Vue code it would
// ship to every visitor's browser. Here it is stored in Google Secret
// Manager and only this function can read it.
//
// setUserRole (BR E.1 / C.2): lets an admin change another user's role
// from the Admin page. The caller's admin status is checked here on the
// server with the Admin SDK, and firestore.rules stops anyone changing a
// role directly from the browser, so this function is the only way in.
//
// One-time setup (see README):
//   firebase functions:secrets:set SENDGRID_API_KEY
//   and set SENDGRID_FROM in functions/.env to your verified sender
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { defineSecret, defineString } = require('firebase-functions/params')
const logger = require('firebase-functions/logger')
const sgMail = require('@sendgrid/mail')
const { initializeApp } = require('firebase-admin/app')
const { getFirestore, FieldValue } = require('firebase-admin/firestore')
const { validateEmailRequest, escapeHtml } = require('./validate')
const { applyRoleChange, RoleChangeError } = require('./roles')
const { validateBulkRequest, messageToHtml } = require('./bulk')
const demoExchanges = require('./demoExchanges.json')

initializeApp()

/** Throws unless the signed-in caller has role 'admin' in Firestore (checked server-side). */
async function requireAdmin(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Please log in first.')
  const snap = await getFirestore().collection('users').doc(request.auth.uid).get()
  if (!snap.exists || snap.data().role !== 'admin') {
    throw new HttpsError('permission-denied', 'Only admins can do this.')
  }
}

const SENDGRID_API_KEY = defineSecret('SENDGRID_API_KEY')
// Must be a Single Sender or domain you have verified in SendGrid.
const SENDGRID_FROM = defineString('SENDGRID_FROM')

exports.sendReportEmail = onCall(
  {
    region: 'australia-southeast1', // Melbourne-adjacent (Sydney); must match src/firebase.js
    secrets: [SENDGRID_API_KEY],
    maxInstances: 5,
    timeoutSeconds: 30,
  },
  async (request) => {
    // Only signed-in EcoLoop users may send (Firebase verifies the ID token for us).
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Please log in to email reports.')
    }

    const result = validateEmailRequest(request.data)
    if (!result.ok) throw new HttpsError('invalid-argument', result.error)
    const { to, reportTitle, note, pdfBase64, filename } = result.value

    const senderName = request.auth.token.name || request.auth.token.email || 'An EcoLoop member'
    const safeNote = note ? `<p style="padding:8px 12px;border-left:3px solid #1F5C4D;">${escapeHtml(note)}</p>` : ''

    sgMail.setApiKey(SENDGRID_API_KEY.value())
    try {
      await sgMail.send({
        to,
        from: { email: SENDGRID_FROM.value(), name: 'EcoLoop' },
        replyTo: request.auth.token.email || undefined,
        subject: `EcoLoop report: ${reportTitle}`,
        text: `${senderName} sent you the EcoLoop report "${reportTitle}". It is attached as a PDF.${note ? `\n\nNote: ${note}` : ''}`,
        html: `
          <div style="font-family:Arial,sans-serif;color:#17211C;max-width:560px;">
            <h1 style="font-size:20px;color:#1F5C4D;">EcoLoop report</h1>
            <p><strong>${escapeHtml(senderName)}</strong> sent you the report
               <strong>${escapeHtml(reportTitle)}</strong>. It is attached as a PDF.</p>
            ${safeNote}
            <p style="font-size:12px;color:#4B5750;">EcoLoop — a local exchange for Melbourne residents and small businesses.</p>
          </div>`,
        attachments: [{ content: pdfBase64, filename, type: 'application/pdf', disposition: 'attachment' }],
      })
    } catch (err) {
      // SendGrid puts the useful reason in err.response.body.
      logger.error('SendGrid send failed', { code: err.code, body: err.response?.body })
      throw new HttpsError('internal', 'The email service rejected the message. Check the function logs.')
    }

    logger.info('Report emailed', { uid: request.auth.uid, to, filename })
    return { ok: true, sentTo: to }
  }
)

exports.setUserRole = onCall(
  {
    region: 'australia-southeast1',
    maxInstances: 5,
    timeoutSeconds: 15,
  },
  async (request) => {
    const db = getFirestore()
    const store = {
      async getUser(uid) {
        const snap = await db.collection('users').doc(uid).get()
        return snap.exists ? snap.data() : null
      },
      async setRole(uid, role, byUid) {
        await db.collection('users').doc(uid).update({
          role,
          roleUpdatedAt: FieldValue.serverTimestamp(),
          roleUpdatedBy: byUid,
        })
      },
    }

    try {
      const result = await applyRoleChange(
        { callerUid: request.auth?.uid ?? null, targetUid: request.data?.uid, role: request.data?.role },
        store
      )
      logger.info('Role changed', { by: request.auth.uid, ...result })
      return result
    } catch (err) {
      if (err instanceof RoleChangeError) throw new HttpsError(err.code, err.message)
      logger.error('setUserRole failed', err)
      throw new HttpsError('internal', 'Could not change the role. Please try again.')
    }
  }
)

// seedDemoExchanges (F.1 admin dashboard): loads the 86-row demo exchange
// history into Firestore so the dashboard charts read real Firestore data.
// Admin-only and idempotent: fixed document ids mean running it twice just
// overwrites the same rows instead of duplicating them.
exports.seedDemoExchanges = onCall(
  { region: 'australia-southeast1', maxInstances: 2, timeoutSeconds: 30 },
  async (request) => {
    await requireAdmin(request)
    const db = getFirestore()
    const batch = db.batch()
    for (const row of demoExchanges) {
      const { id, ...data } = row
      batch.set(db.collection('exchanges').doc(id), { ...data, demo: true })
    }
    await batch.commit()
    logger.info('Demo exchanges loaded', { by: request.auth.uid, count: demoExchanges.length })
    return { count: demoExchanges.length }
  }
)

// sendBulkEmail (F.1): an admin emails an announcement to users they picked
// in the Admin dashboard. Each person gets their own copy (nobody sees the
// other recipients), addresses are looked up here from user ids, and every
// send is recorded in the announcements collection for accountability.
exports.sendBulkEmail = onCall(
  {
    region: 'australia-southeast1',
    secrets: [SENDGRID_API_KEY],
    maxInstances: 2,
    timeoutSeconds: 60,
  },
  async (request) => {
    await requireAdmin(request)
    const result = validateBulkRequest(request.data)
    if (!result.ok) throw new HttpsError('invalid-argument', result.error)
    const { uids, subject, message } = result.value

    const db = getFirestore()
    const snaps = await db.getAll(...uids.map((uid) => db.collection('users').doc(uid)))
    const recipients = snaps
      .filter((s) => s.exists && typeof s.data().email === 'string')
      .map((s) => ({ email: s.data().email, name: s.data().name || '' }))
    if (!recipients.length) throw new HttpsError('not-found', 'None of the selected users have an email address.')

    const bodyHtml = messageToHtml(message, escapeHtml)
    const messages = recipients.map((r) => ({
      to: { email: r.email, name: r.name || undefined },
      from: { email: SENDGRID_FROM.value(), name: 'EcoLoop' },
      subject,
      text: `${r.name ? `Hi ${r.name},\n\n` : ''}${message}\n\n— The EcoLoop team`,
      html: `
        <div style="font-family:Arial,sans-serif;color:#17211C;max-width:560px;">
          ${r.name ? `<p>Hi ${escapeHtml(r.name)},</p>` : ''}
          ${bodyHtml}
          <p style="font-size:12px;color:#4B5750;">— The EcoLoop team · GreenLoop Collective, Melbourne</p>
        </div>`,
    }))

    sgMail.setApiKey(SENDGRID_API_KEY.value())
    try {
      await sgMail.send(messages)
    } catch (err) {
      logger.error('Bulk send failed', { code: err.code, body: err.response?.body })
      throw new HttpsError('internal', 'The email service rejected the announcement. Check the function logs.')
    }

    await db.collection('announcements').add({
      subject,
      message,
      recipientCount: recipients.length,
      sentBy: request.auth.uid,
      sentAt: FieldValue.serverTimestamp(),
    })
    logger.info('Announcement sent', { by: request.auth.uid, count: recipients.length })
    return { sent: recipients.length, skipped: uids.length - recipients.length }
  }
)
