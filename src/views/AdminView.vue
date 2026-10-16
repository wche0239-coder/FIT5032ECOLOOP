<script setup>
// Admin page (admin role only).
// Role changes go through the setUserRole Cloud Function (BR E.1): it
// re-checks on the server that the caller is an admin, and firestore.rules
// blocks role changes from the browser, so the function is the only path.
import { useOnline } from '../composables/useOnline'
import { ref, reactive, computed, onMounted } from 'vue'
import { collection, getDocs } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '../firebase'
import { useAuth, ROLES } from '../composables/useAuth'
import InteractiveTable from '../components/InteractiveTable.vue'
import ChartCard from '../components/ChartCard.vue'
import BulkEmailDialog from '../components/BulkEmailDialog.vue'
import { categories, getCategory } from '../data/categories'
import {
  PERIODS,
  STATUSES,
  filterExchanges,
  kgByMonth,
  statusByMonth,
  kpis,
  countByRole,
  monthLabel,
} from '../utils/dashboardStats'
const { isOnline } = useOnline()

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
// ---- Exchange activity from Firestore (F.1 dashboard) ----
const exchanges = ref([])
const exLoading = ref(true)
const exError = ref('')
const seeding = ref(false)
const period = ref('all')
const category = ref('')

async function loadExchanges() {
  exLoading.value = true
  exError.value = ''
  try {
    const snap = await getDocs(collection(db, 'exchanges'))
    exchanges.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  } catch (err) {
    exError.value = 'Could not load exchange history: ' + err.message
  } finally {
    exLoading.value = false
  }
}

const seedDemoExchanges = httpsCallable(functions, 'seedDemoExchanges')
async function loadDemoData() {
  seeding.value = true
  exError.value = ''
  try {
    const { data } = await seedDemoExchanges()
    status.value = `Loaded ${data.count} demo exchanges.`
    await loadExchanges()
  } catch (err) {
    exError.value = 'Could not load demo data: ' + err.message
  } finally {
    seeding.value = false
  }
}

onMounted(() => {
  loadUsers()
  loadExchanges()
})

// Colours: one blue for single-series charts; the reserved status set for
// exchange status (always shown with a text label in the legend and table).
const SERIES_BLUE = '#2A78D6'
const STATUS_COLORS = { Completed: '#0CA30C', Pending: '#FAB219', Cancelled: '#D03B3B' }

const filtered = computed(() => filterExchanges(exchanges.value, { period: period.value, category: category.value }))
const activity = computed(() => kpis(filtered.value))
const kgChart = computed(() => {
  const { months, values } = kgByMonth(filtered.value)
  return { labels: months.map(monthLabel), datasets: [{ label: 'Kg diverted', data: values, color: SERIES_BLUE }] }
})
const statusChart = computed(() => {
  const { months, series } = statusByMonth(filtered.value)
  return {
    labels: months.map(monthLabel),
    datasets: STATUSES.map((s) => ({ label: s, data: series[s], color: STATUS_COLORS[s] })),
  }
})
const roleChart = computed(() => ({
  labels: ROLES.map((r) => r[0].toUpperCase() + r.slice(1)),
  datasets: [{ label: 'Accounts', data: countByRole(users.value, ROLES), color: SERIES_BLUE }],
}))
const filterSummary = computed(() => {
  const p = PERIODS.find((x) => x.value === period.value).label.toLowerCase()
  return `${activity.value.total} exchanges · ${p}${category.value ? ` · ${getCategory(category.value).label}` : ''}`
})

const byRole = computed(() => {
  const counts = { individual: 0, business: 0, admin: 0 }
  users.value.forEach((u) => (counts[u.role] = (counts[u.role] || 0) + 1))
  return counts
})

