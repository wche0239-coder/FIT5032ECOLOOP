// Business rules for changing a user's role (BR C.2 / E.1).
// Kept separate from Firebase so they can be unit-tested with a fake
// store (see roles.test.js); index.js plugs in the real Firestore.

const ROLES = ['individual', 'business', 'admin']
// Firebase Auth uids are 1–128 characters with no slashes.
const UID_RE = /^[^/\s]{1,128}$/

class RoleChangeError extends Error {
  /** @param {'permission-denied'|'invalid-argument'|'not-found'|'failed-precondition'} code */
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

/**
 * @param {{ callerUid: string|null, targetUid: unknown, role: unknown }} input
 * @param {{ getUser(uid: string): Promise<object|null>,
 *           setRole(uid: string, role: string, byUid: string): Promise<void> }} store
 * @returns {Promise<{ uid: string, role: string, previousRole: string }>}
 */
async function applyRoleChange({ callerUid, targetUid, role }, store) {
  if (!callerUid) throw new RoleChangeError('permission-denied', 'Please log in first.')

  // Check the caller's role on the server. Never trust a role sent
  // from the browser.
  const caller = await store.getUser(callerUid)
  if (!caller || caller.role !== 'admin') {
    throw new RoleChangeError('permission-denied', 'Only admins can change roles.')
  }

  if (typeof targetUid !== 'string' || !UID_RE.test(targetUid)) {
    throw new RoleChangeError('invalid-argument', 'Unknown user.')
  }
  if (typeof role !== 'string' || !ROLES.includes(role)) {
    throw new RoleChangeError('invalid-argument', `Role must be one of: ${ROLES.join(', ')}.`)
  }
  // Stops an admin locking everyone (including themselves) out of admin tools.
  if (targetUid === callerUid) {
    throw new RoleChangeError('failed-precondition', "You can't change your own role.")
  }

  const target = await store.getUser(targetUid)
  if (!target) throw new RoleChangeError('not-found', 'That user no longer exists.')

  const previousRole = target.role
  if (previousRole !== role) await store.setRole(targetUid, role, callerUid)
  return { uid: targetUid, role, previousRole }
}

module.exports = { applyRoleChange, RoleChangeError, ROLES }
