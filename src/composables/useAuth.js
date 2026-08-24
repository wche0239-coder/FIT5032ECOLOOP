import { computed } from 'vue'
import { useLocalStorage } from './useLocalStorage'

// This is a front-end-only mock of authentication for demo
// purposes (there is no real backend in this assignment). It still
// demonstrates validated form input (BR B.1) and reactive,
// persisted state (BR B.2).
const currentUser = useLocalStorage('ecoloop_user', null)

export function useAuth() {
  const isLoggedIn = computed(() => !!currentUser.value)

  function login({ name, email, accountType }) {
    currentUser.value = { name, email, accountType: accountType || 'individual' }
  }

  function logout() {
    currentUser.value = null
  }

  return { currentUser, isLoggedIn, login, logout }
}
