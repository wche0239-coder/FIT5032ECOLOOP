// Small, reusable validation functions used across the Post Item,
// Business Dashboard and Login/Signup forms.
//
// BR (B.1) asks for a minimum of two different *types* of
// validation. This app uses at least four distinct types:
//   1. required        — presence check
//   2. length           — minimum string length
//   3. format (regex)   — email shape
//   4. numeric / range  — price & quantity must be positive numbers
//   5. equality         — signup password confirmation must match

export function required(value) {
  if (value === null || value === undefined) return 'This field is required.'
  if (typeof value === 'string' && value.trim() === '') return 'This field is required.'
  return ''
}

export function minLength(min) {
  return (value) => {
    if (!value) return ''
    return value.trim().length < min ? `Please enter at least ${min} characters.` : ''
  }
}

export function isEmail(value) {
  if (!value) return ''
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return pattern.test(value) ? '' : 'Enter a valid email address.'
}

export function isPositiveNumber(value) {
  if (value === '' || value === null || value === undefined) return ''
  const num = Number(value)
  if (Number.isNaN(num)) return 'Enter a number.'
  return num > 0 ? '' : 'Enter a value greater than 0.'
}

export function isPositiveInteger(value) {
  if (value === '' || value === null || value === undefined) return ''
  const num = Number(value)
  if (!Number.isInteger(num)) return 'Enter a whole number.'
  return num > 0 ? '' : 'Enter a value greater than 0.'
}

export function matches(otherValue, message = 'Values do not match.') {
  return (value) => (value === otherValue ? '' : message)
}

/**
 * Run a list of validator functions against a value, returning the
 * first non-empty error message (or '' if the value is valid).
 */
export function runValidators(value, validatorFns) {
  for (const fn of validatorFns) {
    const message = fn(value)
    if (message) return message
  }
  return ''
}
