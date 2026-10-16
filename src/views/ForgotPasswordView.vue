<script setup>
// BR (D.1) — password reset through Firebase Auth.
// Firebase emails a secure, single-use link; the app never handles the
// new password. The confirmation message is the same whether or not an
// account exists, so this page can't be used to find out who's registered.
import { useOnline } from '../composables/useOnline'
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { required, isEmail, runValidators } from '../utils/validators'
const { isOnline } = useOnline()

const route = useRoute()
const { resetPassword } = useAuth()

const email = ref(typeof route.query.email === 'string' ? route.query.email : '')
const touched = ref(false)
const sending = ref(false)
const sent = ref(false)
const serverError = ref('')

const emailError = computed(() => runValidators(email.value, [required, isEmail]))
const showError = computed(() => touched.value && emailError.value)

async function onSubmit() {
  touched.value = true
  serverError.value = ''
  if (emailError.value) return
  sending.value = true
  try {
    await resetPassword(email.value)
    sent.value = true
  } catch (err) {
    serverError.value = err.message
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <div class="section-pad">
    <div class="container" style="max-width: 420px;">
      <div class="eyebrow mb-1 text-center">Account help</div>
      <h1 id="reset-heading" class="h3 mb-4 text-center">Reset your password</h1>

      <div v-if="sent" class="crate-card p-4" role="status">
        <p class="mb-2">
          <i class="bi bi-envelope-check me-1 text-success" aria-hidden="true"></i>
          If an EcoLoop account uses <strong>{{ email.trim() }}</strong>, a reset link is on its way.
        </p>
        <p class="small text-soft mb-3">
          The link expires in an hour. Check your spam folder if it hasn't arrived in a few minutes.
        </p>
        <router-link to="/login" class="btn btn-primary w-100">Back to log in</router-link>
        <button type="button" class="btn btn-link btn-sm w-100 mt-2" @click="sent = false">
          Use a different email
        </button>
      </div>

      <form v-else class="crate-card p-4" novalidate aria-labelledby="reset-heading" @submit.prevent="onSubmit">
        <p class="small text-soft">Enter the email you signed up with and we'll send you a link to choose a new password.</p>

        <div v-if="serverError" class="alert alert-danger py-2 small" role="alert">
          <i class="bi bi-exclamation-triangle me-1" aria-hidden="true"></i>{{ serverError }}
        </div>

        <label class="field-label" for="reset-email">Email</label>
        <input
          id="reset-email"
          v-model="email"
          type="email"
          class="form-control mb-1"
          autocomplete="email"
          required
          :aria-invalid="!!showError"
          :aria-describedby="showError ? 'reset-email-error' : undefined"
          :class="{ 'is-invalid': showError }"
          placeholder="you@example.com"
          @blur="touched = true"
        />
        <p v-if="showError" id="reset-email-error" class="field-error">
          <i class="bi bi-exclamation-circle" aria-hidden="true"></i>{{ emailError }}
        </p>

        <button type="submit" class="btn btn-primary w-100 mt-3" :disabled="sending || !isOnline">
          {{ sending ? 'Sending…' : 'Send reset link' }}
        </button>
        <p class="text-faint small text-center mt-3 mb-0">
          Remembered it? <router-link to="/login">Log in</router-link>
        </p>
      </form>
    </div>
  </div>
</template>
