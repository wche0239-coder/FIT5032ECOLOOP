<script setup>
import { ref, computed, watch } from 'vue'
import { useDialog } from '../composables/useDialog'
import { required, minLength, runValidators } from '../utils/validators'
import MarketTag from './MarketTag.vue'

const props = defineProps({
  listing: { type: Object, default: null },
})
const emit = defineEmits(['close', 'sent'])

const message = ref('')
const error = ref('')
const touched = ref(false)
const sent = ref(false)
const panel = ref(null)
useDialog(computed(() => !!props.listing), panel, () => emit('close'))

watch(
  () => props.listing,
  () => {
    message.value = ''
    error.value = ''
    touched.value = false
    sent.value = false
  }
)

function validate() {
  error.value = runValidators(message.value, [required, minLength(10)])
  return !error.value
}

function onSubmit() {
  touched.value = true
  if (!validate()) return
  emit('sent', message.value)
  sent.value = true
}
</script>

<template>
  <div v-if="listing" class="modal-backdrop-custom" @click.self="emit('close')">
    <div
      ref="panel"
      class="modal-card crate-card"
      role="dialog"
      aria-modal="true"
      aria-labelledby="request-dialog-title"
      tabindex="-1"
    >
      <div class="p-4">
        <div class="d-flex justify-content-between align-items-start mb-3">
          <div>
            <div class="eyebrow mb-1">Request item</div>
            <h2 id="request-dialog-title" class="h5 mb-0">{{ listing.title }}</h2>
          </div>
          <button type="button" class="btn-close" aria-label="Close dialog" @click="emit('close')"></button>
        </div>

        <div class="d-flex align-items-center gap-2 mb-3">
          <MarketTag :variant="listing.isFree ? 'free' : 'price'">
            {{ listing.isFree ? 'FREE' : `$${listing.price}` }}
          </MarketTag>
          <span class="text-faint small">Listed by {{ listing.ownerName }} · {{ listing.suburb }}</span>
        </div>

        <template v-if="!sent">
          <label class="field-label" for="reqMessage">Message to the lister</label>
          <textarea
            id="reqMessage"
            v-model="message"
            rows="4"
            class="form-control"
            :class="{ 'is-invalid': touched && error }"
            :aria-invalid="!!(touched && error)"
            aria-describedby="reqMessage-hint"
            :aria-errormessage="touched && error ? 'reqMessage-error' : undefined"
            placeholder="Introduce yourself and suggest a pickup time..."
            @blur="touched = true; validate()"
          ></textarea>
          <p v-if="touched && error" id="reqMessage-error" class="field-error" role="alert">
            <i class="bi bi-exclamation-circle" aria-hidden="true"></i>{{ error }}
          </p>
          <p id="reqMessage-hint" class="text-faint small mt-2 mb-3">
            Pickup window: {{ listing.pickupWindow }}
          </p>
          <div class="d-flex gap-2 justify-content-end">
            <button type="button" class="btn btn-ghost" @click="emit('close')">Cancel</button>
            <button type="button" class="btn btn-primary" @click="onSubmit">Send request</button>
          </div>
        </template>

        <template v-else>
          <div class="text-center py-3" role="status">
            <i class="bi bi-check-circle text-success" style="font-size: 2rem;" aria-hidden="true"></i>
            <p class="mb-0 mt-2 fw-semibold">Request sent to {{ listing.ownerName.split(' — ')[0] }}</p>
            <p class="text-soft small">They'll usually reply within a day.</p>
            <button type="button" class="btn btn-primary mt-2" @click="emit('close')">Done</button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop-custom {
  position: fixed;
  inset: 0;
  background: rgba(35, 36, 32, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1060;
  padding: 1rem;
}
.modal-card:focus { outline: none; }
.modal-card {
  width: 100%;
  max-width: 420px;
  background: var(--bg);
}
</style>
