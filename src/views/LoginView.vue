<script setup>
import { reactive, computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { required, minLength, isEmail, runValidators } from '../utils/validators'

const router = useRouter()
const route = useRoute()
const { login } = useAuth()

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

async function onSubmit() {
  submitted.value = true
  serverError.value = ''
  if (errors.value.email || errors.value.password) return

  isSubmitting.value = true
  try {
    const user = await login({ email: form.email, password: form.password })
    const redirect = route.query.redirect
    router.push(redirect || (user.role === 'admin' ? '/admin' : user.role === 'business' ? '/business' : '/browse'))
  } catch (err) {
    serverError.value = err.message || 'Something went wrong, please try again.'
  } finally {
    isSubmitting.value = false
  }
}

function fillDemoAdmin() {
  form.email = 'admin@ecoloop.com'
  form.password = 'admin123'
}
</script>

<template>
  <div class="section-pad">
    <div class="container" style="max-width: 420px;">
      <div class="eyebrow mb-1 text-center">Welcome back</div>
      <h1 class="h3 mb-4 text-center">Log in to EcoLoop</h1>

      <form class="crate-card p-4" @submit.prevent="onSubmit">
        <div v-if="serverError" class="alert alert-danger py-2 small" role="alert">
          <i class="bi bi-exclamation-triangle me-1"></i>{{ serverError }}
        </div>

        <label class="field-label" for="email">Email</label>
        <input
          id="email" v-model="form.email" type="email" class="form-control mb-1"
          :class="{ 'is-invalid': showError('email') }"
          placeholder="you@example.com"
          @blur="touched.email = true"
        />
        <p v-if="showError('email')" class="field-error"><i class="bi bi-exclamation-circle"></i>{{ errors.email }}</p>

        <label class="field-label mt-3" for="password">Password</label>
        <input
          id="password" v-model="form.password" type="password" class="form-control mb-1"
          :class="{ 'is-invalid': showError('password') }"
          placeholder="••••••••"
          @blur="touched.password = true"
        />
        <p v-if="showError('password')" class="field-error"><i class="bi bi-exclamation-circle"></i>{{ errors.password }}</p>

        <button type="submit" class="btn btn-primary w-100 mt-3" :disabled="isSubmitting">
          {{ isSubmitting ? 'Logging in…' : 'Log in' }}
        </button>
        <p class="text-faint small text-center mt-3 mb-0">
          No account yet? <router-link to="/signup">Sign up</router-link>
        </p>
      </form>

      <p class="text-faint small text-center mt-3">
        Demo admin account for testing —
        <button type="button" class="btn btn-link btn-sm p-0 align-baseline" @click="fillDemoAdmin">
          click to fill it in
        </button>
      </p>
    </div>
  </div>
</template>
