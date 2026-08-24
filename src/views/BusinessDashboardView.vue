<script setup>
import { ref, reactive, computed } from 'vue'
import { useListings } from '../composables/useListings'
import { useLocalStorage } from '../composables/useLocalStorage'
import { categories } from '../data/categories'
import { required, isPositiveInteger, runValidators } from '../utils/validators'

const { listings, businessListings, totalKgDiverted, addBulkListings } = useListings()
const recurringTemplates = useLocalStorage('ecoloop_templates', [])

const activeTab = ref('csv') // 'csv' | 'manual'
const rows = ref([]) // { item, qty, category, status, checked, error }
const fileInputRef = ref(null)
const saveAsTemplate = ref(false)
const frequency = ref('Weekly')
const toastMessage = ref('')

// ---- Dashboard stats, dynamically computed from shared listings state (BR B.2) ----
const activeListingsCount = computed(() => businessListings.value.length)
const itemsSharedCount = computed(() =>
  businessListings.value.length + recurringTemplates.value.reduce((sum, t) => sum + t.rows.length, 0)
)

const CATEGORY_IDS = categories.map((c) => c.id)

function validCategory(value) {
  if (!value) return 'Category is required.'
  return CATEGORY_IDS.includes(value.toLowerCase()) ? '' : `Unknown category "${value}".`
}

function rowError(row) {
  return (
    runValidators(row.item, [required]) ||
    runValidators(String(row.qty), [required, isPositiveInteger]) ||
    validCategory(row.category)
  )
}

// ---- CSV import ----
function downloadTemplate() {
  const csv = 'item,qty,category\nCafé takeaway cups,24,packaging\nCeramic seconds bowls,10,homewares\n'
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'ecoloop-bulk-upload-template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/)
  const [header, ...body] = lines
  const cols = header.split(',').map((c) => c.trim().toLowerCase())
  return body
    .filter((line) => line.trim() !== '')
    .map((line) => {
      const values = line.split(',').map((v) => v.trim())
      const record = {}
      cols.forEach((col, i) => (record[col] = values[i] ?? ''))
      return {
        item: record.item || '',
        qty: record.qty || '',
        category: (record.category || '').toLowerCase(),
        checked: true,
      }
    })
}

function handleFileChange(event) {
  const file = event.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    const parsed = parseCsv(String(reader.result))
    rows.value = [
      ...rows.value,
      ...parsed.map((r) => ({ ...r, error: rowError(r), status: rowError(r) ? 'Needs fixing' : 'Ready' })),
    ]
  }
  reader.readAsText(file)
  event.target.value = ''
}

function onDrop(event) {
  event.preventDefault()
  const file = event.dataTransfer?.files?.[0]
  if (file) {
    const fakeEvent = { target: { files: [file], value: '' } }
    handleFileChange(fakeEvent)
  }
}

// ---- Manual batch entry ----
const manualRow = reactive({ item: '', qty: '', category: '' })
const manualTouched = reactive({})
const manualErrors = computed(() => ({
  item: runValidators(manualRow.item, [required]),
  qty: runValidators(String(manualRow.qty), [required, isPositiveInteger]),
  category: validCategory(manualRow.category),
}))
const manualHasErrors = computed(() => Object.values(manualErrors.value).some(Boolean))

function addManualRow() {
  manualTouched.item = manualTouched.qty = manualTouched.category = true
  if (manualHasErrors.value) return
  const row = { item: manualRow.item, qty: manualRow.qty, category: manualRow.category, checked: true }
  rows.value = [...rows.value, { ...row, error: '', status: 'Ready' }]
  manualRow.item = ''
  manualRow.qty = ''
  manualRow.category = ''
  manualTouched.item = manualTouched.qty = manualTouched.category = false
}

// ---- Preview table actions ----
function removeRow(index) {
  rows.value.splice(index, 1)
}
const readyRows = computed(() => rows.value.filter((r) => r.checked && !r.error))

function publish() {
  if (readyRows.value.length === 0) return
  const published = addBulkListings(
    readyRows.value.map((r) => ({
      title: r.item,
      category: r.category,
      description: `Bulk-listed business surplus: ${r.item}.`,
      condition: 'New',
      distanceKm: 3.1,
      ownerName: 'Your business',
      suburb: 'Your storefront',
      pickupWindow: 'Weekday mornings',
    }))
  )

  if (saveAsTemplate.value) {
    recurringTemplates.value = [
      ...recurringTemplates.value,
      { frequency: frequency.value, rows: readyRows.value, savedAt: new Date().toISOString() },
    ]
  }

  rows.value = rows.value.filter((r) => !(r.checked && !r.error))
  toastMessage.value = `Published ${published.length} listing${published.length === 1 ? '' : 's'}.`
  setTimeout(() => (toastMessage.value = ''), 3200)
}
</script>

