<script setup>
// BR (D.3) — Interactive table: sort, global search, per-column
// search, and 10 rows per page. Built as one reusable component so
// both tables on the Reports page behave identically.
//
// BR (E.3) — accessible by design: a real <table> with <caption>,
// column headers with scope + aria-sort, sort controls as real
// buttons, labelled filter inputs, a polite live region announcing
// result counts, and a keyboard-scrollable wrapper on small screens.
import { ref, reactive, computed, watch, useId } from 'vue'
import { cellText, filterRows, sortRows, paginate } from '../utils/tableEngine'

const props = defineProps({
  columns: { type: Array, required: true }, // [{ key, label, type?, format?, filterOptions?, sortable? }]
  rows: { type: Array, required: true },
  caption: { type: String, required: true },
  description: { type: String, default: '' },
  pageSize: { type: Number, default: 10 },
  defaultSort: { type: Object, default: () => ({ key: '', dir: 'asc' }) },
})

const uid = useId()
const globalQuery = ref('')
const columnQueries = reactive(Object.fromEntries(props.columns.map((c) => [c.key, ''])))
const sortKey = ref(props.defaultSort.key)
const sortDir = ref(props.defaultSort.dir)
const page = ref(1)

const processed = computed(() =>
  sortRows(filterRows(props.rows, props.columns, globalQuery.value, columnQueries), props.columns, sortKey.value, sortDir.value)
)
const pageData = computed(() => paginate(processed.value, page.value, props.pageSize))
const hasActiveFilters = computed(
  () => globalQuery.value.trim() !== '' || Object.values(columnQueries).some((v) => String(v).trim() !== '')
)

// Any change to what's being searched sends you back to page 1.
watch([globalQuery, () => ({ ...columnQueries })], () => (page.value = 1), { deep: true })

function toggleSort(column) {
  if (column.sortable === false) return
  if (sortKey.value === column.key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = column.key
    sortDir.value = 'asc'
  }
}

function ariaSort(column) {
  if (sortKey.value !== column.key) return 'none'
  return sortDir.value === 'asc' ? 'ascending' : 'descending'
}

function clearFilters() {
  globalQuery.value = ''
  Object.keys(columnQueries).forEach((k) => (columnQueries[k] = ''))
}

// Compact page list: 1 … 4 5 6 … 12
const pageButtons = computed(() => {
  const { page: current, pageCount } = pageData.value
  const pages = new Set([1, pageCount, current - 1, current, current + 1])
  const list = [...pages].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b)
  const out = []
  list.forEach((p, i) => {
    if (i > 0 && p - list[i - 1] > 1) out.push('…')
    out.push(p)
  })
  return out
})

const statusText = computed(() => {
  const { start, end } = pageData.value
  const total = processed.value.length
  if (total === 0) return `No ${props.caption.toLowerCase()} match your search.`
  return `Showing ${start} to ${end} of ${total} rows${hasActiveFilters.value ? ` (filtered from ${props.rows.length})` : ''}.`
})
</script>

