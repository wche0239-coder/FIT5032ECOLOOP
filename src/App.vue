<script setup>
import NavBar from './components/NavBar.vue'
import AppFooter from './components/AppFooter.vue'
import { flashMessage, clearFlash } from './composables/useFlash'
</script>

<template>
  <NavBar />
  <div v-if="flashMessage" class="alert alert-warning rounded-0 mb-0 py-2 text-center small" role="alert">
    <i class="bi bi-exclamation-triangle me-1"></i>{{ flashMessage }}
    <button type="button" class="btn-close btn-sm ms-2" aria-label="Dismiss" @click="clearFlash"></button>
  </div>
  <main class="flex-grow-1">
    <router-view v-slot="{ Component, route }">
      <transition name="fade" mode="out-in">
        <component :is="Component" :key="route.fullPath" />
      </transition>
    </router-view>
  </main>
  <AppFooter />
</template>

<style>
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
