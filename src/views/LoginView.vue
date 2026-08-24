<script setup>
import { reactive, computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { required, minLength, isEmail, runValidators } from '../utils/validators'

const router = useRouter()
const { login } = useAuth()

const form = reactive({ email: '', password: '' })
const touched = reactive({})
const submitted = ref(false)

const errors = computed(() => ({
  email: runValidators(form.email, [required, isEmail]),
  password: runValidators(form.password, [required, minLength(6)]),
}))
const showError = (f) => (submitted.value || touched[f]) && errors.value[f]

function onSubmit() {
  submitted.value = true
  if (errors.value.email || errors.value.password) return
  const name = form.email.split('@')[0]
  login({ name: name.charAt(0).toUpperCase() + name.slice(1), email: form.email })
  router.push('/browse')
}
</script>

<template>
  <div class="section-pad">
    <div class="container" style="max-width: 420px;">
      <div class="eyebrow mb-1 text-center">Welcome back</div>
      <h1 class="h3 mb-4 text-center">Log in to EcoLoop</h1>

      <form class="crate-card p-4" @submit.prevent="onSubmit">
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

        <button type="submit" class="btn btn-primary w-100 mt-3">Log in</button>
        <p class="text-faint small text-center mt-3 mb-0">
          No account yet? <router-link to="/signup">Sign up</router-link>
        </p>
      </form>
    </div>
  </div>
</template>
