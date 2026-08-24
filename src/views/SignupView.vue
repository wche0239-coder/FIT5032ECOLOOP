<script setup>
import { reactive, computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { required, minLength, isEmail, matches, runValidators } from '../utils/validators'

const router = useRouter()
const { login } = useAuth()

const form = reactive({ name: '', email: '', password: '', confirmPassword: '', accountType: 'individual' })
const touched = reactive({})
const submitted = ref(false)

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

function onSubmit() {
  submitted.value = true
  Object.keys(form).forEach((f) => (touched[f] = true))
  if (hasErrors.value) return
  login({ name: form.name, email: form.email, accountType: form.accountType })
  router.push(form.accountType === 'business' ? '/business' : '/browse')
}
</script>

<template>
  <div class="section-pad">
    <div class="container" style="max-width: 460px;">
      <div class="eyebrow mb-1 text-center">Join EcoLoop</div>
      <h1 class="h3 mb-4 text-center">Create your account</h1>

      <form class="crate-card p-4" @submit.prevent="onSubmit">
        <label class="field-label" for="accountType">I'm signing up as</label>
        <div class="btn-group w-100 mb-3" role="group">
          <input id="typeIndividual" v-model="form.accountType" type="radio" class="btn-check" value="individual" />
          <label class="btn btn-ghost" for="typeIndividual"><i class="bi bi-person me-1"></i>Individual</label>
          <input id="typeBusiness" v-model="form.accountType" type="radio" class="btn-check" value="business" />
          <label class="btn btn-ghost" for="typeBusiness"><i class="bi bi-shop me-1"></i>Business</label>
        </div>

        <label class="field-label" for="name">Full name</label>
        <input
          id="name" v-model="form.name" type="text" class="form-control mb-1"
          :class="{ 'is-invalid': showError('name') }"
          placeholder="Jordan Blake"
          @blur="touched.name = true"
        />
        <p v-if="showError('name')" class="field-error"><i class="bi bi-exclamation-circle"></i>{{ errors.name }}</p>

        <label class="field-label mt-3" for="email">Email</label>
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
          placeholder="At least 6 characters"
          @blur="touched.password = true"
        />
        <p v-if="showError('password')" class="field-error"><i class="bi bi-exclamation-circle"></i>{{ errors.password }}</p>

        <label class="field-label mt-3" for="confirmPassword">Confirm password</label>
        <input
          id="confirmPassword" v-model="form.confirmPassword" type="password" class="form-control mb-1"
          :class="{ 'is-invalid': showError('confirmPassword') }"
          placeholder="Repeat your password"
          @blur="touched.confirmPassword = true"
        />
        <p v-if="showError('confirmPassword')" class="field-error"><i class="bi bi-exclamation-circle"></i>{{ errors.confirmPassword }}</p>

        <button type="submit" class="btn btn-primary w-100 mt-3">Create account</button>
        <p class="text-faint small text-center mt-3 mb-0">
          Already have an account? <router-link to="/login">Log in</router-link>
        </p>
      </form>
    </div>
  </div>
</template>
