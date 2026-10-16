<script setup>
import { ref, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import NavBar from './components/NavBar.vue'
import AppFooter from './components/AppFooter.vue'
import ConnectionBanner from './components/ConnectionBanner.vue'
import { flashMessage, clearFlash } from './composables/useFlash'

// BR (E.3) — in a single-page app the browser doesn't move focus when
// the "page" changes, so keyboard and screen-reader users would stay
// on the link they clicked. After each navigation, move focus to the
// new page's main heading (or <main>) so it's announced.
const route = useRoute()
const mainEl = ref(null)
let firstLoad = true

watch(
  () => route.path,
  async () => {
    if (firstLoad) {
      firstLoad = false
      return
    }
    await nextTick()
    // Wait for the fade transition to swap the page in.
    setTimeout(() => {
      const heading = mainEl.value?.querySelector('h1')
      if (heading) {
        heading.setAttribute('tabindex', '-1')
        heading.focus({ preventScroll: true })
      } else {
        mainEl.value?.focus({ preventScroll: true })
      }
    }, 200)
  }
)
</script>

<template>
  <a href="#main-content" class="skip-link" @click.prevent="mainEl?.focus()">Skip to main content</a>
  <NavBar />
  <ConnectionBanner />
  <div v-if="flashMessage" class="alert alert-warning rounded-0 mb-0 py-2 text-center small" role="alert">
    <i class="bi bi-exclamation-triangle me-1" aria-hidden="true"></i>{{ flashMessage }}
    <button type="button" class="btn-close btn-sm ms-2" aria-label="Dismiss message" @click="clearFlash"></button>
  </div>
  <main id="main-content" ref="mainEl" class="flex-grow-1" tabindex="-1">
    <router-view v-slot="{ Component, route: r }">
      <transition name="fade" mode="out-in">
        <component :is="Component" :key="r.fullPath" />
      </transition>
    </router-view>
  </main>
  <AppFooter />
</template>

<style>
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
h1[tabindex='-1']:focus { outline: none; }
</style>
