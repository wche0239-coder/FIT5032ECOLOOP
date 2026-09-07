// Defense-in-depth input sanitisation (BR C.4: Security).
//
// Vue already auto-escapes all `{{ }}` interpolation, so plain
// text bindings in this app cannot execute injected HTML/JS by
// default (this app never uses `v-html` on user-supplied content).
// This helper adds a second layer: it strips HTML tags out of
// free-text fields *before* they are stored, so the data itself
// stays clean wherever it ends up (localStorage now, a real
// database later).
export function stripTags(value) {
  if (typeof value !== 'string') return value
  return value.replace(/<[^>]*>/g, '').trim()
}

/**
 * Sanitise every string field on a plain object (shallow).
 * Used right before persisting user-submitted objects such as a
 * new listing or a rating comment.
 */
export function sanitizeObject(obj, fields) {
  const clean = { ...obj }
  fields.forEach((field) => {
    if (typeof clean[field] === 'string') {
      clean[field] = stripTags(clean[field])
    }
  })
  return clean
}
