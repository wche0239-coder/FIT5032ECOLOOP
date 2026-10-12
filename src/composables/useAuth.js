import { ref, computed } from 'vue'
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
  signOut,
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../firebase'

// -----------------------------------------------------------------
// BR (D.1) — External authentication with Firebase Auth.
//
// Firebase Auth owns identity (email/password or Google sign-in) —
// passwords never touch our code or storage. Each user also has a
// profile document at users/{uid} in Firestore holding their display
// name and role, which drives the role-based routing from BR (C.2).
//
// Roles: 'individual' | 'business' | 'admin'. Self-registration can
// only create 'individual' or 'business' — this is enforced
// server-side by firestore.rules, not just in this file. Admins are
// promoted by editing the role field in the Firebase console.
// -----------------------------------------------------------------

export const ROLES = ['individual', 'business', 'admin']
const SELF_SERVICE_ROLES = ['individual', 'business']

// Module-level singleton state shared by every component.
const currentUser = ref(null) // { id, name, email, role } | null
const authReady = ref(false)

let resolveReady
const readyPromise = new Promise((resolve) => (resolveReady = resolve))

async function loadProfile(fbUser) {
  const snap = await getDoc(doc(db, 'users', fbUser.uid))
  if (snap.exists()) return snap.data()
  // First Google sign-in: no profile yet, create a default one.
  const profile = {
    name: fbUser.displayName || fbUser.email.split('@')[0],
    email: fbUser.email,
    role: 'individual',
    createdAt: serverTimestamp(),
  }
  await setDoc(doc(db, 'users', fbUser.uid), profile)
  return profile
}

function toSessionUser(fbUser, profile) {
  return {
    id: fbUser.uid,
    name: profile?.name || fbUser.displayName || fbUser.email,
    email: fbUser.email,
    role: ROLES.includes(profile?.role) ? profile.role : 'individual',
  }
}

// Keep currentUser in sync with Firebase's session (survives reloads).
onAuthStateChanged(auth, async (fbUser) => {
  if (!fbUser) {
    currentUser.value = null
  } else {
    try {
      currentUser.value = toSessionUser(fbUser, await loadProfile(fbUser))
    } catch (err) {
      console.error('[useAuth] Could not load user profile', err)
      currentUser.value = toSessionUser(fbUser, null)
    }
  }
  authReady.value = true
  resolveReady()
})

// Turns Firebase error codes into messages a person can act on.
function friendlyError(err) {
  const map = {
    'auth/email-already-in-use': 'An account with that email already exists.',
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/wrong-password': 'Incorrect email or password.',
    'auth/user-not-found': 'Incorrect email or password.',
    'auth/too-many-requests': 'Too many attempts. Please wait a minute and try again.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
    'auth/network-request-failed': 'Network error — check your connection and try again.',
  }
  return new Error(map[err?.code] || err?.message || 'Something went wrong, please try again.')
}

export function useAuth() {
  const isLoggedIn = computed(() => !!currentUser.value)
  const role = computed(() => currentUser.value?.role ?? null)

  async function register({ name, email, password, role: chosenRole }) {
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(user, { displayName: name })
      const profile = {
        name,
        email,
        role: SELF_SERVICE_ROLES.includes(chosenRole) ? chosenRole : 'individual',
        createdAt: serverTimestamp(),
      }
      await setDoc(doc(db, 'users', user.uid), profile)
      currentUser.value = toSessionUser(user, profile)
      return currentUser.value
    } catch (err) {
      throw friendlyError(err)
    }
  }

  async function login({ email, password }) {
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password)
      currentUser.value = toSessionUser(user, await loadProfile(user))
      return currentUser.value
    } catch (err) {
      throw friendlyError(err)
    }
  }

  async function loginWithGoogle() {
    try {
      const { user } = await signInWithPopup(auth, new GoogleAuthProvider())
      currentUser.value = toSessionUser(user, await loadProfile(user))
      return currentUser.value
    } catch (err) {
      throw friendlyError(err)
    }
  }

  async function logout() {
    await signOut(auth)
    currentUser.value = null
  }

  async function getIdToken() {
    return auth.currentUser ? auth.currentUser.getIdToken() : null
  }

  return {
    currentUser,
    isLoggedIn,
    role,
    authReady,
    waitForAuth: () => readyPromise,
    register,
    login,
    loginWithGoogle,
    logout,
    getIdToken,
  }
}
