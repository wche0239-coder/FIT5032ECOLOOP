const { test } = require('node:test')
const assert = require('node:assert')
const { validateEmailRequest, escapeHtml } = require('./validate')

const PDF = 'JVBERi0xLjMKJcTl8uXrp/Og0MTGCg==' // "%PDF-1.3..." in base64
const good = { to: 'marker@example.com', reportTitle: 'Listings', pdfBase64: PDF, filename: 'listings.pdf' }

test('accepts a valid request', () => {
  const r = validateEmailRequest(good)
  assert.equal(r.ok, true)
  assert.equal(r.value.filename, 'listings.pdf')
})

test('rejects bad recipients', () => {
  for (const to of ['', 'nope', 'a@b', 'x@y.com, z@w.com', '<script>@x.com']) {
    assert.equal(validateEmailRequest({ ...good, to }).ok, false, to)
  }
})

test('rejects non-PDF or oversized attachments', () => {
  assert.equal(validateEmailRequest({ ...good, pdfBase64: 'aGVsbG8=' }).ok, false)
  assert.equal(validateEmailRequest({ ...good, pdfBase64: 'JVBERi$$' }).ok, false)
  assert.equal(validateEmailRequest({ ...good, pdfBase64: 'JVBERi' + 'A'.repeat(5_000_000) }).ok, false)
})

test('sanitises filenames and forces .pdf', () => {
  assert.equal(validateEmailRequest({ ...good, filename: '../../etc/passwd' }).value.filename, 'etc-passwd.pdf')
  assert.equal(validateEmailRequest({ ...good, filename: undefined }).value.filename, 'ecoloop-report.pdf')
})

test('escapes HTML in user-supplied text', () => {
  assert.equal(escapeHtml('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;')
})
