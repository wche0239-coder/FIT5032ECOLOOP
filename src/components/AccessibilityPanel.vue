<script setup>
// F.1 — "Accessibility" button in the navbar that opens a settings
// dialog. Every control is a native form control with a label, so it
// works with keyboard, screen readers and switch access. Changes apply
// immediately (no Save step) and are announced to screen readers.
import { ref, computed } from 'vue'
import { useDialog } from '../composables/useDialog'
import { useA11yPrefs, THEMES } from '../composables/useA11yPrefs'

const { prefs, reset, canSpeak, speech, readPage, stopReading } = useA11yPrefs()

const open = ref(false)
const panel = ref(null)
useDialog(computed(() => open.value), panel, () => (open.value = false))

const sizes = [
  { value: 'normal', label: 'Standard' },
  { value: 'large', label: 'Large' },
  { value: 'x-large', label: 'Extra large' },
]

const toggles = [
  { key: 'readableFont', label: 'Easy-to-read font', hint: 'Atkinson Hyperlegible, designed for low vision.' },
  { key: 'underlineLinks', label: 'Highlight links', hint: 'Underline and shade every link.' },
  { key: 'reduceMotion', label: 'Reduce motion', hint: 'Turn off animations and smooth scrolling.' },
]

const announcement = ref('')
function announce(text) {
  announcement.value = ''
  setTimeout(() => (announcement.value = text), 50)
}

function onTheme(t) {
  announce(`${t.label} theme on.`)
}

function onReset() {
  reset()
  announce('Display settings reset to default.')
}

function onRead() {
  // Close the dialog first so the page behind it is what gets read.
  open.value = false
  setTimeout(readPage, 250)
}
</script>

<template>
  <button
    type="button"
    class="btn btn-ghost btn-sm a11y-trigger text-nowrap"
    aria-haspopup="dialog"
    :aria-expanded="open"
    @click="open = true"
  >
    <i class="bi bi-universal-access-circle" aria-hidden="true"></i>
    <span class="ms-1">Accessibility</span>
  </button>

  <!-- Floating stop control while the page is being read aloud -->
  <button
    v-if="speech.speaking"
    type="button"
    class="btn btn-primary btn-sm stop-reading"
    @click="stopReading"
  >
    <i class="bi bi-stop-circle me-1" aria-hidden="true"></i>Stop reading
  </button>

  <Teleport to="body">
    <div v-if="open" class="a11y-backdrop" @click.self="open = false">
      <div
        ref="panel"
        class="a11y-card crate-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="a11y-title"
        aria-describedby="a11y-desc"
        tabindex="-1"
      >
        <div class="p-4">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <h2 id="a11y-title" class="h5 mb-0">
              <i class="bi bi-universal-access-circle me-1" aria-hidden="true"></i>Accessibility settings
            </h2>
            <button type="button" class="btn-close" aria-label="Close accessibility settings" @click="open = false"></button>
          </div>
          <p id="a11y-desc" class="small text-soft mb-3">
            Changes apply straight away and are remembered on this device.
          </p>

          <fieldset class="mb-3">
            <legend class="field-label">Colour theme</legend>
            <div class="theme-grid">
              <div v-for="t in THEMES" :key="t.value" class="theme-option">
                <input
                  :id="`theme-${t.value}`"
                  v-model="prefs.theme"
                  type="radio"
                  class="theme-input"
                  name="a11y-theme"
                  :value="t.value"
                  :aria-describedby="`theme-${t.value}-hint`"
                  @change="onTheme(t)"
                />
                <label class="theme-label" :for="`theme-${t.value}`">
                  <span class="swatches" aria-hidden="true">
                    <span v-for="c in t.swatches" :key="c" class="swatch" :style="{ background: c }"></span>
                  </span>
                  <span class="fw-semibold d-block">{{ t.label }}</span>
                  <span :id="`theme-${t.value}-hint`" class="small text-soft d-block">{{ t.hint }}</span>
                </label>
              </div>
            </div>
          </fieldset>

          <fieldset class="mb-3">
            <legend class="field-label">Text size</legend>
            <div class="btn-group w-100" role="group">
              <template v-for="s in sizes" :key="s.value">
                <input
                  :id="`text-size-${s.value}`"
                  v-model="prefs.textSize"
                  type="radio"
                  class="btn-check"
                  name="a11y-text-size"
                  :value="s.value"
                />
                <label class="btn btn-ghost btn-sm" :for="`text-size-${s.value}`">{{ s.label }}</label>
              </template>
            </div>
          </fieldset>

          <fieldset class="mb-3">
            <legend class="field-label">Reading</legend>
            <div v-for="t in toggles" :key="t.key" class="form-check form-switch mb-2">
              <input
                :id="`a11y-${t.key}`"
                v-model="prefs[t.key]"
                class="form-check-input"
                type="checkbox"
                role="switch"
                :aria-describedby="`a11y-${t.key}-hint`"
              />
              <label class="form-check-label fw-semibold" :for="`a11y-${t.key}`">{{ t.label }}</label>
              <div :id="`a11y-${t.key}-hint`" class="small text-soft">{{ t.hint }}</div>
            </div>
          </fieldset>

          <fieldset class="mb-3">
            <legend class="field-label">Read aloud</legend>
            <template v-if="canSpeak">
              <button type="button" class="btn btn-ghost btn-sm" @click="onRead">
                <i class="bi bi-volume-up me-1" aria-hidden="true"></i>Read this page aloud
              </button>
              <p class="small text-soft mt-1 mb-0">Uses your device's built-in voice. A “Stop reading” button stays on screen.</p>
            </template>
            <p v-else class="small text-soft mb-0">Your browser doesn't support reading aloud.</p>
          </fieldset>

          <div class="d-flex justify-content-between">
            <button type="button" class="btn btn-ghost btn-sm" @click="onReset">Reset to default</button>
            <button type="button" class="btn btn-primary btn-sm" @click="open = false">Done</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <div class="visually-hidden" role="status" aria-live="polite">{{ announcement }}</div>
