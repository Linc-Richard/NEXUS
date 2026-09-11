import React, { useMemo, useState } from 'react'
import { useApp } from '../store/AppContext.jsx'
import { buildSeries, computeKpis, monthlyReport, salesByProduct, expenseByCategory, startOfCurrentPeriod, startOfPreviousPeriod, filterInRange, paymentMethodBreakdown, inventorySummary, stockStatus } from '../utils/calc.js'
import { CATEGORIES } from '../data/seed.js'
import { formatCurrency, formatNumber } from '../utils/format.js'
import { Icon } from '../components/ui/Icon.jsx'
import { Button, StatusBadge, Segmented, Badge } from '../components/ui/kit.jsx'
import { ResponsiveTable } from '../components/ui/Table.jsx'
import { LineChart, BarChart, DonutChart } from '../components/charts/charts.jsx'
import { StatCard, PageHead } from '../components/layout/StatCard.jsx'
import { catMeta } from './Expenses.jsx'

const RANGES = [
  { value: '30d', label: '30 days' },
  { value: '90d', label: '3 months' },
  { value: '12m', label: '12 months' }
]

const MONEY = (v) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${Math.round(v / 1000)}K` : `${v}`)
const CAT_COLORS = { el: 'var(--chart-5)', cl: 'var(--chart-6)', gr: 'var(--chart-2)', ts: 'var(--chart-1)' }

export function ReportsPage() {
  const { data } = useApp()
  const [range, setRange] = useState('90d')
  const [tab, setTab] = useState('revenue')

  const kpi = useMemo(() => computeKpis(data, range), [data, range])
  const series = useMemo(() => buildSeries(data.sales, data.expenses, range), [data, range])
  const monthly = useMemo(() => monthlyReport(data, 12), [data])

  const { from, to } = useMemo(() => startOfCurrentPeriod(range), [range])
  const prev = useMemo(() => startOfPreviousPeriod(range), [range])
  const prevExpenses = useMemo(() => filterInRange(data.expenses, 'date', prev.from, prev.to).reduce((s, e) => s + e.amount, 0), [data.expenses, prev])

  const topProds = useMemo(() => salesByProduct(data, from, to), [data, from, to])
  const byCategory = useMemo(() => {
    const map = new Map()
    for (const p of topProds) {
      const product = data.products.find((x) => x.id === p.productId)
      const cat = product?.category || 'el'
      map.set(cat, (map.get(cat) || 0) + p.revenue)
    }
    return [...map.entries()].map(([category, amount]) => ({ category, label: CATEGORIES.find((c) => c.key === category)?.label, amount })).sort((a, b) => b.amount - a.amount)
  }, [topProds, data.products])

  const expDist = useMemo(() => expenseByCategory(data.expenses, from, to), [data.expenses, from, to])
  const payBreakdown = useMemo(() => paymentMethodBreakdown(data, from, to), [data, from, to])
  const inv = useMemo(() => inventorySummary(data.products), [data.products])

  const tabs = [
    { id: 'revenue', label: 'Revenue', icon: 'dollar' },
    { id: 'sales', label: 'Sales', icon: 'sales' },
    { id: 'expenses', label: 'Expenses', icon: 'expenses' },
    { id: 'profit', label: 'Profit', icon: 'zap' },
    { id: 'inventory', label: 'Inventory', icon: 'inventory' }
  ]

  return (
    <>
      <PageHead
        title="Reports"
        subtitle="Business intelligence for decisions you can act on."
        actions={<Segmented options={RANGES} value={range} onChange={setRange} />}
      />

      <div className="tabs" role="tablist" aria-label="Report types">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={tab === t.id ? 'tab active' : 'tab'}
            onClick={() => setTab(t.id)}
          >
            <Icon name={t.icon} size={15} />
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 20 }}>
        {tab === 'revenue' && <RevenueReport kpi={kpi} series={series} monthly={monthly} byCategory={byCategory} range={range} />}
        {tab === 'sales' && <SalesReport kpi={kpi} series={series} topProds={topProds} payBreakdown={payBreakdown} range={range} />}
        {tab === 'expenses' && <ExpenseReport kpi={kpi} series={series} expDist={expDist} monthly={monthly} prevExpenses={prevExpenses} range={range} />}
        {tab === 'profit' && <ProfitReport kpi={kpi} series={series} monthly={monthly} range={range} />}
        {tab === 'inventory' && <InventoryReport inv={inv} products={data.products} />}
      </div>
    </>
  )
}

function RevenueReport({ kpi, series, monthly, byCategory, range }) {
  const avgPerBucket = series.length ? kpi.revenue / series.length : 0
  const best = useMemo(() => monthly.reduce((a, b) => (b.revenue > a.revenue ? b : a), monthly[0]), [monthly])
  return (
    <>
      <div className="stat-grid">
        <StatCard label="Total revenue" value={formatCurrency(kpi.revenue)} change={kpi.revenueChange} compare="vs previous period" icon="dollar" tone="primary" />
        <StatCard label="Avg per bucket" value={formatCurrency(avgPerBucket)} icon="chart-line" tone="info" compare={RANGES.find((r) => r.value === range)?.label} />
        <StatCard label="Best month" value={formatCurrency(best?.revenue || 0)} icon="trending-up" tone="ok" compare={best?.label || '—'} />
        <StatCard label="Paid orders" value={formatNumber(kpi.paid)} icon="check-circle" tone="warn" compare="of completed sales" />
      </div>
      <section className="card chart-card" style={{ marginTop: 18 }}>
        <div className="card-header">
          <div>
            <h2 className="card-title">Revenue trajectory</h2>
            <p className="card-subtitle">Revenue against expenses over the selected range</p>
          </div>
        </div>
        <div style={{ padding: '8px 14px 14px 6px' }}>
          <LineChart
            data={series}
            series={[
              { key: 'revenue', label: 'Revenue', color: 'var(--chart-1)', area: true },
              { key: 'expenses', label: 'Expenses', color: 'var(--chart-4)' }
            ]}
            yFormat={MONEY}
            leftLabel="TZS"
          />
        </div>
      </section>
      <div className="grid grid-chart" style={{ marginTop: 18 }}>
        <section className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Monthly revenue</h2>
              <p className="card-subtitle">Last 12 months</p>
            </div>
          </div>
          <div className="table-wrap report-table" style={{ marginTop: 10 }}>
            <table className="table">
              <thead>
                <tr><th>Month</th><th className="text-right">Revenue</th><th className="text-right">Orders</th><th className="text-right">Avg order</th></tr>
              </thead>
              <tbody>
                {monthly.slice(-8).reverse().map((m) => (
                  <tr key={m.key}>
                    <td className="cell-main">{m.label}</td>
                    <td className="text-right tabular">{formatCurrency(m.revenue)}</td>
                    <td className="text-right tabular">{formatNumber(m.orders)}</td>
                    <td className="text-right tabular muted">{m.orders ? formatCurrency(m.avgOrder) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Revenue by category</h2>
              <p className="card-subtitle">Where revenue comes from</p>
            </div>
          </div>
          <div style={{ padding: '16px 14px 10px 4px' }}>
            {byCategory.length ? (
              <BarChart
                data={byCategory.map((c) => ({ label: c.category.toUpperCase(), key: 'amount', amount: c.amount }))}
                series={[{ key: 'amount', label: 'Revenue', color: 'var(--chart-1)' }]}
                yFormat={MONEY}
                height={230}
              />
            ) : (
              <div className="muted" style={{ padding: 30, textAlign: 'center', fontSize: 13 }}>No revenue this period</div>
            )}
          </div>
        </section>
      </div>
    </>
  )
}

function SalesReport({ kpi, series, topProds, payBreakdown, range }) {
  const totalPay = payBreakdown.reduce((s, p) => s + p.amount, 0)
  const PAY_COLORS = {
    'Mobile Money': 'var(--chart-1)',
    Cash: 'var(--chart-2)',
    'Bank Transfer': 'var(--chart-5)',
    Card: 'var(--chart-3)'
  }
  return (
    <>
      <div className="stat-grid">
        <StatCard label="Total orders" value={formatNumber(kpi.sales)} change={kpi.salesChange} compare="vs previous period" icon="sales" tone="primary" />
        <StatCard label="Completed" value={formatNumber(kpi.paid)} icon="check-circle" tone="ok" compare={`${kpi.sales ? Math.round((kpi.paid / kpi.sales) * 100) : 0}% completion`} />
        <StatCard label="Pending" value={formatNumber(kpi.pending)} icon="clock" tone="warn" compare="Awaiting payment" />
        <StatCard label="Average order value" value={formatCurrency(kpi.avgOrder)} icon="dollar" tone="info" compare="Across the period" />
      </div>
      <section className="card chart-card" style={{ marginTop: 18 }}>
        <div className="card-header">
          <div>
            <h2 className="card-title">Order volume</h2>
            <p className="card-subtitle">Orders per {RANGES.find((r) => r.value === range)?.label}</p>
          </div>
        </div>
        <div style={{ padding: '12px 14px 14px 6px' }}>
          <BarChart
            data={series}
            series={[{ key: 'orders', label: 'Orders', color: 'var(--chart-2)' }]}
            yFormat={(v) => `${Math.round(v)}`}
          />
        </div>
      </section>
      <div className="grid grid-chart" style={{ marginTop: 18 }}>
        <section className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Sales by product</h2>
              <p className="card-subtitle">Top revenue drivers this period</p>
            </div>
          </div>
          <div className="table-wrap report-table" style={{ marginTop: 10 }}>
            <table className="table">
              <thead>
                <tr><th>Product</th><th className="text-right">Units</th><th className="text-right">Revenue</th><th>Share</th></tr>
              </thead>
              <tbody>
                {topProds.slice(0, 8).map((p) => (
                  <tr key={p.productId}>
                    <td className="cell-main truncate" style={{ maxWidth: 220 }}>{p.name}</td>
                    <td className="text-right tabular">{formatNumber(p.units)}</td>
                    <td className="text-right tabular">{formatCurrency(p.revenue)}</td>
                    <td>
                      <div className="progress"><div style={{ width: `${(p.revenue / (topProds[0]?.revenue || 1)) * 100}%` }} /></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Payment methods</h2>
              <p className="card-subtitle">How customers pay</p>
            </div>
          </div>
          <div style={{ padding: '16px 20px 6px', display: 'flex', justifyContent: 'center' }}>
            {payBreakdown.length ? (
              <DonutChart
                data={payBreakdown.map((p) => ({ label: p.method, value: p.amount, color: PAY_COLORS[p.method] || 'var(--chart-6)' }))}
                size={176}
                centerTop="Collected"
                centerBottom={formatCurrency(totalPay, { compact: true })}
                format={formatCurrency}
              />
            ) : (
              <div className="muted" style={{ padding: 40, fontSize: 13 }}>No payments this period</div>
            )}
          </div>
          <div className="expense-legend" style={{ padding: '2px 22px 20px' }}>
            {payBreakdown.map((p) => (
              <div key={p.method} className="el-row">
                <span className="el-dot" style={{ background: PAY_COLORS[p.method] || 'var(--chart-6)' }} />
                <span className="el-name">{p.method}</span>
                <span className="el-val">{formatCurrency(p.amount)}</span>
                <span className="el-pct">{totalPay ? Math.round((p.amount / totalPay) * 100) : 0}%</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}

function ExpenseReport({ kpi, series, expDist, monthly, prevExpenses, range }) {
  const ratio = kpi.revenue ? (kpi.expenses / kpi.revenue) * 100 : 0
  return (
    <>
      <div className="stat-grid">
        <StatCard label="Total expenses" value={formatCurrency(kpi.expenses)} change={kpi.expensesChange} compare="vs previous period" icon="expenses" tone="warn" />
        <StatCard label="Expense ratio" value={`${ratio.toFixed(1)}%`} icon="pie" tone="danger" compare="of revenue" />
        <StatCard label="Largest category" value={expDist[0]?.category || '—'} icon="more" tone="primary" compare={expDist[0] ? formatCurrency(expDist[0].amount) : 'No expenses'} />
        <StatCard label="Avg monthly" value={formatCurrency(series.length ? kpi.expenses / series.length : 0)} icon="calendar" tone="info" compare="Per period" />
      </div>
      <section className="card chart-card" style={{ marginTop: 18 }}>
        <div className="card-header">
          <div>
            <h2 className="card-title">Spending trend</h2>
            <p className="card-subtitle">Monthly expenses over the last 12 months</p>
          </div>
        </div>
        <div style={{ padding: '12px 14px 14px 6px' }}>
          <BarChart
            data={monthly.map((m) => ({ label: m.label.slice(0, 3), key: 'expenses', expenses: m.expenses }))}
            series={[{ key: 'expenses', label: 'Expenses', color: 'var(--chart-3)' }]}
            yFormat={MONEY}
          />
        </div>
      </section>
      <div className="grid grid-chart" style={{ marginTop: 18 }}>
        <section className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Category breakdown</h2>
              <p className="card-subtitle">Expense distribution — {RANGES.find((r) => r.value === range)?.label}</p>
            </div>
          </div>
          <div className="table-wrap report-table" style={{ marginTop: 10 }}>
            <table className="table">
              <thead>
                <tr><th>Category</th><th className="text-right">Amount</th><th className="text-right">Share</th></tr>
              </thead>
              <tbody>
                {expDist.map((e) => (
                  <tr key={e.category}>
                    <td className="cell-main">
                      <span className="row gap-2">
                        <span className="el-dot" style={{ background: catMeta(e.category).color, width: 9, height: 9, borderRadius: 3 }} />
                        {e.category}
                      </span>
                    </td>
                    <td className="text-right tabular">{formatCurrency(e.amount)}</td>
                    <td className="text-right tabular muted">{kpi.expenses ? `${Math.round((e.amount / kpi.expenses) * 100)}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">vs previous period</h2>
              <p className="card-subtitle">Expense comparison</p>
            </div>
          </div>
          <div className="card-body" style={{ paddingTop: 14 }}>
            <div className="row gap-4" style={{ justifyContent: 'space-between' }}>
              <div>
                <div className="faint text-xs">Current</div>
                <b className="tabular text-lg">{formatCurrency(kpi.expenses)}</b>
              </div>
              <div>
                <div className="faint text-xs">Previous</div>
                <b className="tabular text-lg">{formatCurrency(prevExpenses)}</b>
              </div>
            </div>
            <div className="divider" style={{ margin: '14px 0' }} />
            <div className="row gap-3" style={{ justifyContent: 'space-between' }}>
              <span className="muted text-sm">Change</span>
              <Badge tone={kpi.expensesChange > 0 ? 'danger' : 'ok'}>
                {kpi.expensesChange > 0 ? '▲' : '▼'} {Math.abs(kpi.expensesChange).toFixed(1)}%
              </Badge>
            </div>
            <p className="muted" style={{ fontSize: 12.5, marginTop: 12, lineHeight: 1.6 }}>
              {kpi.expensesChange > 0
                ? 'Spending rose — check marketing and transport lines for overruns.'
                : 'Spending is under control compared with the previous period.'}
            </p>
          </div>
        </section>
      </div>
    </>
  )
}

