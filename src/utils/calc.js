import { TAX_RATE } from '../data/seed.js'

export const PERIODS = {
  '7d': { label: 'Last 7 days', days: 7, bucket: 'day' },
  '30d': { label: 'Last 30 days', days: 30, bucket: 'day' },
  '90d': { label: 'Last 3 months', days: 90, bucket: 'week' },
  '12m': { label: 'Last 12 months', days: 365, bucket: 'month' }
}

function localDateKey(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function startOfCurrentPeriod(period) {
  const cfg = PERIODS[period] || PERIODS['30d']
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  const from = new Date(end.getTime() - (cfg.days - 1) * 86400000)
  from.setHours(0, 0, 0, 0)
  return { from, to: end }
}

export function startOfPreviousPeriod(period) {
  const cfg = PERIODS[period] || PERIODS['30d']
  const { from } = startOfCurrentPeriod(period)
  const to = new Date(from.getTime() - 1)
  to.setHours(23, 59, 59, 999)
  const prevFrom = new Date(from.getTime() - cfg.days * 86400000)
  prevFrom.setHours(0, 0, 0, 0)
  return { from: prevFrom, to }
}

export function filterInRange(items, dateKey, from, to, excludeStatuses = []) {
  const f = from.getTime()
  const t = to.getTime()
  return items.filter((it) => {
    if (excludeStatuses.length && excludeStatuses.includes(it.status)) return false
    const ts = new Date(it[dateKey]).getTime()
    return ts >= f && ts <= t
  })
}

export function pctChange(current, previous) {
  if (!previous) return 0
  return ((current - previous) / Math.abs(previous)) * 100
}

function monthLabel(d) {
  return d.toLocaleDateString('en-GB', { month: 'short' })
}
function weekLabel(d) {
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
}

export function buildSeries(sales, expenses, period) {
  const cfg = PERIODS[period] || PERIODS['30d']
  const { from, to } = startOfCurrentPeriod(period)
  const buckets = []
  const index = new Map()

  const pushBucket = (key, label, start) => {
    const b = { key, label, date: start.toISOString(), revenue: 0, salesCount: 0, orders: 0, expenses: 0, profit: 0 }
    buckets.push(b)
    index.set(b.date, b)
  }

  if (cfg.bucket === 'month') {
    const today = new Date()
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      pushBucket(`${d.getFullYear()}-${d.getMonth()}`, monthLabel(d), d)
    }
  } else if (cfg.bucket === 'week') {
    const today = new Date()
    for (let i = 12; i >= 0; i--) {
      const start = new Date(today.getTime() - (i * 7 + 6) * 86400000)
      start.setHours(0, 0, 0, 0)
      pushBucket(`w${i}`, weekLabel(start), start)
    }
  } else {
    const { from: start } = startOfCurrentPeriod(period)
    for (let i = 0; i < cfg.days; i++) {
      const d = new Date(start.getTime() + i * 86400000)
      d.setHours(12, 0, 0, 0)
      pushBucket(localDateKey(d), d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), d)
    }
  }

  // Sort buckets ascending by time
  buckets.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const bucketAt = (ts) => {
    const d = new Date(ts)
    for (const b of buckets) {
      const start = new Date(b.date)
      if (cfg.bucket === 'month') {
        if (d.getFullYear() === start.getFullYear() && d.getMonth() === start.getMonth()) return b
      } else if (cfg.bucket === 'week') {
        const end = new Date(start.getTime() + 7 * 86400000)
        if (ts >= start.getTime() && ts < end.getTime()) return b
      } else {
        const end = new Date(start.getTime() + 86400000)
        if (ts >= start.getTime() && ts < end.getTime()) return b
      }
    }
    return null
  }

  for (const s of sales) {
    if (s.status === 'cancelled') continue
    const ts = new Date(s.date).getTime()
    if (ts < from.getTime() || ts > to.getTime()) continue
    const b = bucketAt(ts)
    if (!b) continue
    if (s.status === 'paid') b.revenue += s.total
    b.orders += 1
  }
  for (const e of expenses) {
    const ts = new Date(e.date).getTime()
    if (ts < from.getTime() || ts > to.getTime()) continue
    const b = bucketAt(ts)
    if (!b) continue
    b.expenses += e.amount
  }

  // For '7d'/'30d' we want every slot present (no gaps)
  for (const b of buckets) b.profit = b.revenue - b.expenses
  return buckets
}