</template>

<style scoped>
.a11y-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(13, 32, 30, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1070;
  padding: 1rem;
}
.a11y-card {
  width: 100%;
  max-width: 480px;
  max-height: calc(100vh - 2rem);
  overflow-y: auto;
}
.a11y-card:focus { outline: none; }

.theme-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
}
@media (max-width: 379.98px) {
  .theme-grid { grid-template-columns: 1fr; }
}
.theme-option { position: relative; }
/* The real radio stays in the page (keyboard + screen readers);
   the bordered label is the visible control. */
.theme-input {
  position: absolute;
  opacity: 0;
  width: 1px;
  height: 1px;
}
.theme-label {
  display: block;
  height: 100%;
  padding: 0.6rem 0.7rem;
  border: 1.5px solid var(--line-strong);
  border-radius: var(--radius-md);
  background: var(--panel);
  cursor: pointer;
  line-height: 1.3;
}
.theme-input:checked + .theme-label {
  border: 2.5px solid var(--signal);
  padding: calc(0.6rem - 1px) calc(0.7rem - 1px);
  background: var(--signal-tint);
}
/* A tick, so the chosen theme isn't shown by border colour alone. */
.theme-input:checked + .theme-label::after {
  content: '\2713';
  position: absolute;
  top: 0.4rem;
  right: 0.6rem;
  font-weight: 700;
  color: var(--signal);
}
.theme-input:focus-visible + .theme-label {
  outline: 3px solid var(--focus);
  outline-offset: 2px;
}
.swatches { display: flex; gap: 3px; margin-bottom: 0.35rem; }
.swatch {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.35);
}
.stop-reading {
  position: fixed;
  left: 1rem;
  bottom: 1rem;
  z-index: 1075;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
}
.form-switch .form-check-input { width: 2.4em; height: 1.25em; }
</style>