function ProfitReport({ kpi, series, monthly }) {
  const margin = kpi.revenue ? (kpi.profit / kpi.revenue) * 100 : 0
  return (
    <>
      <div className="stat-grid">
        <StatCard label="Revenue" value={formatCurrency(kpi.revenue)} change={kpi.revenueChange} compare="vs previous" icon="dollar" tone="primary" />
        <StatCard label="Expenses" value={formatCurrency(kpi.expenses)} change={kpi.expensesChange} compare="vs previous" icon="expenses" tone="warn" />
        <StatCard label="Net profit" value={formatCurrency(kpi.profit)} change={kpi.profitChange} compare="bottom line" icon="zap" tone={kpi.profit >= 0 ? 'ok' : 'danger'} />
        <StatCard label="Profit margin" value={`${margin.toFixed(1)}%`} icon="pie" tone="info" compare={margin >= 20 ? 'Healthy margin' : 'Watch costs'} />
      </div>
      <section className="card chart-card" style={{ marginTop: 18 }}>
        <div className="card-header">
          <div>
            <h2 className="card-title">Profit & loss</h2>
            <p className="card-subtitle">Revenue, expenses and profit over time</p>
          </div>
        </div>
        <div style={{ padding: '8px 14px 14px 6px' }}>
          <LineChart
            data={series}
            series={[
              { key: 'revenue', label: 'Revenue', color: 'var(--chart-1)', area: true },
              { key: 'expenses', label: 'Expenses', color: 'var(--chart-4)' },
              { key: 'profit', label: 'Profit', color: 'var(--chart-2)' }
            ]}
            yFormat={MONEY}
            leftLabel="TZS"
          />
        </div>
      </section>
      <section className="card" style={{ marginTop: 18 }}>
        <div className="card-header">
          <div>
            <h2 className="card-title">Monthly profit & loss statement</h2>
            <p className="card-subtitle">Last 12 months — suitable for a business owner review</p>
          </div>
        </div>
        <div className="table-wrap report-table" style={{ marginTop: 10 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Month</th>
                <th className="text-right">Revenue</th>
                <th className="text-right">Expenses</th>
                <th className="text-right">Profit</th>
                <th className="text-right">Margin</th>
              </tr>
            </thead>
            <tbody>
              {monthly.slice().reverse().map((m) => (
                <tr key={m.key}>
                  <td className="cell-main">{m.label}</td>
                  <td className="text-right tabular">{formatCurrency(m.revenue)}</td>
                  <td className="text-right tabular">{formatCurrency(m.expenses)}</td>
                  <td className={`text-right tabular ${m.profit >= 0 ? 'pnl-pos' : 'pnl-neg'}`}>{formatCurrency(m.profit)}</td>
                  <td className="text-right tabular muted">{m.margin.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

function InventoryReport({ inv, products }) {
  const byValue = useMemo(() => {
    const map = new Map()
    for (const p of products) {
      if (p.service) continue
      const cat = CATEGORIES.find((c) => c.key === p.category)?.label || p.category
      map.set(cat, (map.get(cat) || 0) + p.stock * p.cost)
    }
    return [...map.entries()].map(([label, value]) => ({ label, key: 'value', value })).sort((a, b) => b.value - a.value)
  }, [products])

  const low = products.filter((p) => !p.service && stockStatus(p) !== 'in')

  return (
    <>
      <div className="stat-grid">
        <StatCard label="Products tracked" value={formatNumber(inv.total)} icon="products" tone="primary" compare="All SKUs" />
        <StatCard label="Stock value" value={formatCurrency(inv.stockValue)} icon="dollar" tone="info" compare="At cost price" />
        <StatCard label="Low stock" value={formatNumber(inv.low + inv.out)} icon="alert" tone="warn" compare={`${formatNumber(inv.low)} low · ${formatNumber(inv.out)} out`} />
        <StatCard label="Healthy SKUs" value={formatNumber(inv.in)} icon="check-circle" tone="ok" compare="Above minimum" />
      </div>
      <div className="grid grid-chart" style={{ marginTop: 18 }}>
        <section className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Inventory value by category</h2>
              <p className="card-subtitle">Capital tied up in stock</p>
            </div>
          </div>
          <div style={{ padding: '16px 14px 12px 4px' }}>
            {byValue.length ? (
              <BarChart
                data={byValue}
                series={[{ key: 'value', label: 'Stock value', color: 'var(--chart-5)' }]}
                yFormat={MONEY}
                height={240}
              />
            ) : (
              <div className="muted" style={{ padding: 30, textAlign: 'center', fontSize: 13 }}>No physical inventory</div>
            )}
          </div>
        </section>
        <section className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Stock alerts</h2>
              <p className="card-subtitle">Products needing attention</p>
            </div>
          </div>
          <div style={{ padding: '12px 20px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {low.length === 0 ? (
              <div className="row gap-2 muted" style={{ padding: 20, justifyContent: 'center', flexDirection: 'column', textAlign: 'center' }}>
                <Icon name="check-circle" size={22} className="ok" />
                All products are above their minimum stock levels.
              </div>
            ) : (
              low.map((p) => (
                <div key={p.id} className="row gap-3" style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <span className="grow" style={{ minWidth: 0 }}>
                    <span className="truncate" style={{ display: 'block', fontWeight: 600, fontSize: 13 }}>{p.name}</span>
                    <span className="faint text-xs">{p.stock} / {p.minStock} min</span>
                  </span>
                  <StatusBadge status={stockStatus(p)} />
                </div>
              ))
            )}
          </div>
        </section>
      </div>
      <section className="card" style={{ marginTop: 18 }}>
        <div className="card-header">
          <div>
            <h2 className="card-title">Stock report</h2>
            <p className="card-subtitle">Full inventory valuation summary</p>
          </div>
        </div>
        <div className="table-wrap report-table" style={{ marginTop: 10 }}>
          <table className="table">
            <thead>
              <tr><th>Product</th><th className="text-right">Units</th><th className="text-right">Unit cost</th><th className="text-right">Stock value</th><th>Status</th></tr>
            </thead>
            <tbody>
              {products.filter((p) => !p.service).map((p) => (
                <tr key={p.id}>
                  <td className="cell-main truncate" style={{ maxWidth: 260 }}>{p.name}</td>
                  <td className="text-right tabular">{formatNumber(p.stock)}</td>
                  <td className="text-right tabular">{formatCurrency(p.cost)}</td>
                  <td className="text-right tabular">{formatCurrency(p.stock * p.cost)}</td>
                  <td><StatusBadge status={stockStatus(p)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}