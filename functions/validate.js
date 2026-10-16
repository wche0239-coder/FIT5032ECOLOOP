// Server-side validation for the email function (BR C.4 / E.1).
// The browser also validates, but anything arriving at a public
// endpoint has to be checked again here — it could come from anywhere.

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/
// ~3.75 MB PDF once base64-decoded — plenty for a table report.
const MAX_BASE64_LENGTH = 5_000_000

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch])
}

/**
 * @returns {{ ok: true, value: object } | { ok: false, error: string }}
 */
function validateEmailRequest(data) {
  if (!data || typeof data !== 'object') return { ok: false, error: 'Request body is missing.' }

  const to = typeof data.to === 'string' ? data.to.trim() : ''
  if (!EMAIL_RE.test(to) || to.length > 254) return { ok: false, error: 'Recipient email address is not valid.' }

  const reportTitle = typeof data.reportTitle === 'string' ? data.reportTitle.trim() : ''
  if (reportTitle.length < 1 || reportTitle.length > 120) return { ok: false, error: 'Report title must be 1–120 characters.' }

  const note = typeof data.note === 'string' ? data.note.trim() : ''
  if (note.length > 500) return { ok: false, error: 'Note must be 500 characters or fewer.' }

  const pdfBase64 = typeof data.pdfBase64 === 'string' ? data.pdfBase64 : ''
  if (!pdfBase64 || pdfBase64.length > MAX_BASE64_LENGTH || !/^[A-Za-z0-9+/]+={0,2}$/.test(pdfBase64)) {
    return { ok: false, error: 'Attachment must be a base64-encoded PDF under ~3.5 MB.' }
  }
  // Real PDFs start with "%PDF", which is "JVBERi" in base64.
  if (!pdfBase64.startsWith('JVBERi')) return { ok: false, error: 'Attachment is not a PDF.' }

  const filename =
    (typeof data.filename === 'string' ? data.filename : 'ecoloop-report.pdf')
      .replace(/[^A-Za-z0-9._-]/g, '-')
      .replace(/\.{2,}/g, '')
      .replace(/^[-.]+|[-.]+$/g, '')
      .replace(/-{2,}/g, '-')
      .slice(0, 80) || 'ecoloop-report.pdf'

  return {
    ok: true,
    value: {
      to,
      reportTitle,
      note,
      pdfBase64,
      filename: filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`,
    },
  }
}

module.exports = { validateEmailRequest, escapeHtml }
