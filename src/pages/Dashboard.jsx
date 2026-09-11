import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext.jsx'
import { buildSeries, computeKpis, topProducts } from '../utils/calc.js'
import { formatCurrency, formatDate, formatNumber, greeting, timeAgo } from '../utils/format.js'
import { Icon } from '../components/ui/Icon.jsx'
import { Button, StatusBadge, Segmented, Avatar } from '../components/ui/kit.jsx'
import { ResponsiveTable } from '../components/ui/Table.jsx'
import { DonutChart, LineChart } from '../components/charts/charts.jsx'
import { StatCard, PageHead } from '../components/layout/StatCard.jsx'
import { CATEGORIES } from '../data/seed.js'

const PERIOD_OPTS = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '3 months' },
  { value: '12m', label: '12 months' }
]

export function Dashboard() {
  const { data } = useApp()
  const navigate = useNavigate()
  const [period, setPeriod] = useState('30d')

  const kpi = useMemo(() => computeKpis(data, period), [data, period])
  const series = useMemo(() => buildSeries(data.sales, data.expenses, period), [data, period])
  const top = useMemo(() => topProducts(data, 5), [data])
  const recentSales = useMemo(() => data.sales.slice(0, 7), [data])

  const catColor = (key) => CATEGORIES.find((c) => c.key === key)?.color || 'cat-el'
  const firstName = (data?.preferences?.profile?.name || 'Alex').split(' ')[0]

  const customerName = (id) => data.customers.find((c) => c.id === id)?.name || 'Walk-in customer'

  const orderDonut = [
    { label: 'Completed', value: kpi.paid, color: 'var(--chart-2)' },
    { label: 'Pending', value: kpi.pending, color: 'var(--chart-3)' },
    { label: 'Cancelled', value: kpi.cancelled, color: 'var(--chart-4)' }
  ].filter((d) => d.value > 0)

  const recentCols = [
    { key: 'customer', label: 'Customer', render: (r) => (
      <span className="cust-cell">
        <Avatar name={customerName(r.customerId)} size="sm" />
        <span><span className="cell-main" style={{ display: 'block' }}>{customerName(r.customerId)}</span></span>
      </span>
    ) },
    { key: 'number', label: 'Invoice', render: (r) => <span className="mono faint">{r.number}</span> },
    { key: 'date', label: 'Date', render: (r) => <span className="muted">{r.date ? `${formatDate(r.date)} · ${timeAgo(r.date)}` : '—'}</span> },
    { key: 'total', label: 'Amount', align: 'right', render: (r) => <b className="tabular">{formatCurrency(r.total)}</b> },
    { key: 'payment', label: 'Payment', render: (r) => <span className="muted">{r.paymentMethod}</span> },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> }
  ]

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">
            {greeting()}, {firstName}
          </h1>
          <p className="page-desc">Here's what's happening with your business today.</p>
        </div>
        <div className="page-actions">
          <Segmented options={PERIOD_OPTS} value={period} onChange={setPeriod} />
          <Button variant="primary" icon="plus" onClick={() => navigate('/sales?new=1')}>
            Record sale
          </Button>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard
          label="Total Revenue"
          value={formatCurrency(kpi.revenue)}
          change={kpi.revenueChange}
          compare="vs last period"
          icon="dollar"
          tone="primary"
          spark={series.map((s) => s.revenue)}
        />
        <StatCard
          label="Sales"
          value={formatNumber(kpi.sales)}
          change={kpi.salesChange}
          compare="vs last period"
          icon="sales"
          tone="info"
          spark={series.map((s) => s.orders)}
        />
        <StatCard
          label="Expenses"
          value={formatCurrency(kpi.expenses)}
          change={kpi.expensesChange}
          compare="vs last period"
          icon="expenses"
          tone="warn"
          spark={series.map((s) => s.expenses)}
        />
        <StatCard
          label="Net Profit"
          value={formatCurrency(kpi.profit)}
          change={kpi.profitChange}
          compare="after expenses"
          icon="zap"
          tone={kpi.profit >= 0 ? 'ok' : 'danger'}
          spark={series.map((s) => s.revenue - s.expenses)}
        />
      </div>

      <div className="grid grid-chart" style={{ marginTop: 18 }}>
        <section className="card chart-card">
          <div className="card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h2 className="card-title">Revenue overview</h2>
              <p className="card-subtitle">
                Revenue, expenses and order volume · {PERIOD_OPTS.find((p) => p.value === period)?.label}
              </p>
            </div>
            <div className="row gap-3" style={{ fontSize: 12.5, color: 'var(--text-2)' }}>
              <span className="row gap-1"><span className="el-dot" style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--chart-1)' }} />Revenue</span>
              <span className="row gap-1"><span className="el-dot" style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--chart-4)' }} />Expenses</span>
              <span className="row gap-1"><span className="el-dot" style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--chart-2)' }} />Orders</span>
            </div>
          </div>
          <div style={{ padding: '8px 14px 16px 6px' }}>
            <LineChart
              data={series}
              series={[
                { key: 'revenue', label: 'Revenue', color: 'var(--chart-1)', area: true },
                { key: 'expenses', label: 'Expenses', color: 'var(--chart-4)' },
                { key: 'orders', label: 'Orders', color: 'var(--chart-2)', axis: 'right' }
              ]}
              yFormat={(v) => `TZS ${v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${Math.round(v / 1000)}K`}`}
              y2Format={(v) => `${Math.round(v)}`}
              leftLabel="TZS"
              rightLabel="Orders"
            />
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Order summary</h2>
              <p className="card-subtitle">Completed, pending & cancelled</p>
            </div>
          </div>
          <div style={{ padding: '18px 20px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {orderDonut.length > 0 ? (
              <DonutChart
                data={orderDonut}
                size={168}
                centerTop="Orders"
                centerBottom={String(kpi.paid + kpi.pending + kpi.cancelled)}
              />
            ) : (
              <div className="muted" style={{ fontSize: 13, padding: 30 }}>No orders in this period</div>
            )}
          </div>
          <div className="expense-legend" style={{ padding: '0 22px 18px' }}>
            <div className="el-row">
              <span className="el-dot" style={{ background: 'var(--chart-2)' }} />
              <span className="el-name">Average order value</span>
              <span className="el-val">{formatCurrency(kpi.avgOrder)}</span>
            </div>
            <div className="el-row">
              <span className="el-dot" style={{ background: 'var(--chart-2)' }} />
              <span className="el-name">Completed orders</span>
              <span className="el-val">{formatNumber(kpi.paid)}</span>
            </div>
            <div className="el-row">
              <span className="el-dot" style={{ background: 'var(--chart-3)' }} />
              <span className="el-name">Pending orders</span>
              <span className="el-val">{formatNumber(kpi.pending)}</span>
            </div>
            <div className="el-row">
              <span className="el-dot" style={{ background: 'var(--chart-4)' }} />
              <span className="el-name">Cancelled orders</span>
              <span className="el-val">{formatNumber(kpi.cancelled)}</span>
            </div>
          </div>
        </section>
      </div>

      <div className="grid grid-chart" style={{ marginTop: 18 }}>
        <section className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Recent sales</h2>
              <p className="card-subtitle">Latest transactions across your store</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/sales')}>
              View all <Icon name="chevron-right" size={14} />
            </Button>
          </div>
          <div style={{ padding: '10px 20px 4px' }}>
            <ResponsiveTable
              columns={recentCols}
              rows={recentSales.map((r, i) => ({ ...r, __key: r.id || i }))}
              onRowClick={() => navigate('/sales')}
              emptyIcon="inbox"
              emptyTitle="No sales yet"
              emptyDesc="Your sales transactions will appear here. Record your first sale to get started."
              emptyAction={<Button variant="primary" size="sm" icon="plus" onClick={() => navigate('/sales?new=1')}>Record sale</Button>}
            />
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Top products</h2>
              <p className="card-subtitle">Best sellers by revenue</p>
            </div>
          </div>
          <div className="card-body" style={{ paddingTop: 14 }}>
            {top.length === 0 ? (
              <div className="muted" style={{ fontSize: 13, padding: '20px 0' }}>No product sales recorded yet.</div>
            ) : (
              top.map((p, i) => {
                const product = data.products.find((x) => x.id === p.productId)
                const cat = product?.category || 'el'
                const pct = top[0].revenue ? Math.round((p.revenue / top[0].revenue) * 100) : 0
                return (
                  <div key={p.productId} className="row gap-3" style={{ padding: '9px 0' }}>
                    <span className={`product-ic ${catColor(cat)}`}>
                      <Icon name={cat === 'ts' ? 'cpu' : cat === 'gr' ? 'tag' : cat === 'cl' ? 'shrink-2' : 'zap'} size={17} />
                    </span>
                    <div className="grow" style={{ minWidth: 0 }}>
                      <div className="row gap-2">
                        <b style={{ fontSize: 13, flex: 1, minWidth: 0 }} className="truncate">{p.name}</b>
                        <span className="strong tabular" style={{ fontSize: 13 }}>{formatCurrency(p.revenue, { compact: true })}</span>
                      </div>
                      <div className="row gap-2" style={{ marginTop: 4 }}>
                        <span className="faint" style={{ fontSize: 12 }}>{CATEGORIES.find((c) => c.key === cat)?.label}</span>
                        <span className="faint" style={{ fontSize: 12 }}>·</span>
                        <span className="faint" style={{ fontSize: 12 }}>{formatNumber(p.units)} sold</span>
                      </div>
                      <div className="progress" style={{ marginTop: 8, height: 5 }}>
                        <div style={{ width: `${Math.max(pct, 4)}%`, background: 'var(--primary)' }} />
                      </div>
                    </div>
                  </div>
                )
              })
            )}
            <div className="divider" style={{ margin: '10px 0 4px' }} />
            <Button variant="ghost" size="sm" className="btn-block" onClick={() => navigate('/products')}>
              View all products
            </Button>
          </div>
        </section>
      </div>
    </>
  )
}