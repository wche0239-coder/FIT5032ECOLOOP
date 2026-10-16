<script setup>
// BR (D.2) — email a table export as a PDF attachment.
// The PDF is built in the browser (BR E.4), then handed to the
// sendReportEmail Cloud Function (BR E.1), which sends it through
// SendGrid so the API key never reaches the browser.
import { ref, computed, watch } from 'vue'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase'
import { useAuth } from '../composables/useAuth'
import { useDialog } from '../composables/useDialog'
import { pdfBase64 } from '../utils/exporters'
import { required, isEmail, runValidators } from '../utils/validators'

const props = defineProps({
  // { title, filename, columns, rows } or null when closed
  report: { type: Object, default: null },
})
const emit = defineEmits(['close', 'sent'])

const { currentUser } = useAuth()
const panel = ref(null)
const to = ref('')
const note = ref('')
const touched = ref(false)
const sending = ref(false)
const serverError = ref('')

const isOpen = computed(() => !!props.report)
useDialog(isOpen, panel, () => !sending.value && emit('close'))

watch(isOpen, (open) => {
  if (!open) return
  to.value = currentUser.value?.email || ''
  note.value = ''
  touched.value = false
  serverError.value = ''
})

const toError = computed(() => runValidators(to.value, [required, isEmail]))
const noteError = computed(() => (note.value.length > 500 ? 'Keep the note under 500 characters.' : ''))

async function send() {
  touched.value = true
  serverError.value = ''
  if (toError.value || noteError.value) return

  sending.value = true
  try {
    const attachment = await pdfBase64({
      title: props.report.title,
      columns: props.report.columns,
      rows: props.report.rows,
    })
    const sendReportEmail = httpsCallable(functions, 'sendReportEmail')
    await sendReportEmail({
      to: to.value.trim(),
      reportTitle: props.report.title,
      note: note.value.trim(),
      filename: `${props.report.filename}.pdf`,
      pdfBase64: attachment,
    })
    emit('sent', to.value.trim())
    emit('close')
  } catch (err) {
    serverError.value = err?.message || 'Could not send the email. Please try again.'
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <div v-if="report" class="modal-backdrop-custom" @click.self="!sending && emit('close')">
    <div
      ref="panel"
      class="modal-card crate-card"
      role="dialog"
      aria-modal="true"
      aria-labelledby="email-dialog-title"
      aria-describedby="email-dialog-desc"
      tabindex="-1"
    >
      <form class="p-4" novalidate @submit.prevent="send">
        <div class="d-flex justify-content-between align-items-start mb-3">
          <div>
            <div class="eyebrow mb-1">Email as PDF</div>
            <h2 id="email-dialog-title" class="h6 mb-0">{{ report.title }}</h2>
          </div>
          <button type="button" class="btn-close" aria-label="Close dialog" :disabled="sending" @click="emit('close')"></button>
        </div>

        <p id="email-dialog-desc" class="small text-soft">
          Sends the {{ report.rows.length }} rows currently shown (with your search and sort applied) as a PDF attachment.
        </p>

        <div v-if="serverError" class="alert alert-danger py-2 small" role="alert">
          <i class="bi bi-exclamation-triangle me-1" aria-hidden="true"></i>{{ serverError }}
        </div>

        <label class="field-label" for="email-to">Send to</label>
        <input
          id="email-to"
          v-model="to"
          type="email"
          class="form-control"
          autocomplete="email"
          required
          autofocus
          :class="{ 'is-invalid': touched && toError }"
          :aria-invalid="!!(touched && toError)"
          :aria-describedby="touched && toError ? 'email-to-error' : undefined"
          @blur="touched = true"
        />
        <p v-if="touched && toError" id="email-to-error" class="field-error">
          <i class="bi bi-exclamation-circle" aria-hidden="true"></i>{{ toError }}
        </p>

        <label class="field-label mt-3" for="email-note">Note (optional)</label>
        <textarea
          id="email-note"
          v-model="note"
          rows="3"
          class="form-control"
          maxlength="500"
          aria-describedby="email-note-count"
          :class="{ 'is-invalid': noteError }"
        ></textarea>
        <p id="email-note-count" class="small text-soft mt-1 mb-0">{{ note.length }}/500 characters</p>

        <div class="d-flex gap-2 justify-content-end mt-3">
          <button type="button" class="btn btn-ghost" :disabled="sending" @click="emit('close')">Cancel</button>
          <button type="submit" class="btn btn-primary" :disabled="sending">
            <span v-if="sending" class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>
            {{ sending ? 'Sending…' : 'Send email' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop-custom {
  position: fixed;
  inset: 0;
  background: rgba(23, 33, 28, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1060;
  padding: 1rem;
}
.modal-card {
  width: 100%;
  max-width: 460px;
}
.modal-card:focus { outline: none; }
</style>