const columns = [
  // Selection column for bulk email (F.1). Formats to '' so search ignores it.
  { key: 'select', label: 'Select', sortable: false, filterable: false, format: () => '' },
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

// ---- Bulk email (F.1) ----
const selectedIds = ref([])
const emailRecipients = ref(null)
const selectedUsers = computed(() => users.value.filter((u) => selectedIds.value.includes(u.id)))

function selectAll(rows) {
  selectedIds.value = [...new Set([...selectedIds.value, ...rows.map((r) => r.id)])]
}
function clearSelection() {
  selectedIds.value = []
}
function openBulkEmail() {
  emailRecipients.value = selectedUsers.value
}
function onBulkSent(result) {
  status.value = `Announcement sent to ${result.sent} ${result.sent === 1 ? 'person' : 'people'}${result.skipped ? ` (${result.skipped} skipped: no email address)` : ''}.`
  clearSelection()
}

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
      <h1 class="h3 mb-2">Admin dashboard</h1>
      <p class="text-soft mb-4" style="max-width: 62ch;">
        An overview of EcoLoop's community and the impact of its exchanges. Role changes are
        checked and saved by a secure server function.
      </p>

      <!-- ================= Community ================= -->
      <h2 class="h5 mb-3">Community</h2>
      <p v-if="loading" class="text-soft" role="status">Loading accounts…</p>
      <div v-else-if="loadError" class="alert alert-danger small" role="alert">{{ loadError }}</div>
      <template v-else>
        <div class="row g-3 mb-3">
          <div class="col-6 col-md-3">
            <div class="crate-card p-3 text-center h-100">
              <div class="stat-figure fs-3">{{ users.length }}</div>
              <div class="text-soft small">Registered accounts</div>
            </div>
          </div>
          <div v-for="(count, r) in byRole" :key="r" class="col-6 col-md-3">
            <div class="crate-card p-3 text-center h-100">
              <div class="stat-figure fs-3">{{ count }}</div>
              <div class="text-soft small text-capitalize">{{ r }} accounts</div>
            </div>
          </div>
        </div>

        <div class="row g-3 mb-4 align-items-start">
          <div class="col-12 col-lg-4">
            <ChartCard
              title="Accounts by type"
              description="Who uses EcoLoop."
              :labels="roleChart.labels"
              :datasets="roleChart.datasets"
              horizontal
              :height="200"
            />
          </div>
          <div class="col-12 col-lg-8">
            <InteractiveTable
              caption="User accounts"
              description="Tick people to email them, or choose a new role and press Save. You can't change your own role."
              :columns="columns"
              :rows="users"
              :default-sort="{ key: 'name', dir: 'asc' }"
            >
              <template #actions="{ rows }">
                <button type="button" class="btn btn-ghost btn-sm" @click="selectAll(rows)">
                  Select all shown ({{ rows.length }})
                </button>
                <button v-if="selectedIds.length" type="button" class="btn btn-ghost btn-sm" @click="clearSelection">
                  Clear
                </button>
                <button
                  type="button"
                  class="btn btn-primary btn-sm"
                  :disabled="!selectedIds.length || !isOnline"
                  @click="openBulkEmail"
                >
                  <i class="bi bi-envelope me-1" aria-hidden="true"></i>Email selected ({{ selectedIds.length }})
                </button>
              </template>
              <template #cell-select="{ row }">
                <input
                  :id="`select-${row.id}`"
                  v-model="selectedIds"
                  type="checkbox"
                  class="form-check-input"
                  :value="row.id"
                  :aria-label="`Select ${row.name}`"
                />
              </template>
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
                    :disabled="saving === row.id || pendingRole[row.id] === row.role || !isOnline"
                    @click="saveRole(row)"
                  >
                    {{ saving === row.id ? 'Saving…' : 'Save' }}<span class="visually-hidden"> role for {{ row.name }}</span>
                  </button>
                </div>
              </template>
            </InteractiveTable>
          </div>
        </div>
      </template>

      <!-- ================= Exchange activity ================= -->
      <h2 class="h5 mb-2 mt-2">Exchange activity</h2>
      <div class="filter-row crate-card p-3 mb-3" role="group" aria-label="Filter exchange activity">
        <div>
          <label class="field-label" for="dash-period">Period</label>
          <select id="dash-period" v-model="period" class="form-select form-select-sm">
            <option v-for="p in PERIODS" :key="p.value" :value="p.value">{{ p.label }}</option>
          </select>
        </div>
        <div>
          <label class="field-label" for="dash-category">Category</label>
          <select id="dash-category" v-model="category" class="form-select form-select-sm">
            <option value="">All categories</option>
            <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.label }}</option>
          </select>
        </div>
        <p class="small text-soft mb-0 align-self-end" role="status" aria-live="polite">{{ filterSummary }}</p>
      </div>

      <p v-if="exLoading" class="text-soft" role="status">Loading exchange history…</p>
      <div v-else-if="exError" class="alert alert-danger small" role="alert">{{ exError }}</div>
      <div v-else-if="!exchanges.length" class="crate-card p-4 text-center">
        <p class="mb-2 fw-semibold">No exchange history in Firestore yet.</p>
        <p class="small text-soft mb-3">Load the 86-row demo history to see the charts. Running it again is safe; it won't duplicate rows.</p>
        <button type="button" class="btn btn-primary" :disabled="seeding || !isOnline" @click="loadDemoData">
          {{ seeding ? 'Loading…' : 'Load demo exchange data' }}
        </button>
      </div>
      <template v-else>
        <div class="row g-3 mb-3">
          <div class="col-6 col-md-3">
            <div class="crate-card p-3 text-center h-100">
              <div class="stat-figure fs-3">{{ activity.total }}</div>
              <div class="text-soft small">Exchanges</div>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <div class="crate-card p-3 text-center h-100">
              <div class="stat-figure fs-3">{{ activity.completed }}</div>
              <div class="text-soft small">Completed</div>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <div class="crate-card p-3 text-center h-100">
              <div class="stat-figure fs-3">{{ activity.kg }}<span class="fs-6"> kg</span></div>
              <div class="text-soft small">Kept out of landfill</div>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <div class="crate-card p-3 text-center h-100">
              <div class="stat-figure fs-3">{{ activity.completionRate ?? '—' }}<span v-if="activity.completionRate !== null" class="fs-6">%</span></div>
              <div class="text-soft small">Completion rate</div>
            </div>
          </div>
        </div>
        <div class="row g-3 mb-4">
          <div class="col-12 col-lg-6">
            <ChartCard
              title="Kilograms kept out of landfill"
              description="Completed exchanges, per month."
              :labels="kgChart.labels"
              :datasets="kgChart.datasets"
              unit="kg"
            />
          </div>
          <div class="col-12 col-lg-6">
            <ChartCard
              title="Exchanges by status"
              description="Per month. Click a legend item to hide that status."
              :labels="statusChart.labels"
              :datasets="statusChart.datasets"
              stacked
            />
          </div>
        </div>
      </template>

      <BulkEmailDialog :recipients="emailRecipients" @close="emailRecipients = null" @sent="onBulkSent" />

      <p class="visually-hidden" role="status" aria-live="polite">{{ status }}</p>
      <p v-if="status" class="small mt-3" aria-hidden="true">
        <i class="bi bi-info-circle me-1" aria-hidden="true"></i>{{ status }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.role-edit .form-select { min-width: 8.5rem; text-transform: capitalize; }
.filter-row { display: flex; flex-wrap: wrap; gap: 12px 20px; align-items: flex-start; }
.filter-row .form-select { min-width: 11rem; }
</style>
