const { test } = require('node:test')
const assert = require('node:assert')
const { applyRoleChange } = require('./roles')

function fakeStore(users) {
  const writes = []
  return {
    writes,
    users,
    async getUser(uid) {
      return users[uid] ? { ...users[uid] } : null
    },
    async setRole(uid, role, byUid) {
      users[uid].role = role
      writes.push({ uid, role, byUid })
    },
  }
}

const base = () => ({
  admin1: { role: 'admin' },
  bob: { role: 'individual' },
  shop: { role: 'business' },
})

test('admin can promote another user', async () => {
  const store = fakeStore(base())
  const r = await applyRoleChange({ callerUid: 'admin1', targetUid: 'bob', role: 'business' }, store)
  assert.deepEqual(r, { uid: 'bob', role: 'business', previousRole: 'individual' })
  assert.deepEqual(store.writes, [{ uid: 'bob', role: 'business', byUid: 'admin1' }])
})

test('non-admins are refused, even if they claim a role', async () => {
  const store = fakeStore(base())
  await assert.rejects(
    applyRoleChange({ callerUid: 'bob', targetUid: 'shop', role: 'admin', callerRole: 'admin' }, store),
    { code: 'permission-denied' }
  )
  assert.equal(store.writes.length, 0)
})

test('signed-out callers are refused', async () => {
  await assert.rejects(applyRoleChange({ callerUid: null, targetUid: 'bob', role: 'admin' }, fakeStore(base())), {
    code: 'permission-denied',
  })
})

test('rejects unknown roles and malformed uids', async () => {
  const store = fakeStore(base())
  await assert.rejects(applyRoleChange({ callerUid: 'admin1', targetUid: 'bob', role: 'superuser' }, store), {
    code: 'invalid-argument',
  })
  await assert.rejects(applyRoleChange({ callerUid: 'admin1', targetUid: '../users/x', role: 'admin' }, store), {
    code: 'invalid-argument',
  })
  await assert.rejects(applyRoleChange({ callerUid: 'admin1', targetUid: 42, role: 'admin' }, store), {
    code: 'invalid-argument',
  })
})

test('admins cannot change their own role', async () => {
  await assert.rejects(
    applyRoleChange({ callerUid: 'admin1', targetUid: 'admin1', role: 'individual' }, fakeStore(base())),
    { code: 'failed-precondition' }
  )
})

test('missing target user is reported', async () => {
  await assert.rejects(applyRoleChange({ callerUid: 'admin1', targetUid: 'ghost', role: 'admin' }, fakeStore(base())), {
    code: 'not-found',
  })
})

test('no write when the role is unchanged', async () => {
  const store = fakeStore(base())
  await applyRoleChange({ callerUid: 'admin1', targetUid: 'shop', role: 'business' }, store)
  assert.equal(store.writes.length, 0)
})
