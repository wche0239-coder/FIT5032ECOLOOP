// Pure filter / sort / paginate logic behind InteractiveTable.vue
// (BR D.3). Kept framework-free so it can be unit-tested and reused
// by the exporters, which export exactly what the table is showing.

/**
 * Display value of a cell — what the user sees, searches and exports.
 * @param {object} row
 * @param {{ key: string, format?: (row) => any }} column
 */
export function cellText(row, column) {
  const value = column.format ? column.format(row) : row[column.key]
  return value === null || value === undefined ? '' : String(value)
}

/** Value used for ordering — raw numbers/dates sort numerically. */
function sortValue(row, column) {
  if (column.sortValue) return column.sortValue(row)
  const raw = row[column.key]
  if (column.type === 'number') return Number(raw) || 0
  if (column.type === 'date') return new Date(raw).getTime() || 0
  return cellText(row, column).toLowerCase()
}

/**
 * Applies the global search, then each per-column filter.
 * Text filters match "contains", case-insensitive. Columns with
 * `filterOptions` are exact-match (they render as a <select>).
 */
export function filterRows(rows, columns, globalQuery = '', columnQueries = {}) {
  const q = globalQuery.trim().toLowerCase()
  return rows.filter((row) => {
    if (q && !columns.some((c) => cellText(row, c).toLowerCase().includes(q))) return false
    return columns.every((c) => {
      const f = (columnQueries[c.key] ?? '').toString().trim().toLowerCase()
      if (!f) return true
      const text = cellText(row, c).toLowerCase()
      return c.filterOptions ? text === f : text.includes(f)
    })
  })
}

export function sortRows(rows, columns, sortKey, sortDir = 'asc') {
  const column = columns.find((c) => c.key === sortKey)
  if (!column) return rows
  const dir = sortDir === 'desc' ? -1 : 1
  return [...rows].sort((a, b) => {
    const va = sortValue(a, column)
    const vb = sortValue(b, column)
    if (va < vb) return -1 * dir
    if (va > vb) return 1 * dir
    return 0
  })
}

export function paginate(rows, page, pageSize = 10) {
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const current = Math.min(Math.max(1, page), pageCount)
  const start = (current - 1) * pageSize
  return {
    page: current,
    pageCount,
    start: rows.length ? start + 1 : 0,
    end: Math.min(start + pageSize, rows.length),
    rows: rows.slice(start, start + pageSize),
  }
}
