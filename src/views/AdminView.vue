<script setup>
import { useAuth } from '../composables/useAuth'

const { users } = useAuth()
</script>

<template>
  <div class="section-pad">
    <div class="container">
      <span class="market-tag market-tag--rotate-r mb-2 d-inline-flex"><i class="bi bi-shield-lock"></i> Admin</span>
      <h1 class="h3 mb-2">Admin overview</h1>
      <p class="text-soft mb-4" style="max-width: 60ch;">
        This route is protected by the role-based navigation guard — only accounts
        with the <code>admin</code> role can reach this page. The full Admin
        Dashboard (user breakdown, platform-wide stats) is being built as part of
        the Category F innovation features.
      </p>

      <div class="crate-card p-4" style="max-width: 360px;">
        <div class="eyebrow mb-1">Registered accounts (skeleton stat)</div>
        <div class="stat-figure fs-2">{{ users.length }}</div>
        <p class="text-faint small mb-0">This will become a full breakdown by role and account type.</p>
      </div>
    </div>
  </div>
</template>