export function computeKpis(data, period = '30d') {
  const { from, to } = startOfCurrentPeriod(period)
  const prev = startOfPreviousPeriod(period)

  const curSales = filterInRange(data.sales, 'date', from, to)
  const prevSales = filterInRange(data.sales, 'date', prev.from, prev.to)
  const curExp = filterInRange(data.expenses, 'date', from, to)
  const prevExp = filterInRange(data.expenses, 'date', prev.from, prev.to)

  const sumTotal = (arr, key) => arr.reduce((s, x) => s + (x[key] || 0), 0)
  const revenueOf = (arr) => sumTotal(arr.filter((s) => s.status === 'paid'), 'total')
  const orderCount = (arr) => arr.filter((s) => s.status !== 'cancelled').length

  const curRevenue = revenueOf(curSales)
  const prevRevenue = revenueOf(prevSales)
  const curOrders = orderCount(curSales)
  const prevOrders = orderCount(prevSales)
  const curExpenses = sumTotal(curExp, 'amount')
  const prevExpenses = sumTotal(prevExp, 'amount')

  const curProfit = curRevenue - curExpenses
  const prevProfit = prevRevenue - prevExpenses

  return {
    period,
    revenue: curRevenue,
    revenuePrev: prevRevenue,
    revenueChange: pctChange(curRevenue, prevRevenue),
    sales: curOrders,
    salesPrev: prevOrders,
    salesChange: pctChange(curOrders, prevOrders),
    expenses: curExpenses,
    expensesPrev: prevExpenses,
    expensesChange: pctChange(curExpenses, prevExpenses),
    profit: curProfit,
    profitPrev: prevProfit,
    profitChange: pctChange(curProfit, prevProfit),
    avgOrder: curOrders ? curRevenue / curOrders : 0,
    paid: curSales.filter((s) => s.status === 'paid').length,
    pending: curSales.filter((s) => s.status === 'pending').length,
    cancelled: curSales.filter((s) => s.status === 'cancelled').length
  }
}

export function topProducts(data, limit = 5) {
  const map = new Map()
  for (const s of data.sales) {
    if (s.status === 'cancelled') continue
    for (const it of s.items) {
      const cur = map.get(it.productId) || { productId: it.productId, name: it.name, revenue: 0, units: 0 }
      cur.revenue += it.quantity * it.unitPrice
      cur.units += it.quantity
      map.set(it.productId, cur)
    }
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit)
}

export function stockStatus(p) {
  if (p.service) return 'in'
  if (p.stock <= 0) return 'out'
  if (p.stock <= p.minStock) return 'low'
  return 'in'
}

export function stockStatusLabel(s) {
  return { in: 'In stock', low: 'Low stock', out: 'Out of stock' }[s] || 'Unknown'
}

export function inventorySummary(products) {
  const total = products.length
  const byStatus = products.reduce(
    (acc, p) => {
      acc[stockStatus(p)] += 1
      return acc
    },
    { in: 0, low: 0, out: 0 }
  )
  const stockValue = products
    .filter((p) => !p.service)
    .reduce((s, p) => s + p.stock * p.cost, 0)
  return { total, ...byStatus, stockValue }
}

export function customerStats(data, customerId) {
  const orders = data.sales.filter((s) => s.customerId === customerId && s.status !== 'cancelled')
  const spent = orders.filter((s) => s.status === 'paid').reduce((s, x) => s + x.total, 0)
  const last = orders
    .filter((s) => s.status === 'paid')
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0]
  return {
    orders: orders.length,
    spent,
    outstanding: data.sales
      .filter((s) => s.customerId === customerId && s.status === 'pending')
      .reduce((s, x) => s + x.total, 0),
    lastPurchase: last ? last.date : null,
    avgOrder: orders.length ? spent / orders.length : 0
  }
}

