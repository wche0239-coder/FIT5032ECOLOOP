<script setup>
// Reusable "are you sure?" dialog for destructive actions.
// Uses useDialog for focus trap / Escape / focus return (BR E.3).
// Focus starts on Cancel, so pressing Enter by accident is safe.
import { ref, computed } from 'vue'
import { useDialog } from '../composables/useDialog'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, required: true },
  message: { type: String, default: '' },
  confirmLabel: { type: String, default: 'Delete' },
})
const emit = defineEmits(['confirm', 'cancel'])

const panel = ref(null)
useDialog(computed(() => props.open), panel, () => emit('cancel'))
</script>

<template>
  <div v-if="open" class="modal-backdrop-custom" @click.self="emit('cancel')">
    <div
      ref="panel"
      class="modal-card crate-card p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
      tabindex="-1"
    >
      <h2 id="confirm-title" class="h6 mb-2">
        <i class="bi bi-exclamation-triangle text-danger me-1" aria-hidden="true"></i>{{ title }}
      </h2>
      <p id="confirm-message" class="text-soft small mb-3">{{ message }}</p>
      <div class="d-flex gap-2 justify-content-end">
        <button type="button" class="btn btn-ghost" autofocus @click="emit('cancel')">Cancel</button>
        <button type="button" class="btn btn-danger" @click="emit('confirm')">{{ confirmLabel }}</button>
      </div>
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
  max-width: 420px;
}
.modal-card:focus { outline: none; }
.btn-danger { background: var(--danger); border-color: var(--danger); }
.btn-danger:hover { background: #7E1F16; border-color: #7E1F16; }
</style>
