import { ref } from 'vue'

// F.1 offline feature 1: know whether the device is online.
// One shared reactive flag, updated by the browser's online/offline
// events, so any component can pause actions that need the internet and
// say why, instead of failing with a confusing error.
const isOnline = ref(typeof navigator === 'undefined' ? true : navigator.onLine)
const justReconnected = ref(false)
let timer = null

if (typeof window !== 'undefined') {
  window.addEventListener('offline', () => {
    isOnline.value = false
    justReconnected.value = false
  })
  window.addEventListener('online', () => {
    isOnline.value = true
    justReconnected.value = true
    clearTimeout(timer)
    timer = setTimeout(() => (justReconnected.value = false), 4000)
  })
}

export const OFFLINE_HINT = 'Needs an internet connection. You are offline.'

export function useOnline() {
  return { isOnline, justReconnected }
}