export function expenseByCategory(expenses, from, to) {
  const list = from
    ? filterInRange(expenses, 'date', from, to)
    : expenses
  const map = new Map()
  for (const e of list) {
    map.set(e.category, (map.get(e.category) || 0) + e.amount)
  }
  return [...map.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
}

export function monthlyReport(data, months = 12) {
  const today = new Date()
  const rows = []
  for (let i = months - 1; i >= 0; i--) {
    const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const nextStart = new Date(today.getFullYear(), today.getMonth() - i + 1, 1)
    const f = monthStart.getTime()
    const t = nextStart.getTime() - 1
    const revenueIn = data.sales.filter(
      (s) => s.status === 'paid' && new Date(s.date).getTime() >= f && new Date(s.date).getTime() <= t
    )
    const salesIn = data.sales.filter(
      (s) => s.status !== 'cancelled' && new Date(s.date).getTime() >= f && new Date(s.date).getTime() <= t
    )
    const expensesIn = data.expenses.filter(
      (e) => new Date(e.date).getTime() >= f && new Date(e.date).getTime() <= t
    )
    const revenue = revenueIn.reduce((s, x) => s + x.total, 0)
    const expenses = expensesIn.reduce((s, x) => s + x.amount, 0)
    const profit = revenue - expenses
    const orders = salesIn.length
    rows.push({
      key: `${monthStart.getFullYear()}-${monthStart.getMonth()}`,
      label: monthStart.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
      revenue,
      expenses,
      profit,
      orders,
      avgOrder: orders ? revenue / orders : 0,
      margin: revenue ? (profit / revenue) * 100 : 0
    })
  }
  return rows
}

export function salesByProduct(data, from, to) {
  const map = new Map()
  const list = from ? filterInRange(data.sales, 'date', from, to) : data.sales
  for (const s of list) {
    if (s.status === 'cancelled') continue
    for (const it of s.items) {
      const cur = map.get(it.productId) || { productId: it.productId, name: it.name, revenue: 0, units: 0, tax: 0 }
      cur.revenue += it.quantity * it.unitPrice
      cur.units += it.quantity
      cur.tax += Math.round((it.quantity * it.unitPrice) * TAX_RATE)
      map.set(it.productId, cur)
    }
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue)
}

export function paymentMethodBreakdown(data, from, to) {
  const list = from ? filterInRange(data.sales, 'date', from, to, ['cancelled']) : data.sales.filter((s) => s.status !== 'cancelled')
  const map = new Map()
  for (const s of list) {
    map.set(s.paymentMethod, (map.get(s.paymentMethod) || 0) + s.total)
  }
  return [...map.entries()].map(([method, amount]) => ({ method, amount }))
}

export function statusBreakdown(sales) {
  const counts = { paid: 0, pending: 0, cancelled: 0 }
  for (const s of sales) counts[s.status] = (counts[s.status] || 0) + 1
  return counts
}

export function notificationDigest(data) {
  const notifications = []
  const low = data.products.filter((p) => stockStatus(p) === 'low' && !p.service).slice(0, 2)
  const out = data.products.filter((p) => stockStatus(p) === 'out' && !p.service).slice(0, 2)
  const overdue = data.invoices.filter((i) => i.status === 'overdue')
  const todaySales = data.sales.filter((s) => {
    const d = new Date(s.date)
    const now = new Date()
    return d.toDateString() === now.toDateString() && s.status !== 'cancelled'
  })
  if (out.length) notifications.push({ icon: 'package', tone: 'danger', title: `${out.length} product(s) out of stock`, body: out.map((p) => p.name).join(', '), to: '/inventory' })
  if (low.length) notifications.push({ icon: 'alert', tone: 'warning', title: 'Low stock alert', body: low.map((p) => p.name).join(', '), to: '/inventory' })
  if (overdue.length) notifications.push({ icon: 'file', tone: 'danger', title: `${overdue.length} overdue invoice(s)`, body: `Total outstanding ${new Intl.NumberFormat('en-US').format(overdue.reduce((s, i) => s + i.total, 0))} TZS`, to: '/invoices' })
  if (todaySales.length) notifications.push({ icon: 'cart', tone: 'info', title: `${todaySales.length} sale(s) today`, body: `Revenue today ${new Intl.NumberFormat('en-US').format(todaySales.filter((s) => s.status === 'paid').reduce((s, x) => s + x.total, 0))} TZS`, to: '/sales' })
  if (!notifications.length) notifications.push({ icon: 'bell', tone: 'neutral', title: 'All caught up', body: 'No new notifications right now.', to: null })
  return notifications
}