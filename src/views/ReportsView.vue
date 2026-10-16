<script setup>
// Data & reports page.
//   BR (D.3) two interactive tables (sort, search, per-column search, 10/page)
//   BR (E.4) export what's shown as CSV or PDF
//   BR (D.2) email the PDF as an attachment (via the Cloud Function, BR E.1)
import { useOnline } from '../composables/useOnline'
import { ref, computed } from 'vue'
import InteractiveTable from '../components/InteractiveTable.vue'
import EmailReportDialog from '../components/EmailReportDialog.vue'
import { useListings } from '../composables/useListings'
import { categories, getCategory } from '../data/categories'
import { mockExchanges } from '../data/mockExchanges'
import { downloadCsv, downloadPdf } from '../utils/exporters'
const { isOnline } = useOnline()

const { listings } = useListings()

const money = (n) => `$${Number(n).toFixed(2)}`
const shortDate = (iso) =>
  new Date(iso).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })
const categoryLabels = categories.map((c) => c.label)

// ---- Table 1: live marketplace listings ----
const listingColumns = [
  { key: 'title', label: 'Item' },
  { key: 'category', label: 'Category', format: (r) => getCategory(r.category).label, filterOptions: categoryLabels },
  { key: 'condition', label: 'Condition', filterOptions: ['New', 'Like New', 'Used'] },
  {
    key: 'price',
    label: 'Price',
    type: 'number',
    format: (r) => (r.isFree ? 'Free' : money(r.price)),
    sortValue: (r) => (r.isFree ? 0 : Number(r.price) || 0),
  },
  {
    key: 'ownerType',
    label: 'Seller type',
    format: (r) => (r.ownerType === 'business' ? 'Business' : 'Individual'),
    filterOptions: ['Individual', 'Business'],
  },
  { key: 'suburb', label: 'Suburb' },
  { key: 'postedAt', label: 'Posted', type: 'date', format: (r) => shortDate(r.postedAt) },
]

// ---- Table 2: community exchange history (mock data) ----
const exchangeColumns = [
  { key: 'id', label: 'Ref' },
  { key: 'date', label: 'Date', type: 'date', format: (r) => shortDate(r.date) },
  { key: 'item', label: 'Item' },
  { key: 'category', label: 'Category', format: (r) => getCategory(r.category).label, filterOptions: categoryLabels },
  { key: 'fromSuburb', label: 'From' },
  { key: 'toSuburb', label: 'To' },
  { key: 'type', label: 'Type', filterOptions: ['Free', 'Sale'] },
  { key: 'price', label: 'Price', type: 'number', format: (r) => (r.type === 'Free' ? '—' : money(r.price)) },
  { key: 'kgDiverted', label: 'Kg diverted', type: 'number', format: (r) => r.kgDiverted.toFixed(1) },
  { key: 'status', label: 'Status', filterOptions: ['Completed', 'Pending', 'Cancelled'] },
]

const completed = computed(() => mockExchanges.filter((e) => e.status === 'Completed'))
const kgTotal = computed(() => completed.value.reduce((s, e) => s + e.kgDiverted, 0).toFixed(1))

// ---- Export + email ----
const busy = ref('')
const toast = ref('')
const emailReport = ref(null)

function stamp() {
  return new Date().toISOString().slice(0, 10)
}

async function exportPdf(title, filename, columns, rows) {
  busy.value = filename
  try {
    await downloadPdf({ title, columns, rows }, `${filename}-${stamp()}`)
  } finally {
    busy.value = ''
  }
}

function openEmail(title, filename, columns, rows) {
  emailReport.value = { title, filename: `${filename}-${stamp()}`, columns, rows }
}

function onSent(address) {
  toast.value = `Report emailed to ${address}`
  setTimeout(() => (toast.value = ''), 4000)
}
</script>

