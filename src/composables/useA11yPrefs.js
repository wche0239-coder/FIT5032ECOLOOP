import { reactive, watch, computed } from 'vue'

// -----------------------------------------------------------------
// F.1 innovation — personal display and accessibility settings.
//
// WCAG 2.1 AA is the baseline every theme meets (BR E.3). These
// settings let each person go further for their own needs:
//   theme          soft mint (default), classic green, high contrast,
//                  or colour-blind safe (Okabe-Ito based)
//   textSize       larger text for low vision (1.4.4 Resize Text)
//   readableFont   Atkinson Hyperlegible, designed for low vision
//   underlineLinks links marked without relying on colour (1.4.1)
//   reduceMotion   no animations or smooth scrolling (2.3.3)
//
// Settings are applied as data attributes on <html>, so plain CSS
// in style.css does the work and every page follows automatically.
// They're remembered per browser in localStorage, wrapped in
// try/catch because private browsing can block storage.
// index.html applies the saved theme before the app loads, so the
// page never flashes in the wrong colours.
// -----------------------------------------------------------------

export const STORAGE_KEY = 'ecoloop_a11y_prefs'

export const THEMES = [
  {
    value: 'mint',
    label: 'Soft mint',
    hint: 'The standard EcoLoop look.',
    swatches: ['#F4FBF9', '#3EC1AC', '#127566', '#0D2B27'],
  },
  {
    value: 'classic',
    label: 'Classic green',
    hint: 'The original darker green design.',
    swatches: ['#EFF1EA', '#1F5C4D', '#C4501F', '#17211C'],
  },
  {
    value: 'contrast',
    label: 'High contrast',
    hint: 'Black on white, thick borders, bold focus.',
    swatches: ['#FFFFFF', '#000000', '#0040A0', '#FFBF00'],
  },
  {
    value: 'cvd',
    label: 'Colour-blind safe',
    hint: 'Blue and orange instead of red and green.',
    swatches: ['#F4FBF9', '#0072B2', '#E69F00', '#B2477E'],
  },
]
const THEME_VALUES = THEMES.map((t) => t.value)
export const TEXT_SIZES = ['normal', 'large', 'x-large']

/**
 * Chart colours per theme. Status colours are always paired with a
 * legend, tooltips and a "Show as table" view, so colour never carries
 * meaning on its own. High contrast adds texture (pattern) as well.
 */
export const CHART_PALETTES = {
  mint: {
    series: '#2A78D6',
    status: { Completed: '#0CA30C', Pending: '#FAB219', Cancelled: '#D03B3B' },
  },
  classic: {
    series: '#2A78D6',
    status: { Completed: '#0CA30C', Pending: '#FAB219', Cancelled: '#D03B3B' },
  },
  cvd: {
    series: '#0072B2',
    status: { Completed: '#0072B2', Pending: '#E69F00', Cancelled: '#B2477E' },
  },
  contrast: {
    series: '#000000',
    status: {
      Completed: '#000000',
      Pending: { pattern: 'hatch', color: '#000000' },
      Cancelled: { pattern: 'outline', color: '#000000' },
    },
  },
}

function systemDefaults() {
  const mq = (q) => typeof window !== 'undefined' && window.matchMedia?.(q).matches
  return {
    theme: mq('(prefers-contrast: more)') || mq('(forced-colors: active)') ? 'contrast' : 'mint',
    textSize: 'normal',
    readableFont: false,
    underlineLinks: false,
    reduceMotion: !!mq('(prefers-reduced-motion: reduce)'),
  }
}

/** Keep only known values, so a damaged saved setting can't break the page. */
export function sanitizePrefs(saved, defaults = systemDefaults()) {
  const p = { ...defaults }
  if (saved && typeof saved === 'object') {
    if (THEME_VALUES.includes(saved.theme)) p.theme = saved.theme
    if (TEXT_SIZES.includes(saved.textSize)) p.textSize = saved.textSize
    for (const k of ['readableFont', 'underlineLinks', 'reduceMotion']) {
      if (typeof saved[k] === 'boolean') p[k] = saved[k]
    }
  }
  return p
}

function load() {
  try {
    return sanitizePrefs(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'))
  } catch {
    return systemDefaults()
  }
}

const prefs = reactive(load())

let fontRequested = false
function loadReadableFont() {
  if (fontRequested || typeof document === 'undefined') return
  fontRequested = true
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&display=swap'
  document.head.appendChild(link)
}

const THEME_COLOR = { mint: '#3EC1AC', classic: '#1F5C4D', contrast: '#000000', cvd: '#3EC1AC' }

function apply() {
  const root = document.documentElement
  root.dataset.theme = prefs.theme
  root.dataset.textSize = prefs.textSize
  root.toggleAttribute('data-readable-font', prefs.readableFont)
  root.toggleAttribute('data-underline-links', prefs.underlineLinks)
  root.toggleAttribute('data-reduce-motion', prefs.reduceMotion)
  if (prefs.readableFont) loadReadableFont()
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[prefs.theme])
}

watch(
  prefs,
  () => {
    apply()
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
    } catch {
      /* storage unavailable: settings still apply for this visit */
    }
  },
  { deep: true }
)

// ---- Read aloud (Web Speech API, built into modern browsers) ----
const speech = reactive({ speaking: false })
const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

function readAloud(text) {
  if (!canSpeak || !text) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'en-AU'
  utterance.rate = 0.95
  utterance.onend = () => (speech.speaking = false)
  utterance.onerror = () => (speech.speaking = false)
  speech.speaking = true
  window.speechSynthesis.speak(utterance)
}

function stopReading() {
  if (canSpeak) window.speechSynthesis.cancel()
  speech.speaking = false
}

/** Text of the current page's main content. */
function mainContentText() {
  const main = document.getElementById('main-content')
  return main ? main.innerText.replace(/\s+\n/g, '\n').trim() : ''
}

export function initA11yPrefs() {
  apply()
}

/** Current theme, for code that draws its own colours (charts, map). */
export const currentTheme = computed(() => prefs.theme)
export const reduceMotion = computed(() => prefs.reduceMotion)

export function useA11yPrefs() {
  function reset() {
    Object.assign(prefs, systemDefaults())
  }
  return {
    prefs,
    reset,
    canSpeak,
    speech,
    readPage: () => readAloud(mainContentText()),
    stopReading,
  }
}
