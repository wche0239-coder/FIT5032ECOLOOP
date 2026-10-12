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
// One-time setup (see README):
//   firebase functions:secrets:set SENDGRID_API_KEY
//   and set SENDGRID_FROM in functions/.env to your verified sender
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { defineSecret, defineString } = require('firebase-functions/params')
const logger = require('firebase-functions/logger')
const sgMail = require('@sendgrid/mail')
const { validateEmailRequest, escapeHtml } = require('./validate')

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