<template>
  <div class="section-pad">
    <div class="container">
      <div class="eyebrow mb-1">Insights</div>
      <h1 class="h3 mb-2">Data &amp; reports</h1>
      <p class="text-soft mb-4" style="max-width: 62ch;">
        Search, sort and filter EcoLoop's listings and exchange history. Exports and emails
        include exactly the rows you're looking at — your search, filters and sort order are kept.
      </p>

      <div class="row g-3 mb-4">
        <div class="col-6 col-md-3">
          <div class="crate-card p-3 text-center">
            <div class="stat-figure fs-3">{{ listings.length }}</div>
            <div class="text-soft small">Live listings</div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="crate-card p-3 text-center">
            <div class="stat-figure fs-3">{{ completed.length }}</div>
            <div class="text-soft small">Completed exchanges</div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="crate-card p-3 text-center">
            <div class="stat-figure fs-3">{{ kgTotal }}<span class="fs-6"> kg</span></div>
            <div class="text-soft small">Diverted from landfill</div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="crate-card p-3 text-center">
            <div class="stat-figure fs-3">{{ mockExchanges.length }}</div>
            <div class="text-soft small">Exchanges logged</div>
          </div>
        </div>
      </div>

      <div class="d-grid gap-4" style="grid-template-columns: minmax(0, 1fr);">
        <InteractiveTable
          caption="Marketplace listings"
          description="Every item currently listed on EcoLoop."
          :columns="listingColumns"
          :rows="listings"
          :default-sort="{ key: 'postedAt', dir: 'desc' }"
        >
          <template #actions="{ rows, columns }">
            <button type="button" class="btn btn-ghost btn-sm" @click="downloadCsv(columns, rows, `ecoloop-listings-${stamp()}`)">
              <i class="bi bi-filetype-csv me-1" aria-hidden="true"></i>Export CSV
            </button>
            <button
              type="button"
              class="btn btn-ghost btn-sm"
              :disabled="busy === 'ecoloop-listings'"
              @click="exportPdf('Marketplace listings', 'ecoloop-listings', columns, rows)"
            >
              <i class="bi bi-filetype-pdf me-1" aria-hidden="true"></i>Export PDF
            </button>
            <button
              type="button"
              class="btn btn-primary btn-sm"
              :disabled="rows.length === 0 || !isOnline"
              :title="!isOnline ? 'Emailing needs an internet connection' : undefined"
              @click="openEmail('Marketplace listings', 'ecoloop-listings', columns, rows)"
            >
              <i class="bi bi-envelope me-1" aria-hidden="true"></i>Email PDF
            </button>
          </template>
          <template #cell-price="{ row, value }">
            <span v-if="row.isFree" class="market-tag market-tag--free">Free</span>
            <span v-else>{{ value }}</span>
          </template>
        </InteractiveTable>

        <InteractiveTable
          caption="Exchange history"
          description="Completed, pending and cancelled exchanges across Melbourne (mock data for this prototype)."
          :columns="exchangeColumns"
          :rows="mockExchanges"
          :default-sort="{ key: 'date', dir: 'desc' }"
        >
          <template #actions="{ rows, columns }">
            <button type="button" class="btn btn-ghost btn-sm" @click="downloadCsv(columns, rows, `ecoloop-exchanges-${stamp()}`)">
              <i class="bi bi-filetype-csv me-1" aria-hidden="true"></i>Export CSV
            </button>
            <button
              type="button"
              class="btn btn-ghost btn-sm"
              :disabled="busy === 'ecoloop-exchanges'"
              @click="exportPdf('Exchange history', 'ecoloop-exchanges', columns, rows)"
            >
              <i class="bi bi-filetype-pdf me-1" aria-hidden="true"></i>Export PDF
            </button>
            <button
              type="button"
              class="btn btn-primary btn-sm"
              :disabled="rows.length === 0 || !isOnline"
              :title="!isOnline ? 'Emailing needs an internet connection' : undefined"
              @click="openEmail('Exchange history', 'ecoloop-exchanges', columns, rows)"
            >
              <i class="bi bi-envelope me-1" aria-hidden="true"></i>Email PDF
            </button>
          </template>
          <template #cell-status="{ value }">
            <span class="status-pill" :class="`status-pill--${value.toLowerCase()}`">{{ value }}</span>
          </template>
        </InteractiveTable>
      </div>
    </div>

    <EmailReportDialog :report="emailReport" @close="emailReport = null" @sent="onSent" />

    <div class="visually-hidden" role="status" aria-live="polite">{{ toast }}</div>
    <transition name="fade">
      <div v-if="toast" class="eco-toast" aria-hidden="true">
        <i class="bi bi-check-circle" aria-hidden="true"></i>{{ toast }}
      </div>
    </transition>
  </div>
</template>

<style scoped>
.status-pill {
  display: inline-block;
  font-size: 0.76rem;
  font-weight: 600;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  border: 1px solid currentColor;
}
.status-pill--completed { color: #1F5C4D; background: #DEEAE4; }
.status-pill--pending { color: #6B4E0E; background: #F7EDCB; }
.status-pill--cancelled { color: #8A2318; background: #F6E2D5; }
</style>
