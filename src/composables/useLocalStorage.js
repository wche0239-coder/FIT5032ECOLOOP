import { ref, watch } from 'vue'

/**
 * useLocalStorage
 * A small reactive wrapper around window.localStorage.
 *
 * Satisfies BR (B.2): dynamic data is read out of a JS data
 * structure (a Vue ref) that is bound throughout the app, and
 * persisted to localStorage so it survives page reloads / new
 * sessions rather than resetting every time the app boots.
 *
 * @param {string} key - localStorage key
 * @param {*} defaultValue - value used the first time the app runs
 */
export function useLocalStorage(key, defaultValue) {
  let initial = defaultValue
  try {
    const raw = localStorage.getItem(key)
    if (raw !== null) initial = JSON.parse(raw)
  } catch (err) {
    console.warn(`[useLocalStorage] Could not read "${key}", using default.`, err)
  }

  const data = ref(initial)

  watch(
    data,
    (value) => {
      try {
        localStorage.setItem(key, JSON.stringify(value))
      } catch (err) {
        console.warn(`[useLocalStorage] Could not persist "${key}".`, err)
      }
    },
    { deep: true }
  )

  return data
}
