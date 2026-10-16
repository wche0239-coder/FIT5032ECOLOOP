<script setup>
// Admin page (admin role only).
// Role changes go through the setUserRole Cloud Function (BR E.1): it
// re-checks on the server that the caller is an admin, and firestore.rules
// blocks role changes from the browser, so the function is the only path.
import { ref, reactive, computed, onMounted } from 'vue'
import { collection, getDocs } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '../firebase'
import { useAuth, ROLES } from '../composables/useAuth'
import InteractiveTable from '../components/InteractiveTable.vue'

const { currentUser } = useAuth()

const users = ref([])
const loading = ref(true)
const loadError = ref('')
const pendingRole = reactive({}) // uid -> role chosen in the dropdown
const saving = ref('') // uid being saved
const status = ref('')

async function loadUsers() {
  loading.value = true
  loadError.value = ''
  try {
    const snap = await getDocs(collection(db, 'users'))
    users.value = snap.docs.map((d) => {
      const data = d.data()
      return {
        id: d.id,
        name: data.name || '(no name)',
        email: data.email || '',
        role: data.role || 'individual',
        joined: data.createdAt?.toDate ? data.createdAt.toDate() : null,
      }
    })
    users.value.forEach((u) => (pendingRole[u.id] = u.role))
  } catch (err) {
    loadError.value = 'Could not load accounts: ' + err.message
  } finally {
    loading.value = false
  }
}
onMounted(loadUsers)

const byRole = computed(() => {
  const counts = { individual: 0, business: 0, admin: 0 }
  users.value.forEach((u) => (counts[u.role] = (counts[u.role] || 0) + 1))
  return counts
})

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  {
    key: 'role',
    label: 'Role',
    filterOptions: ROLES,
  },
  {
    key: 'joined',
    label: 'Joined',
    type: 'date',
    format: (r) => (r.joined ? r.joined.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'),
    sortValue: (r) => (r.joined ? r.joined.getTime() : 0),
    filterable: false,
  },
]

const setUserRole = httpsCallable(functions, 'setUserRole')

async function saveRole(user) {
  const role = pendingRole[user.id]
  if (role === user.role) return
  saving.value = user.id
  status.value = ''
  try {
    await setUserRole({ uid: user.id, role })
    user.role = role
    status.value = `${user.name} is now ${role === 'admin' ? 'an admin' : `a${role === 'individual' ? 'n' : ''} ${role} user`}.`
  } catch (err) {
    pendingRole[user.id] = user.role
    status.value = `Couldn't change ${user.name}'s role: ${err.message}`
  } finally {
    saving.value = ''
  }
}
</script>

<template>
  <div class="section-pad">
    <div class="container">
      <span class="market-tag market-tag--rotate-r mb-2 d-inline-flex"><i class="bi bi-shield-lock" aria-hidden="true"></i> Admin</span>
      <h1 class="h3 mb-2">Admin overview</h1>
      <p class="text-soft mb-4" style="max-width: 62ch;">
        Manage who can do what on EcoLoop. Role changes are checked and saved by a secure
        server function, so they can't be made from anywhere else.
      </p>

      <p v-if="loading" class="text-soft" role="status">Loading accounts…</p>
      <div v-else-if="loadError" class="alert alert-danger small" role="alert">{{ loadError }}</div>
      <template v-else>
        <div class="row g-3 mb-4">
          <div class="col-6 col-md-3">
            <div class="crate-card p-3 text-center">
              <div class="stat-figure fs-3">{{ users.length }}</div>
              <div class="text-soft small">Registered accounts</div>
            </div>
          </div>
          <div v-for="(count, r) in byRole" :key="r" class="col-6 col-md-3">
            <div class="crate-card p-3 text-center">
              <div class="stat-figure fs-3">{{ count }}</div>
              <div class="text-soft small text-capitalize">{{ r }} accounts</div>
            </div>
          </div>
        </div>

        <InteractiveTable
          caption="User accounts"
          description="Choose a new role and press Save. You can't change your own role."
          :columns="columns"
          :rows="users"
          :default-sort="{ key: 'name', dir: 'asc' }"
        >
          <template #cell-role="{ row }">
            <span v-if="row.id === currentUser?.id" class="small">
              <span class="text-capitalize fw-semibold">{{ row.role }}</span>
              <span class="text-soft"> (you)</span>
            </span>
            <div v-else class="d-flex gap-2 align-items-center role-edit">
              <select
                :id="`role-${row.id}`"
                v-model="pendingRole[row.id]"
                class="form-select form-select-sm"
                :aria-label="`Role for ${row.name}`"
                :disabled="saving === row.id"
              >
                <option v-for="r in ROLES" :key="r" :value="r">{{ r }}</option>
              </select>
              <button
                type="button"
                class="btn btn-primary btn-sm"
                :disabled="saving === row.id || pendingRole[row.id] === row.role"
                @click="saveRole(row)"
              >
                {{ saving === row.id ? 'Saving…' : 'Save' }}<span class="visually-hidden"> role for {{ row.name }}</span>
              </button>
            </div>
          </template>
        </InteractiveTable>
      </template>

      <p class="visually-hidden" role="status" aria-live="polite">{{ status }}</p>
      <p v-if="status" class="small mt-3" aria-hidden="true">
        <i class="bi bi-info-circle me-1" aria-hidden="true"></i>{{ status }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.role-edit .form-select { min-width: 8.5rem; text-transform: capitalize; }
</style>
