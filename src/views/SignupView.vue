<script setup>
import { reactive, computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { required, minLength, isEmail, matches, runValidators } from '../utils/validators'

const router = useRouter()
const { register } = useAuth()

const form = reactive({ name: '', email: '', password: '', confirmPassword: '', accountType: 'individual' })
const touched = reactive({})
const submitted = ref(false)
const serverError = ref('')
const isSubmitting = ref(false)

const errors = computed(() => ({
  name: runValidators(form.name, [required, minLength(2)]),
  email: runValidators(form.email, [required, isEmail]),
  password: runValidators(form.password, [required, minLength(6)]),
  confirmPassword: runValidators(form.confirmPassword, [
    required,
    matches(form.password, 'Passwords do not match.'),
  ]),
}))
const hasErrors = computed(() => Object.values(errors.value).some(Boolean))
const showError = (f) => (submitted.value || touched[f]) && errors.value[f]

async function onSubmit() {
  submitted.value = true
  serverError.value = ''
  Object.keys(form).forEach((f) => (touched[f] = true))
  if (hasErrors.value) return

  isSubmitting.value = true
  try {
    await register({
      name: form.name,
      email: form.email,
      password: form.password,
      role: form.accountType,
    })
    router.push(form.accountType === 'business' ? '/business' : '/browse')
  } catch (err) {
    serverError.value = err.message || 'Something went wrong, please try again.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="section-pad">
    <div class="container" style="max-width: 460px;">
      <div class="eyebrow mb-1 text-center">Join EcoLoop</div>
      <h1 id="signup-heading" class="h3 mb-4 text-center">Create your account</h1>

      <form class="crate-card p-4" novalidate aria-labelledby="signup-heading" @submit.prevent="onSubmit">
        <div v-if="serverError" class="alert alert-danger py-2 small" role="alert">
          <i class="bi bi-exclamation-triangle me-1" aria-hidden="true"></i>{{ serverError }}
        </div>

        <fieldset class="mb-3">
        <legend class="field-label">I'm signing up as</legend>
        <div class="btn-group w-100" role="group">
          <input id="typeIndividual" v-model="form.accountType" type="radio" class="btn-check" value="individual" />
          <label class="btn btn-ghost" for="typeIndividual"><i class="bi bi-person me-1" aria-hidden="true"></i>Individual</label>
          <input id="typeBusiness" v-model="form.accountType" type="radio" class="btn-check" value="business" />
          <label class="btn btn-ghost" for="typeBusiness"><i class="bi bi-shop me-1" aria-hidden="true"></i>Business</label>
        </div>
        </fieldset>

        <label class="field-label" for="name">Full name</label>
        <input
          id="name" v-model="form.name" type="text" class="form-control mb-1"
          :class="{ 'is-invalid': showError('name') }"
          autocomplete="name" required
          :aria-invalid="!!showError('name')"
          :aria-describedby="showError('name') ? 'name-error' : undefined"
          placeholder="Jordan Blake"
          @blur="touched.name = true"
        />
        <p v-if="showError('name')" id="name-error" class="field-error"><i class="bi bi-exclamation-circle" aria-hidden="true"></i>{{ errors.name }}</p>

        <label class="field-label mt-3" for="email">Email</label>
        <input
          id="email" v-model="form.email" type="email" class="form-control mb-1"
          :class="{ 'is-invalid': showError('email') }"
          autocomplete="email" required
          :aria-invalid="!!showError('email')"
          :aria-describedby="showError('email') ? 'email-error' : undefined"
          placeholder="you@example.com"
          @blur="touched.email = true"
        />
        <p v-if="showError('email')" id="email-error" class="field-error"><i class="bi bi-exclamation-circle" aria-hidden="true"></i>{{ errors.email }}</p>

        <label class="field-label mt-3" for="password">Password</label>
        <input
          id="password" v-model="form.password" type="password" class="form-control mb-1"
          :class="{ 'is-invalid': showError('password') }"
          autocomplete="new-password" required
          :aria-invalid="!!showError('password')"
          :aria-describedby="showError('password') ? 'password-error' : undefined"
          placeholder="At least 6 characters"
          @blur="touched.password = true"
        />
        <p v-if="showError('password')" id="password-error" class="field-error"><i class="bi bi-exclamation-circle" aria-hidden="true"></i>{{ errors.password }}</p>

        <label class="field-label mt-3" for="confirmPassword">Confirm password</label>
        <input
          id="confirmPassword" v-model="form.confirmPassword" type="password" class="form-control mb-1"
          :class="{ 'is-invalid': showError('confirmPassword') }"
          autocomplete="new-password" required
          :aria-invalid="!!showError('confirmPassword')"
          :aria-describedby="showError('confirmPassword') ? 'confirmPassword-error' : undefined"
          placeholder="Repeat your password"
          @blur="touched.confirmPassword = true"
        />
        <p v-if="showError('confirmPassword')" id="confirmPassword-error" class="field-error"><i class="bi bi-exclamation-circle" aria-hidden="true"></i>{{ errors.confirmPassword }}</p>

        <button type="submit" class="btn btn-primary w-100 mt-3" :disabled="isSubmitting">
          {{ isSubmitting ? 'Creating account…' : 'Create account' }}
        </button>
        <p class="text-faint small text-center mt-3 mb-0">
          Already have an account? <router-link to="/login">Log in</router-link>
        </p>
      </form>
    </div>
  </div>
</template>
