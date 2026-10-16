<script setup>
import { useOnline } from '../composables/useOnline'
import { reactive, computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { required, minLength, isEmail, runValidators } from '../utils/validators'
const { isOnline } = useOnline()

const router = useRouter()
const route = useRoute()
const { login, loginWithGoogle } = useAuth()

const form = reactive({ email: '', password: '' })
const touched = reactive({})
const submitted = ref(false)
const serverError = ref('')
const isSubmitting = ref(false)

const errors = computed(() => ({
  email: runValidators(form.email, [required, isEmail]),
  password: runValidators(form.password, [required, minLength(6)]),
}))
const showError = (f) => (submitted.value || touched[f]) && errors.value[f]

function goAfterLogin(user) {
  const redirect = route.query.redirect
  router.push(redirect || (user.role === 'admin' ? '/admin' : user.role === 'business' ? '/business' : '/browse'))
}

async function onSubmit() {
  submitted.value = true
  serverError.value = ''
  if (errors.value.email || errors.value.password) return

  isSubmitting.value = true
  try {
    goAfterLogin(await login({ email: form.email, password: form.password }))
  } catch (err) {
    serverError.value = err.message || 'Something went wrong, please try again.'
  } finally {
    isSubmitting.value = false
  }
}

async function onGoogle() {
  serverError.value = ''
  isSubmitting.value = true
  try {
    goAfterLogin(await loginWithGoogle())
  } catch (err) {
    serverError.value = err.message
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="section-pad">
    <div class="container" style="max-width: 420px;">
      <div class="eyebrow mb-1 text-center">Welcome back</div>
      <h1 id="login-heading" class="h3 mb-4 text-center">Log in to EcoLoop</h1>

      <form class="crate-card p-4" novalidate aria-labelledby="login-heading" @submit.prevent="onSubmit">
        <div v-if="serverError" class="alert alert-danger py-2 small" role="alert">
          <i class="bi bi-exclamation-triangle me-1" aria-hidden="true"></i>{{ serverError }}
        </div>

        <label class="field-label" for="email">Email</label>
        <input
          id="email" v-model="form.email" type="email" class="form-control mb-1"
          autocomplete="email" required
          :aria-invalid="!!showError('email')"
          :aria-describedby="showError('email') ? 'email-error' : undefined"
          :class="{ 'is-invalid': showError('email') }"
          placeholder="you@example.com"
          @blur="touched.email = true"
        />
        <p v-if="showError('email')" id="email-error" class="field-error"><i class="bi bi-exclamation-circle" aria-hidden="true"></i>{{ errors.email }}</p>

        <div class="d-flex justify-content-between align-items-baseline mt-3">
          <label class="field-label mb-0" for="password">Password</label>
          <router-link
            class="small"
            :to="{ path: '/forgot-password', query: form.email ? { email: form.email } : {} }"
          >Forgot password?</router-link>
        </div>
        <input
          id="password" v-model="form.password" type="password" class="form-control mb-1 mt-1"
          autocomplete="current-password" required
          :aria-invalid="!!showError('password')"
          :aria-describedby="showError('password') ? 'password-error' : undefined"
          :class="{ 'is-invalid': showError('password') }"
          placeholder="••••••••"
          @blur="touched.password = true"
        />
        <p v-if="showError('password')" id="password-error" class="field-error"><i class="bi bi-exclamation-circle" aria-hidden="true"></i>{{ errors.password }}</p>

        <button type="submit" class="btn btn-primary w-100 mt-3" :disabled="isSubmitting || !isOnline">
          {{ isSubmitting ? 'Logging in…' : 'Log in' }}
        </button>
        <p v-if="!isOnline" class="small offline-note mt-2 mb-0">
          <i class="bi bi-wifi-off me-1" aria-hidden="true"></i>You're offline. Logging in needs an internet connection.
        </p>
        <div class="divider-or my-3" aria-hidden="true"><span>or</span></div>
        <button type="button" class="btn btn-ghost w-100" :disabled="isSubmitting || !isOnline" @click="onGoogle">
          <i class="bi bi-google me-1" aria-hidden="true"></i>Continue with Google
        </button>
        <p class="text-faint small text-center mt-3 mb-0">
          No account yet? <router-link to="/signup">Sign up</router-link>
        </p>
      </form>

    </div>
  </div>
</template>
