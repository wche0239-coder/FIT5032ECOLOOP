import { ref } from 'vue'

// A tiny, non-persisted "flash message" — used by the router's
// navigation guard to explain *why* someone was redirected (e.g.
// "please log in" or "you don't have access to that page"). App.vue
// renders it as a dismissible banner at the top of the page.
export const flashMessage = ref('')

export function setFlash(message) {
  flashMessage.value = message
}

export function clearFlash() {
  flashMessage.value = ''
}
