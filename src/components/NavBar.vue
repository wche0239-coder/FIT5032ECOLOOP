<script setup>
import { RouterLink, useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const { currentUser, isLoggedIn, logout } = useAuth()
const router = useRouter()

function handleLogout() {
  logout()
  router.push('/')
}
</script>

<template>
  <nav class="eco-navbar navbar navbar-expand-lg sticky-top">
    <div class="container">
      <RouterLink class="brand-mark navbar-brand" to="/">
        <i class="bi bi-arrow-repeat"></i> EcoLoop
      </RouterLink>

      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#ecoNav"
        aria-controls="ecoNav"
        aria-label="Toggle navigation"
      >
        <span class="navbar-toggler-icon"></span>
      </button>

      <div id="ecoNav" class="collapse navbar-collapse">
        <ul class="navbar-nav me-auto mb-2 mb-lg-0 ms-lg-4 gap-lg-3">
          <li class="nav-item">
            <RouterLink class="nav-link" to="/browse">Browse</RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink class="nav-link" to="/post-item">Post an item</RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink class="nav-link" to="/business">Business dashboard</RouterLink>
          </li>
        </ul>

        <div class="d-flex align-items-center gap-2">
          <template v-if="isLoggedIn">
            <span class="text-soft small d-none d-lg-inline">
              <i class="bi bi-person-circle me-1"></i>{{ currentUser.name }}
            </span>
            <button class="btn btn-ghost btn-sm" @click="handleLogout">Log out</button>
          </template>
          <template v-else>
            <RouterLink class="btn btn-ghost btn-sm" to="/login">Log in</RouterLink>
            <RouterLink class="btn btn-primary btn-sm" to="/signup">Sign up</RouterLink>
          </template>
        </div>
      </div>
    </div>
  </nav>
</template>
