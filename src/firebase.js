// ---------------------------------------------------------------
// Firebase initialisation — BR (D.1) external authentication,
// BR (E.1) cloud functions.
//
// Config values come from Vite env vars (see .env.example) so the
// same code works locally and on the deployed site. The Firebase
// web config is not a secret (it identifies the project, it does
// not grant access) — access is controlled by Firestore Security
// Rules and Auth, see firestore.rules.
// ---------------------------------------------------------------
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getFunctions } from 'firebase/functions'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId)

if (!isFirebaseConfigured) {
  console.error(
    '[EcoLoop] Firebase is not configured. Copy .env.example to .env and fill in your Firebase web app config.'
  )
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
// Must match the region the functions are deployed to (functions/index.js).
export const functions = getFunctions(app, 'australia-southeast1')