<template>
  <section class="crate-card p-3 p-md-4" :aria-labelledby="`${uid}-title`">
    <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
      <div>
        <h2 :id="`${uid}-title`" class="h5 mb-1">{{ caption }}</h2>
        <p v-if="description" class="text-soft small mb-0">{{ description }}</p>
      </div>
      <div class="d-flex flex-wrap gap-2">
        <slot name="actions" :rows="processed" :columns="columns" />
      </div>
    </div>

    <div class="d-flex flex-wrap gap-2 align-items-end mb-3">
      <div class="flex-grow-1" style="max-width: 360px;">
        <label class="field-label" :for="`${uid}-search`">Search all columns</label>
        <input
          :id="`${uid}-search`"
          v-model="globalQuery"
          type="search"
          class="form-control form-control-sm"
          placeholder="Type to search…"
          :aria-controls="`${uid}-table`"
        />
      </div>
      <button v-if="hasActiveFilters" type="button" class="btn btn-ghost btn-sm" @click="clearFilters">
        <i class="bi bi-x-circle me-1" aria-hidden="true"></i>Clear all filters
      </button>
    </div>

    <div
      class="table-responsive"
      role="region"
      :aria-labelledby="`${uid}-title`"
      tabindex="0"
    >
      <table :id="`${uid}-table`" class="table table-sm align-middle mb-0 eco-table">
        <caption class="visually-hidden">
          {{ caption }}. Column headers are buttons that sort the table. The second header row filters each column.
        </caption>
        <thead>
          <tr>
            <th v-for="col in columns" :key="col.key" scope="col" :aria-sort="ariaSort(col)">
              <button
                v-if="col.sortable !== false"
                type="button"
                class="sort-btn"
                @click="toggleSort(col)"
              >
                {{ col.label }}
                <i
                  class="bi"
                  :class="
                    sortKey !== col.key ? 'bi-arrow-down-up text-faint' : sortDir === 'asc' ? 'bi-sort-up' : 'bi-sort-down'
                  "
                  aria-hidden="true"
                ></i>
                <span class="visually-hidden">
                  {{ sortKey === col.key ? `, sorted ${ariaSort(col)}` : ', sortable' }}
                </span>
              </button>
              <span v-else>{{ col.label }}</span>
            </th>
          </tr>
          <tr class="filter-row">
            <td v-for="col in columns" :key="col.key">
              <template v-if="col.filterable !== false">
                <select
                  v-if="col.filterOptions"
                  v-model="columnQueries[col.key]"
                  class="form-select form-select-sm"
                  :aria-label="`Filter by ${col.label}`"
                >
                  <option value="">All</option>
                  <option v-for="opt in col.filterOptions" :key="opt" :value="opt">{{ opt }}</option>
                </select>
                <input
                  v-else
                  v-model="columnQueries[col.key]"
                  type="search"
                  class="form-control form-control-sm"
                  :aria-label="`Search ${col.label} column`"
                  placeholder="Search…"
                />
              </template>
            </td>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in pageData.rows" :key="row.id ?? i">
            <td v-for="col in columns" :key="col.key" :class="{ 'text-end': col.type === 'number' }">
              <slot :name="`cell-${col.key}`" :row="row" :value="cellText(row, col)">
                {{ cellText(row, col) }}
              </slot>
            </td>
          </tr>
          <tr v-if="pageData.rows.length === 0">
            <td :colspan="columns.length" class="text-center text-soft py-4">
              No rows match. Try a different search or clear the filters.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3">
      <p class="small text-soft mb-0" role="status" aria-live="polite">{{ statusText }}</p>

      <nav v-if="pageData.pageCount > 1" :aria-label="`${caption} pages`">
        <ul class="pagination pagination-sm mb-0 eco-pagination">
          <li class="page-item" :class="{ disabled: pageData.page === 1 }">
            <button type="button" class="page-link" :disabled="pageData.page === 1" @click="page = pageData.page - 1">
              <span aria-hidden="true">‹</span> Previous
            </button>
          </li>
          <li
            v-for="(p, i) in pageButtons"
            :key="`${p}-${i}`"
            class="page-item"
            :class="{ active: p === pageData.page, disabled: p === '…' }"
          >
            <span v-if="p === '…'" class="page-link" aria-hidden="true">…</span>
            <button
              v-else
              type="button"
              class="page-link"
              :aria-current="p === pageData.page ? 'page' : undefined"
              :aria-label="`Page ${p}`"
              @click="page = p"
            >
              {{ p }}
            </button>
          </li>
          <li class="page-item" :class="{ disabled: pageData.page === pageData.pageCount }">
            <button
              type="button"
              class="page-link"
              :disabled="pageData.page === pageData.pageCount"
              @click="page = pageData.page + 1"
            >
              Next <span aria-hidden="true">›</span>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  </section>
</template>

<style scoped>
.eco-table th {
  font-size: 0.8rem;
  color: var(--ink-soft);
  white-space: nowrap;
  border-bottom-width: 1.5px;
}
.eco-table td { font-size: 0.88rem; }
.filter-row td { padding-top: 0.25rem; padding-bottom: 0.6rem; min-width: 110px; }
.sort-btn {
  background: none;
  border: 0;
  padding: 0.2rem 0;
  font: inherit;
  font-weight: 600;
  color: inherit;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}
.sort-btn:hover { color: var(--signal); }
/* Positioned so screen-reader-only text inside the table is clipped by
   this scroll box instead of widening the page (WCAG 1.4.10 Reflow). */
.table-responsive { position: relative; }
.table-responsive:focus-visible { outline: 2.5px solid var(--caution); outline-offset: 2px; }
.eco-pagination .page-link { color: var(--signal); border-color: var(--line-strong); }
.eco-pagination .active .page-link { background: var(--signal); border-color: var(--signal); color: #fff; }
.eco-pagination .disabled .page-link { color: var(--ink-soft); }
</style>
