<script setup>
// F.1 bulk email: compose an announcement to the users selected in the
// Admin dashboard. Sending happens in the sendBulkEmail Cloud Function,
// which looks up addresses from user ids and sends each person their own copy.
import { ref, computed, watch } from 'vue'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase'
import { useDialog } from '../composables/useDialog'

const props = defineProps({
  // [{ id, name, email }] or null when closed
  recipients: { type: Array, default: null },
})
const emit = defineEmits(['close', 'sent'])

const panel = ref(null)
const subject = ref('')
const message = ref('')
const touched = ref(false)
const sending = ref(false)
const serverError = ref('')

const isOpen = computed(() => !!props.recipients)
useDialog(isOpen, panel, () => !sending.value && emit('close'))

watch(isOpen, (open) => {
  if (!open) return
  touched.value = false
  serverError.value = ''
})

const subjectError = computed(() => {
  const s = subject.value.trim()
  if (!s) return 'Add a subject.'
  if (s.length < 3) return 'Subject must be at least 3 characters.'
  if (s.length > 120) return 'Subject must be 120 characters or fewer.'
  return ''
})
const messageError = computed(() => {
  const m = message.value.trim()
  if (!m) return 'Write a message.'
  if (m.length < 10) return 'Message must be at least 10 characters.'
  return ''
})

const shownNames = computed(() => {
  const names = (props.recipients || []).map((r) => r.name)
  return names.length <= 4 ? names.join(', ') : `${names.slice(0, 3).join(', ')} and ${names.length - 3} more`
})

async function send() {
  touched.value = true
  serverError.value = ''
  if (subjectError.value || messageError.value) return
  sending.value = true
  try {
    const sendBulkEmail = httpsCallable(functions, 'sendBulkEmail')
    const { data } = await sendBulkEmail({
      uids: props.recipients.map((r) => r.id),
      subject: subject.value.trim(),
      message: message.value.trim(),
    })
    emit('sent', data)
    subject.value = ''
    message.value = ''
    emit('close')
  } catch (err) {
    serverError.value = err?.message || 'Could not send the announcement. Please try again.'
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <div v-if="recipients" class="modal-backdrop-custom" @click.self="!sending && emit('close')">
    <div
      ref="panel"
      class="modal-card crate-card"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-title"
      aria-describedby="bulk-desc"
      tabindex="-1"
    >
      <form class="p-4" novalidate @submit.prevent="send">
        <div class="d-flex justify-content-between align-items-start mb-2">
          <h2 id="bulk-title" class="h5 mb-0">Email {{ recipients.length }} {{ recipients.length === 1 ? 'person' : 'people' }}</h2>
          <button type="button" class="btn-close" aria-label="Close dialog" :disabled="sending" @click="emit('close')"></button>
        </div>
        <p id="bulk-desc" class="small text-soft">
          To: {{ shownNames }}. Each person gets their own copy, so nobody sees who else received it.
        </p>

        <div v-if="serverError" class="alert alert-danger py-2 small" role="alert">
          <i class="bi bi-exclamation-triangle me-1" aria-hidden="true"></i>{{ serverError }}
        </div>

        <label class="field-label" for="bulk-subject">Subject</label>
        <input
          id="bulk-subject"
          v-model="subject"
          type="text"
          class="form-control"
          maxlength="120"
          autofocus
          :class="{ 'is-invalid': touched && subjectError }"
          :aria-invalid="!!(touched && subjectError)"
          :aria-describedby="touched && subjectError ? 'bulk-subject-error' : undefined"
          placeholder="e.g. Repair café this Saturday in Fitzroy"
        />
        <p v-if="touched && subjectError" id="bulk-subject-error" class="field-error">
          <i class="bi bi-exclamation-circle" aria-hidden="true"></i>{{ subjectError }}
        </p>

        <label class="field-label mt-3" for="bulk-message">Message</label>
        <textarea
          id="bulk-message"
          v-model="message"
          rows="7"
          class="form-control"
          maxlength="5000"
          :class="{ 'is-invalid': touched && messageError }"
          :aria-invalid="!!(touched && messageError)"
          :aria-describedby="touched && messageError ? 'bulk-message-error bulk-count' : 'bulk-count'"
        ></textarea>
        <p v-if="touched && messageError" id="bulk-message-error" class="field-error">
          <i class="bi bi-exclamation-circle" aria-hidden="true"></i>{{ messageError }}
        </p>
        <p id="bulk-count" class="small text-soft mt-1 mb-0">
          {{ message.length }}/5000 characters. Each email starts with “Hi &lt;name&gt;,”.
        </p>

        <div class="d-flex gap-2 justify-content-end mt-3">
          <button type="button" class="btn btn-ghost" :disabled="sending" @click="emit('close')">Cancel</button>
          <button type="submit" class="btn btn-primary" :disabled="sending">
            <span v-if="sending" class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>
            {{ sending ? 'Sending…' : `Send to ${recipients.length}` }}
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
.modal-card { width: 100%; max-width: 520px; max-height: calc(100vh - 2rem); overflow-y: auto; }
.modal-card:focus { outline: none; }
</style>
