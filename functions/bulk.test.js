const { test } = require('node:test')
const assert = require('node:assert')
const { validateBulkRequest, messageToHtml } = require('./bulk')
const { escapeHtml } = require('./validate')

const good = { uids: ['a1', 'b2'], subject: 'Garage sale weekend', message: 'Join us this Saturday at Fitzroy.' }

test('accepts a valid request and removes duplicate recipients', () => {
  const r = validateBulkRequest({ ...good, uids: ['a1', 'b2', 'a1'] })
  assert.equal(r.ok, true)
  assert.deepEqual(r.value.uids, ['a1', 'b2'])
})

test('rejects empty, oversized or malformed recipient lists', () => {
  assert.equal(validateBulkRequest({ ...good, uids: [] }).ok, false)
  assert.equal(validateBulkRequest({ ...good, uids: 'a1' }).ok, false)
  assert.equal(validateBulkRequest({ ...good, uids: Array.from({ length: 101 }, (_, i) => `u${i}`) }).ok, false)
  assert.equal(validateBulkRequest({ ...good, uids: ['ok', 'bad/id'] }).ok, false)
  assert.equal(validateBulkRequest({ ...good, uids: ['someone@example.com '] }).ok, false)
})

test('rejects bad subjects, including header injection', () => {
  assert.equal(validateBulkRequest({ ...good, subject: 'Hi' }).ok, false)
  assert.equal(validateBulkRequest({ ...good, subject: 'x'.repeat(121) }).ok, false)
  assert.equal(validateBulkRequest({ ...good, subject: 'Hello\r\nBcc: victim@example.com' }).ok, false)
})

test('rejects too-short or too-long messages', () => {
  assert.equal(validateBulkRequest({ ...good, message: 'short' }).ok, false)
  assert.equal(validateBulkRequest({ ...good, message: 'x'.repeat(5001) }).ok, false)
})

test('message becomes escaped HTML paragraphs', () => {
  assert.equal(
    messageToHtml('Hi <b>all</b>\nline two\n\nNew para', escapeHtml),
    '<p>Hi &lt;b&gt;all&lt;/b&gt;<br>line two</p><p>New para</p>'
  )
})
