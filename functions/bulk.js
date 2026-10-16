// Validation for bulk announcement emails (F.1). Plain module so it can be
// unit-tested without Firebase (see bulk.test.js).

const UID_RE = /^[^/\s]{1,128}$/
const MAX_RECIPIENTS = 100

/**
 * The browser sends user *ids*, never email addresses: the function looks
 * the addresses up itself, so a tampered request can't email arbitrary
 * people through EcoLoop's SendGrid account.
 * @returns {{ ok: true, value: { uids: string[], subject: string, message: string } } | { ok: false, error: string }}
 */
function validateBulkRequest(data) {
  if (!data || typeof data !== 'object') return { ok: false, error: 'Request body is missing.' }

  if (!Array.isArray(data.uids) || data.uids.length === 0) {
    return { ok: false, error: 'Choose at least one recipient.' }
  }
  const uids = [...new Set(data.uids)]
  if (uids.length > MAX_RECIPIENTS) {
    return { ok: false, error: `You can email up to ${MAX_RECIPIENTS} people at once.` }
  }
  if (!uids.every((u) => typeof u === 'string' && UID_RE.test(u))) {
    return { ok: false, error: 'One of the recipients is not valid.' }
  }

  const subject = typeof data.subject === 'string' ? data.subject.trim() : ''
  if (subject.length < 3 || subject.length > 120) return { ok: false, error: 'Subject must be 3–120 characters.' }
  // No newlines in a subject line (header injection).
  if (/[\r\n]/.test(subject)) return { ok: false, error: 'Subject must be a single line.' }

  const message = typeof data.message === 'string' ? data.message.trim() : ''
  if (message.length < 10 || message.length > 5000) {
    return { ok: false, error: 'Message must be 10–5000 characters.' }
  }

  return { ok: true, value: { uids, subject, message } }
}

/** Text paragraphs -> safe HTML paragraphs. */
function messageToHtml(message, escapeHtml) {
  return message
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

module.exports = { validateBulkRequest, messageToHtml, MAX_RECIPIENTS }
