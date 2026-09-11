export const CURRENCY = 'TZS'

export function cls(...args) {
  return args.filter(Boolean).join(' ')
}

export function formatNumber(n, digits = 0) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(n)
}

export function formatCurrency(value, options = {}) {
  const n = Number(value) || 0
  const { compact = false } = options
  return `TZS ${compact ? formatCompact(n) : formatNumber(n)}`
}

export function formatCompact(n) {
  const v = Number(n) || 0
  if (Math.abs(v) >= 1_000_000) {
    const m = v / 1_000_000
    return `${m >= 100 ? formatNumber(m, 0) : (+m.toFixed(m < 10 ? 2 : 1))}M`
  }
  if (Math.abs(v) >= 1000) {
    const k = v / 1000
    return `${+k.toFixed(k < 10 ? 1 : 0)}K`
  }
  return formatNumber(v)
}

export function formatPercent(n, digits = 1) {
  const val = Number(n) || 0
  const sign = val > 0 ? '+' : val < 0 ? '-' : ''
  return `${sign}${val.toFixed(digits)}%`
}

export function formatDate(iso, opts = {}) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const { time = false, year = true } = opts
  const base = {
    day: 'numeric',
    month: 'short',
    ...(year ? { year: 'numeric' } : {})
  }
  if (time) base.hour = '2-digit', base.minute = '2-digit'
  return d.toLocaleDateString('en-GB', base)
}

export function formatDayShort(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function trimDate(iso) {
  const d = new Date(iso)
  d.setHours(0, 0, 0, 0)
  return d
}

export function daysBetween(a, b) {
  const A = trimDate(a).getTime()
  const B = trimDate(b).getTime()
  return Math.round((B - A) / 86400000)
}

export function timeAgo(iso) {
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  if (diff < 0) return 'just now'
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')
}

export function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

let uidCounter = 0
export function uid(prefix = 'id') {
  uidCounter += 1
  return `${prefix}_${Date.now().toString(36)}${uidCounter.toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}`
}

export function todayISO() {
  return new Date().toISOString()
}

export function addDaysISO(days) {
  return new Date(Date.now() + days * 86400000).toISOString()
}

/* Deterministic PRNG for stable demo data */
export function mulberry32(seed) {
  let a = seed
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function pick(arr, rand = Math.random) {
  return arr[Math.floor(rand() * arr.length)]
}

export function weightedPick(arr, rand = Math.random) {
  const total = arr.reduce((s, item) => s + (item.w ?? 1), 0)
  let r = rand() * total
  for (const item of arr) {
    r -= item.w ?? 1
    if (r <= 0) return item.v === undefined ? item : item.v
  }
  return arr[arr.length - 1]
}

export function downloadJSON(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  requestAnimationFrame(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  })
}