// Pure aggregation for the admin dashboard (F.1). No Vue or Firebase in
// here, so every number on the dashboard can be unit-tested.

export const PERIODS = [
  { value: '3', label: 'Last 3 months' },
  { value: '6', label: 'Last 6 months' },
  { value: 'all', label: 'All time' },
]

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** 'YYYY-MM' key for an ISO date string. */
export function monthKey(isoDate) {
  return String(isoDate).slice(0, 7)
}

export function monthLabel(key) {
  const [y, m] = key.split('-').map(Number)
  return `${MONTHS[m - 1]} ${y}`
}

/**
 * Keeps exchanges inside the period (counted in whole calendar months,
 * including the current one) and, optionally, one category.
 */
export function filterExchanges(rows, { period = 'all', category = '', now = new Date() } = {}) {
  let start = null
  if (period !== 'all') {
    const months = Number(period)
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1)
    start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  }
  return rows.filter((r) => (!start || r.date >= start) && (!category || r.category === category))
}

/** Every month between the first and last row, so empty months still show as zero. */
export function monthRange(rows) {
  if (!rows.length) return []
  const keys = rows.map((r) => monthKey(r.date)).sort()
  const [y0, m0] = keys[0].split('-').map(Number)
  const [y1, m1] = keys[keys.length - 1].split('-').map(Number)
  const out = []
  for (let y = y0, m = m0; y < y1 || (y === y1 && m <= m1); m === 12 ? (y++, (m = 1)) : m++) {
    out.push(`${y}-${String(m).padStart(2, '0')}`)
  }
  return out
}

const round1 = (n) => Math.round(n * 10) / 10

/** Kilograms diverted per month, completed exchanges only. */
export function kgByMonth(rows) {
  const months = monthRange(rows)
  const totals = Object.fromEntries(months.map((m) => [m, 0]))
  rows.filter((r) => r.status === 'Completed').forEach((r) => (totals[monthKey(r.date)] += r.kgDiverted))
  return { months, values: months.map((m) => round1(totals[m])) }
}

export const STATUSES = ['Completed', 'Pending', 'Cancelled']

/** Number of exchanges per month for each status. */
export function statusByMonth(rows) {
  const months = monthRange(rows)
  const series = Object.fromEntries(STATUSES.map((s) => [s, months.map(() => 0)]))
  rows.forEach((r) => {
    const i = months.indexOf(monthKey(r.date))
    if (i >= 0 && series[r.status]) series[r.status][i] += 1
  })
  return { months, series }
}

export function kpis(rows) {
  const completed = rows.filter((r) => r.status === 'Completed')
  const decided = rows.filter((r) => r.status !== 'Pending')
  return {
    total: rows.length,
    completed: completed.length,
    kg: round1(completed.reduce((s, r) => s + r.kgDiverted, 0)),
    // Share of finished exchanges that went ahead (pending ones haven't finished yet).
    completionRate: decided.length ? Math.round((completed.length / decided.length) * 100) : null,
  }
}

export function countByRole(users, roles) {
  return roles.map((role) => users.filter((u) => u.role === role).length)
}
