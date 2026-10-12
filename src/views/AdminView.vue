<script setup>
import { ref, computed, onMounted } from 'vue'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase'

// Admin-only page. Reading the whole users collection is only allowed
// for admins by firestore.rules, so this is enforced server-side too.
const users = ref([])
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    const snap = await getDocs(collection(db, 'users'))
    users.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  } catch (err) {
    error.value = 'Could not load accounts: ' + err.message
  } finally {
    loading.value = false
  }
})

const byRole = computed(() => {
  const counts = { individual: 0, business: 0, admin: 0 }
  users.value.forEach((u) => (counts[u.role] = (counts[u.role] || 0) + 1))
  return counts
})
</script>

<template>
  <div class="section-pad">
    <div class="container">
      <span class="market-tag market-tag--rotate-r mb-2 d-inline-flex"><i class="bi bi-shield-lock" aria-hidden="true"></i> Admin</span>
      <h1 class="h3 mb-2">Admin overview</h1>
      <p class="text-soft mb-4" style="max-width: 60ch;">
        Only accounts with the <code>admin</code> role can reach this page, and Firestore
        Security Rules only let admins read the full list of accounts.
      </p>

      <p v-if="loading" class="text-soft" role="status">Loading accounts…</p>
      <div v-else-if="error" class="alert alert-danger small" role="alert">{{ error }}</div>
      <div v-else class="row g-3">
        <div class="col-6 col-md-3">
          <div class="crate-card p-3 text-center">
            <div class="stat-figure fs-3">{{ users.length }}</div>
            <div class="text-faint small">Registered accounts</div>
          </div>
        </div>
        <div v-for="(count, r) in byRole" :key="r" class="col-6 col-md-3">
          <div class="crate-card p-3 text-center">
            <div class="stat-figure fs-3">{{ count }}</div>
            <div class="text-faint small text-capitalize">{{ r }} accounts</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