<template>
  <div class="section-pad">
    <div class="container">
      <div class="d-flex flex-wrap justify-content-between align-items-end gap-2 mb-4">
        <div>
          <span class="market-tag market-tag--rotate-r mb-2 d-inline-flex"><i class="bi bi-shop"></i> Business</span>
          <h1 class="h3 mb-0">Bulk upload dashboard</h1>
        </div>
      </div>

      <!-- Stats -->
      <div class="row g-3 mb-4">
        <div class="col-6 col-lg-3">
          <div class="crate-card p-3 text-center">
            <div class="stat-figure fs-3">{{ totalKgDiverted }}<span class="fs-6"> kg</span></div>
            <div class="text-faint small">Diverted (est., all-time)</div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="crate-card p-3 text-center">
            <div class="stat-figure fs-3">{{ itemsSharedCount }}</div>
            <div class="text-faint small">Items shared</div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="crate-card p-3 text-center">
            <div class="stat-figure fs-3">{{ activeListingsCount }}</div>
            <div class="text-faint small">Active listings</div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="crate-card p-3 text-center">
            <div class="stat-figure fs-3">{{ recurringTemplates.length }}</div>
            <div class="text-faint small">Recurring templates</div>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="d-flex gap-2 mb-3">
        <button class="btn btn-sm" :class="activeTab === 'csv' ? 'btn-primary' : 'btn-ghost'" @click="activeTab = 'csv'">CSV Import</button>
        <button class="btn btn-sm" :class="activeTab === 'manual' ? 'btn-primary' : 'btn-ghost'" @click="activeTab = 'manual'">Manual Batch Entry</button>
      </div>

      <!-- CSV import -->
      <div v-if="activeTab === 'csv'" class="dropzone mb-4" @dragover.prevent @drop="onDrop" @click="fileInputRef?.click()">
        <i class="bi bi-upload fs-3 text-soft"></i>
        <p class="mb-1 text-soft">Drag CSV file here, or click to browse</p>
        <button class="btn btn-link p-0" type="button" @click.stop="downloadTemplate">Download template</button>
        <input ref="fileInputRef" type="file" accept=".csv" hidden @change="handleFileChange" />
      </div>

      <!-- Manual batch entry -->
      <div v-else class="crate-card p-3 mb-4">
        <div class="row g-2 align-items-start">
          <div class="col-12 col-md-5">
            <input
              v-model="manualRow.item" type="text" class="form-control form-control-sm"
              :class="{ 'is-invalid': manualTouched.item && manualErrors.item }"
              placeholder="Item name"
            />
            <p v-if="manualTouched.item && manualErrors.item" class="field-error">{{ manualErrors.item }}</p>
          </div>
          <div class="col-6 col-md-2">
            <input
              v-model="manualRow.qty" type="number" min="1" class="form-control form-control-sm"
              :class="{ 'is-invalid': manualTouched.qty && manualErrors.qty }"
              placeholder="Qty"
            />
            <p v-if="manualTouched.qty && manualErrors.qty" class="field-error">{{ manualErrors.qty }}</p>
          </div>
          <div class="col-6 col-md-3">
            <select
              v-model="manualRow.category" class="form-select form-select-sm"
              :class="{ 'is-invalid': manualTouched.category && manualErrors.category }"
            >
              <option value="" disabled>Category</option>
              <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.label }}</option>
            </select>
            <p v-if="manualTouched.category && manualErrors.category" class="field-error">{{ manualErrors.category }}</p>
          </div>
          <div class="col-12 col-md-2 d-grid">
            <button class="btn btn-primary btn-sm" @click="addManualRow">Add row</button>
          </div>
        </div>
      </div>

      <!-- Preview table -->
      <div v-if="rows.length" class="table-responsive crate-card p-3 mb-3">
        <table class="table align-middle mb-0">
          <thead>
            <tr class="small text-faint">
              <th></th>
              <th>Item</th>
              <th>Qty</th>
              <th>Category</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in rows" :key="i">
              <td><input v-model="row.checked" type="checkbox" class="form-check-input" :disabled="!!row.error" /></td>
              <td>{{ row.item }}</td>
              <td>{{ row.qty }}</td>
              <td>{{ row.category }}</td>
              <td>
                <span :class="row.error ? 'text-danger' : 'text-success'" class="small">
                  <i :class="['bi', row.error ? 'bi-exclamation-triangle' : 'bi-check-circle']"></i>
                  {{ row.error || 'Ready' }}
                </span>
              </td>
              <td class="text-end">
                <button class="btn btn-sm btn-ghost" @click="removeRow(i)"><i class="bi bi-trash"></i></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="rows.length" class="d-flex flex-wrap justify-content-between align-items-center gap-2">
        <div class="form-check d-flex align-items-center gap-2">
          <input id="saveTemplate" v-model="saveAsTemplate" class="form-check-input mt-0" type="checkbox" />
          <label class="form-check-label small" for="saveTemplate">Save as recurring template — Frequency:</label>
          <select v-model="frequency" class="form-select form-select-sm w-auto">
            <option>Weekly</option>
            <option>Fortnightly</option>
            <option>Monthly</option>
          </select>
        </div>
        <button class="btn btn-primary" :disabled="readyRows.length === 0" @click="publish">
          Publish {{ readyRows.length }} listing{{ readyRows.length === 1 ? '' : 's' }}
        </button>
      </div>

      <transition name="fade">
        <div v-if="toastMessage" class="eco-toast">
          <i class="bi bi-check-circle"></i>{{ toastMessage }}
        </div>
      </transition>
    </div>
  </div>
</template>

<style scoped>
.dropzone {
  border: 1.5px dashed var(--line);
  border-radius: var(--radius-md);
  background: var(--bg-kraft);
  padding: 2.5rem 1rem;
  text-align: center;
  cursor: pointer;
}
.dropzone:hover { border-color: var(--primary); }
</style>
