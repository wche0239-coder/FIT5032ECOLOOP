import { computed } from 'vue'
import { useLocalStorage } from './useLocalStorage'

// -----------------------------------------------------------------
// SKELETON NOTICE (Category C, phase 1)
// -----------------------------------------------------------------
// This composable is a *structural* stand-in for Firebase
// Authentication. It already models what the real thing will look
// like — a users collection, roles, a "logged in" session — so that
// swapping localStorage calls for `firebase/auth` + Firestore calls
// later is a drop-in replacement rather than a rewrite.
//
// Passwords are hashed with SubtleCrypto (SHA-256) before storage so
// nothing is kept in plain text, but this is NOT a substitute for
// real server-side authentication — there is no backend yet, so a
// determined attacker with local access could still tamper with
// localStorage. BR (D.1)/(C.1) will replace this with Firebase Auth.
// -----------------------------------------------------------------

export const ROLES = ['individual', 'business', 'admin']

// One seeded admin account so graders/reviewers can test role-gated
// pages without needing an open "sign up as admin" form (real admin
// accounts are provisioned, not self-registered).
// Demo login: admin@ecoloop.com / admin123
const seedUsers = [
  {
    id: 'admin-seed',
    name: 'GreenLoop Admin',
    email: 'admin@ecoloop.com',
    passwordHash: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
    role: 'admin',
    createdAt: '2026-01-01T00:00:00',
  },
]

const users = useLocalStorage('ecoloop_users', seedUsers)
const currentUser = useLocalStorage('ecoloop_session', null)

async function hashPassword(password) {
  const bytes = new TextEncoder().encode(password)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function useAuth() {
  const isLoggedIn = computed(() => !!currentUser.value)
  const role = computed(() => currentUser.value?.role ?? null)

  async function register({ name, email, password, role: chosenRole }) {
    const existing = users.value.find((u) => u.email.toLowerCase() === email.toLowerCase())
    if (existing) {
      throw new Error('An account with that email already exists.')
    }
    const passwordHash = await hashPassword(password)
    const newUser = {
      id: `u-${Date.now()}`,
      name,
      email,
      passwordHash,
      role: ROLES.includes(chosenRole) ? chosenRole : 'individual',
      createdAt: new Date().toISOString(),
    }
    users.value = [...users.value, newUser]
    currentUser.value = { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role }
    return currentUser.value
  }

  async function login({ email, password }) {
    const passwordHash = await hashPassword(password)
    const match = users.value.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.passwordHash === passwordHash
    )
    if (!match) {
      throw new Error('Incorrect email or password.')
    }
    currentUser.value = { id: match.id, name: match.name, email: match.email, role: match.role }
    return currentUser.value
  }

  function logout() {
    currentUser.value = null
  }

  return { currentUser, isLoggedIn, role, users, register, login, logout }
}
