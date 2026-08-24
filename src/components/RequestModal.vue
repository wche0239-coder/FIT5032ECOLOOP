<script setup>
import { ref, watch } from 'vue'
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
    <div class="modal-card crate-card">
      <div class="p-4">
        <div class="d-flex justify-content-between align-items-start mb-3">
          <div>
            <div class="eyebrow mb-1">Request item</div>
            <h3 class="h5 mb-0">{{ listing.title }}</h3>
          </div>
          <button class="btn-close" aria-label="Close" @click="emit('close')"></button>
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
            placeholder="Introduce yourself and suggest a pickup time..."
            @blur="touched = true; validate()"
          ></textarea>
          <p v-if="touched && error" class="field-error">
            <i class="bi bi-exclamation-circle"></i>{{ error }}
          </p>
          <p class="text-faint small mt-2 mb-3">
            Pickup window: {{ listing.pickupWindow }}
          </p>
          <div class="d-flex gap-2 justify-content-end">
            <button class="btn btn-ghost" @click="emit('close')">Cancel</button>
            <button class="btn btn-primary" @click="onSubmit">Send request</button>
          </div>
        </template>

        <template v-else>
          <div class="text-center py-3">
            <i class="bi bi-check-circle text-success" style="font-size: 2rem;"></i>
            <p class="mb-0 mt-2 fw-semibold">Request sent to {{ listing.ownerName.split(' — ')[0] }}</p>
            <p class="text-soft small">They'll usually reply within a day.</p>
            <button class="btn btn-primary mt-2" @click="emit('close')">Done</button>
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
.modal-card {
  width: 100%;
  max-width: 420px;
  background: var(--bg);
}
</style>
