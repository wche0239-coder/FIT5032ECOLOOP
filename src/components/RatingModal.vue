<script setup>
import { ref, computed, watch } from 'vue'
import { useDialog } from '../composables/useDialog'
import { useRatings } from '../composables/useRatings'
import { useAuth } from '../composables/useAuth'
import { required, runValidators } from '../utils/validators'
import StarRating from './StarRating.vue'

const props = defineProps({
  // target: { type: 'listing' | 'seller', id: string, label: string }
  target: { type: Object, default: null },
})
const emit = defineEmits(['close'])

const { rateListing, rateSeller } = useRatings()
const { currentUser } = useAuth()

const value = ref(0)
const comment = ref('')
const touched = ref(false)
const error = ref('')
const done = ref(false)
const panel = ref(null)
useDialog(computed(() => !!props.target), panel, () => emit('close'))

watch(
  () => props.target,
  () => {
    value.value = 0
    comment.value = ''
    touched.value = false
    error.value = ''
    done.value = false
  }
)

function validate() {
  error.value = value.value === 0 ? 'Please select a star rating.' : runValidators(comment.value, [])
  return !error.value
}

function submit() {
  touched.value = true
  if (!validate()) return
  const byUser = currentUser.value?.name || 'Anonymous'
  if (props.target.type === 'listing') {
    rateListing(props.target.id, value.value, comment.value, byUser)
  } else {
    rateSeller(props.target.id, value.value, comment.value, byUser)
  }
  done.value = true
}
</script>

<template>
  <div v-if="target" class="modal-backdrop-custom" @click.self="emit('close')">
    <div
      ref="panel"
      class="modal-card crate-card"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rating-dialog-title"
      tabindex="-1"
    >
      <div class="p-4">
        <div class="d-flex justify-content-between align-items-start mb-3">
          <div>
            <div class="eyebrow mb-1">Rate {{ target.type === 'listing' ? 'this item' : 'this seller' }}</div>
            <h2 id="rating-dialog-title" class="h6 mb-0">{{ target.label }}</h2>
          </div>
          <button type="button" class="btn-close" aria-label="Close dialog" @click="emit('close')"></button>
        </div>

        <template v-if="!done">
          <p id="ratingStarsLabel" class="field-label mb-1">Your rating</p>
          <StarRating v-model="value" size="1.6rem" :label="`Your rating for ${target.label}`" />
          <p v-if="touched && error && value === 0" class="field-error" role="alert"><i class="bi bi-exclamation-circle" aria-hidden="true"></i>{{ error }}</p>

          <label class="field-label mt-3" for="ratingComment">Comment (optional)</label>
          <textarea
            id="ratingComment" v-model="comment" rows="3" class="form-control"
            placeholder="What was your experience like?"
          ></textarea>

          <div class="d-flex gap-2 justify-content-end mt-3">
            <button type="button" class="btn btn-ghost" @click="emit('close')">Cancel</button>
            <button type="button" class="btn btn-primary" @click="submit">Submit rating</button>
          </div>
        </template>

        <template v-else>
          <div class="text-center py-3" role="status">
            <i class="bi bi-check-circle text-success" style="font-size: 2rem;" aria-hidden="true"></i>
            <p class="mb-0 mt-2 fw-semibold">Thanks for your feedback!</p>
            <button type="button" class="btn btn-primary mt-3" @click="emit('close')">Done</button>
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
