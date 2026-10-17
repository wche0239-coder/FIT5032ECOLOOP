<script setup>
// Shows when the device goes offline, and briefly when it reconnects.
// role="status" means screen readers announce both changes.
import { useOnline } from '../composables/useOnline'

const { isOnline, justReconnected } = useOnline()
</script>

<template>
  <div role="status" aria-live="polite" class="connection-banner-region">
    <div v-if="!isOnline" class="connection-banner connection-banner--offline">
      <i class="bi bi-wifi-off me-2" aria-hidden="true"></i>
      <span>
        <strong>You're offline.</strong>
        You can keep browsing and writing listings. Your draft is saved on this device.
        Sending email, maps and signing in will work again when you reconnect.
      </span>
    </div>
    <div v-else-if="justReconnected" class="connection-banner connection-banner--online">
      <i class="bi bi-wifi me-2" aria-hidden="true"></i>
      <span><strong>You're back online.</strong> Everything is available again.</span>
    </div>
  </div>
</template>

<style scoped>
.connection-banner {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 0.55rem max(16px, env(safe-area-inset-right, 0px)) 0.55rem max(16px, env(safe-area-inset-left, 0px));
  font-size: 0.88rem;
  text-align: left;
}
.connection-banner--offline { background: #3B3F3C; color: #FFFFFF; }
.connection-banner--online { background: var(--signal-tint, #DEEAE4); color: var(--signal-dark, #123D33); }
</style>
