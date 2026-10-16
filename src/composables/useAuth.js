import { ref, computed } from 'vue'
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
  signOut,
  sendPasswordResetEmail,
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

// Firebase stores emails in lower case, and firestore.rules checks the
// profile's email against the signed-in account's email. Always use the
// email Firebase returns (not what was typed) so "Kyle@Gmail.com" and
// "kyle@gmail.com" are treated as the same account.
function profileName(fbUser, typedName) {
  const name = (typedName || fbUser.displayName || fbUser.email.split('@')[0] || '').trim()
  return name.length >= 2 ? name.slice(0, 80) : 'EcoLoop member'
}

async function loadProfile(fbUser) {
  const snap = await getDoc(doc(db, 'users', fbUser.uid))
  if (snap.exists()) return snap.data()
  // First Google sign-in (or an earlier profile write that failed):
  // create a default profile now.
  const profile = {
    name: profileName(fbUser),
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
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/missing-email': 'Enter your email address.',
    'auth/unauthorized-continue-uri': 'Password reset is not set up for this web address yet.',
  }
  return new Error(map[err?.code] || err?.message || 'Something went wrong, please try again.')
}

export function useAuth() {
  const isLoggedIn = computed(() => !!currentUser.value)
  const role = computed(() => currentUser.value?.role ?? null)

  async function register({ name, email, password, role: chosenRole }) {
    let user
    try {
      ;({ user } = await createUserWithEmailAndPassword(auth, email.trim(), password))
    } catch (err) {
      throw friendlyError(err)
    }
    // From here the account exists. A problem saving the profile must not
    // look like a failed sign-up, so it's logged and the user carries on.
    const profile = {
      name: profileName(user, name),
      email: user.email,
      role: SELF_SERVICE_ROLES.includes(chosenRole) ? chosenRole : 'individual',
      createdAt: serverTimestamp(),
    }
    try {
      await updateProfile(user, { displayName: profile.name })
      await setDoc(doc(db, 'users', user.uid), profile)
    } catch (err) {
      console.error('[useAuth] Account created but profile could not be saved', err)
    }
    currentUser.value = toSessionUser(user, profile)
    return currentUser.value
  }

  // Signs in, then loads the profile. If only the profile load fails, the
  // person is still signed in (with the default role) instead of being
  // shown an error while the navbar says they're logged in.
  async function finishSignIn(user) {
    let profile = null
    try {
      profile = await loadProfile(user)
    } catch (err) {
      console.error('[useAuth] Signed in, but the profile could not be loaded', err)
    }
    currentUser.value = toSessionUser(user, profile)
    return currentUser.value
  }

  async function login({ email, password }) {
    let user
    try {
      ;({ user } = await signInWithEmailAndPassword(auth, email.trim(), password))
    } catch (err) {
      throw friendlyError(err)
    }
    return finishSignIn(user)
  }

  async function loginWithGoogle() {
    let user
    try {
      ;({ user } = await signInWithPopup(auth, new GoogleAuthProvider()))
    } catch (err) {
      throw friendlyError(err)
    }
    return finishSignIn(user)
  }

  /**
   * Sends Firebase's password-reset email. The link brings the person
   * back to our login page afterwards.
   *
   * Firebase's email-enumeration protection means this succeeds whether
   * or not an account exists, so the UI must show the same message
   * either way (it never reveals who has an account).
   */
  async function resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email.trim(), {
        url: `${window.location.origin}${window.location.pathname}#/login`,
      })
    } catch (err) {
      // An unknown email is not an error worth showing (see above).
      if (err?.code === 'auth/user-not-found') return
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
    resetPassword,
    logout,
    getIdToken,
  }
}
