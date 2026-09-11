import React, { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../store/AppContext.jsx'
import { buildSeries, computeKpis } from '../utils/calc.js'
import { TAX_RATE } from '../data/seed.js'
import { formatCurrency, formatDate, formatNumber, timeAgo, uid } from '../utils/format.js'
import { Icon } from '../components/ui/Icon.jsx'
import { Button, Field, Input, Select, StatusBadge, Avatar, Segmented, Pagination, Menu } from '../components/ui/kit.jsx'
import { Modal } from '../components/ui/Overlay.jsx'
import { ResponsiveTable } from '../components/ui/Table.jsx'
import { LineChart } from '../components/charts/charts.jsx'
import { StatCard, PageHead } from '../components/layout/StatCard.jsx'

const PERIOD_OPTS = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '3 months' },
  { value: '12m', label: '12 months' }
]
const PAGE_SIZE = 8

export function SalesPage() {
  const { data, updateSaleStatus, showToast, confirmDialog, registerSale } = useApp()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [period, setPeriod] = useState('30d')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [payment, setPayment] = useState('all')
  const [range, setRange] = useState('all')
  const [sort, setSort] = useState({ key: 'date', dir: -1 })
  const [page, setPage] = useState(1)
  const [newOpen, setNewOpen] = useState(params.get('new') === '1')
  const [menuFor, setMenuFor] = useState(null)

  const kpi = useMemo(() => computeKpis(data, period), [data, period])
  const series = useMemo(() => buildSeries(data.sales, data.expenses, period), [data, period])

  const customerName = (id) => data.customers.find((c) => c.id === id)?.name || 'Walk-in customer'

  const filtered = useMemo(() => {
    let list = [...data.sales]
    const query = q.trim().toLowerCase()
    if (query) {
      list = list.filter((s) => {
        const name = customerName(s.customerId).toLowerCase()
        return [s.number, name, s.paymentMethod].join(' ').toLowerCase().includes(query)
      })
    }
    if (status !== 'all') list = list.filter((s) => s.status === status)
    if (payment !== 'all') list = list.filter((s) => s.paymentMethod === payment)
    const now = new Date()
    if (range !== 'all') {
      const days = { 7: 7, 30: 30, 90: 90 }[range]
      const from = now.getTime() - days * 86400000
      list = list.filter((s) => new Date(s.date).getTime() >= from)
    }
    const { key, dir } = sort
    list.sort((a, b) => {
      const va = key === 'total' ? a.total : key === 'date' ? new Date(a.date).getTime() : String(a[key]).toLowerCase()
      const vb = key === 'total' ? b.total : key === 'date' ? new Date(b.date).getTime() : String(b[key]).toLowerCase()
      if (va < vb) return -1 * dir
      if (va > vb) return 1 * dir
      return 0
    })
    return list
  }, [data, q, status, payment, range, sort]) // eslint-disable-line react-hooks/exhaustive-deps

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pages)
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const closeNew = () => {
    setNewOpen(false)
    if (params.get('new')) setParams({}, { replace: true })
  }

  const changeStatus = async (sale, next) => {
    if (sale.status === next) return
    if (next === 'cancelled') {
      const ok = await confirmDialog({
        title: 'Cancel this sale?',
        message: `Sale ${sale.number} for ${formatCurrency(sale.total)} will be marked as cancelled and excluded from revenue.`,
        confirmLabel: 'Cancel sale',
        danger: true
      })
      if (!ok) return
    }
    updateSaleStatus(sale.id, next)
    showToast('ok', `Sale marked as ${next}`, `${sale.number} is now ${next}.`)
  }

  const payMethods = [...new Set(data.sales.map((s) => s.paymentMethod))]

  const columns = [
    { key: 'customer', label: 'Customer', render: (s) => (
      <span className="cust-cell">
        <Avatar name={customerName(s.customerId)} size="sm" />
        <span className="grow" style={{ minWidth: 0 }}>
          <span className="cell-main truncate" style={{ display: 'block' }}>{customerName(s.customerId)}</span>
          <span className="cell-sub">{s.items.length} item{s.items.length > 1 ? 's' : ''} · {s.paymentMethod}</span>
        </span>
      </span>
    ) },
    { key: 'number', label: 'Invoice', sortable: true, render: (s) => <span className="mono faint">{s.number}</span> },
    { key: 'date', label: 'Date', sortable: true, render: (s) => <span className="muted nowrap">{formatDate(s.date, { time: true })}</span> },
    { key: 'total', label: 'Amount', align: 'right', sortable: true, render: (s) => <b className="tabular">{formatCurrency(s.total)}</b> },
    { key: 'status', label: 'Status', render: (s) => <StatusBadge status={s.status} /> },
    {
      key: 'actions', label: '', align: 'right', hideMobile: true, render: (s) => (
        <span className="cell-actions" onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
          <Button variant="ghost" size="sm" aria-label={`Actions for ${s.number}`} onClick={() => setMenuFor(menuFor === s.id ? null : s.id)}>
            <Icon name="more" size={16} />
          </Button>
          {menuFor === s.id && (
            <Menu
              onClose={() => setMenuFor(null)}
              style={{ top: 32, right: 0 }}
              items={[
                { label: 'Mark as paid', icon: 'check-circle', onClick: () => changeStatus(s, 'paid') },
                { label: 'Mark as pending', icon: 'clock', onClick: () => changeStatus(s, 'pending') },
                'sep',
                { label: 'Cancel sale', icon: 'close', danger: true, onClick: () => changeStatus(s, 'cancelled') }
              ]}
            />
          )}
        </span>
      )
    }
  ]

  return (
    <>
      <PageHead
        title="Sales"
        subtitle="Track transactions, record new sales and monitor performance."
        actions={<Button variant="primary" icon="plus" onClick={() => setNewOpen(true)}>Record sale</Button>}
      />

      <div className="stat-grid">
        <StatCard label="Revenue" value={formatCurrency(kpi.revenue)} change={kpi.revenueChange} compare="vs previous period" icon="dollar" tone="primary" spark={series.map((s) => s.revenue)} />
        <StatCard label="Completed orders" value={formatNumber(kpi.paid)} change={kpi.salesChange} compare="fully paid" icon="check-circle" tone="ok" spark={series.map((s) => s.orders)} />
        <StatCard label="Pending orders" value={formatNumber(kpi.pending)} compare={`of ${formatNumber(kpi.sales)} orders`} icon="clock" tone="warn" />
        <StatCard label="Avg order value" value={formatCurrency(kpi.avgOrder)} compare="across the period" icon="sales" tone="info" />
      </div>

      <section className="card chart-card" style={{ marginTop: 18 }}>
        <div className="card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 className="card-title">Sales performance</h2>
            <p className="card-subtitle">Revenue and order volume over time</p>
          </div>
          <Segmented options={PERIOD_OPTS} value={period} onChange={setPeriod} />
        </div>
        <div style={{ padding: '8px 14px 14px 6px' }}>
          <LineChart
            data={series}
            series={[
              { key: 'revenue', label: 'Revenue', color: 'var(--chart-1)', area: true },
              { key: 'orders', label: 'Orders', color: 'var(--chart-2)', axis: 'right' }
            ]}
            yFormat={(v) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${Math.round(v / 1000)}K`)}
            y2Format={(v) => `${Math.round(v)}`}
            rightLabel="Orders"
          />
        </div>
      </section>

      <div className="toolbar row wrap" role="search">
        <span className="input-wrap">
          <Icon name="search" size={15} />
          <Input placeholder="Search by customer, invoice, payment…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} aria-label="Search sales" />
        </span>
        <Field label={null} style={{ width: 150 }}>
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} aria-label="Filter by status">
            <option value="all">All statuses</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </Field>
        <Field label={null} style={{ width: 160 }}>
          <Select value={payment} onChange={(e) => { setPayment(e.target.value); setPage(1) }} aria-label="Filter by payment method">
            <option value="all">All payments</option>
            {payMethods.map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
        </Field>
        <Field label={null} style={{ width: 140 }}>
          <Select value={range} onChange={(e) => { setRange(e.target.value); setPage(1) }} aria-label="Filter by date range">
            <option value="all">Any date</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </Select>
        </Field>
      </div>

      <ResponsiveTable
        columns={columns}
        rows={pageRows.map((r, i) => ({ ...r, __key: r.id || i }))}
        sort={sort}
        onSort={(key) => setSort((s) => ({ key, dir: s.key === key ? -s.dir : 1 }))}
        onRowClick={() => navigate('/reports')}
        emptyIcon="sales"
        emptyTitle={q || status !== 'all' || payment !== 'all' || range !== 'all' ? 'No sales match your filters' : 'No sales recorded'}
        emptyDesc="Your sales transactions will appear here. Record your first sale to start tracking."
        emptyAction={<Button variant="primary" size="sm" icon="plus" onClick={() => setNewOpen(true)}>Record a sale</Button>}
      />
      {filtered.length > 0 && (
        <Pagination
          page={safePage}
          pages={pages}
          onChange={setPage}
          total={filtered.length}
          from={(safePage - 1) * PAGE_SIZE + 1}
          to={Math.min(safePage * PAGE_SIZE, filtered.length)}
        />
      )}

      <NewSaleModal
        open={newOpen}
        onClose={closeNew}
        data={data}
        registerSale={registerSale}
        showToast={showToast}
        onDone={() => {
          closeNew()
        }}
      />
    </>
  )
}

const EMPTY_ITEM = () => ({ key: uid('li'), productId: '', quantity: 1 })

function NewSaleModal({ open, onClose, data, registerSale, showToast, onDone }) {
  const [customerId, setCustomerId] = useState('')
  const [items, setItems] = useState([EMPTY_ITEM()])
  const [paymentMethod, setPaymentMethod] = useState('Mobile Money')
  const [status, setStatus] = useState('paid')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [makeInvoice, setMakeInvoice] = useState(false)
  const [errors, setErrors] = useState({})

  React.useEffect(() => {
    if (open) {
      setCustomerId('')
      setItems([EMPTY_ITEM()])
      setPaymentMethod('Mobile Money')
      setStatus('paid')
      setErrors({})
      setDate(new Date().toISOString().slice(0, 10))
    }
  }, [open])

  const servicesOnly = items.filter((it) => {
    const p = data.products.find((x) => x.id === it.productId)
    return p && p.service
  })
  const physicalItems = items.filter((it) => {
    const p = data.products.find((x) => x.id === it.productId)
    return p && !p.service
  })

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, it) => {
      const p = data.products.find((x) => x.id === it.productId)
      return s + (p ? p.price * (Number(it.quantity) || 0) : 0)
    }, 0)
    const tax = Math.round(subtotal * (data.business?.taxRate || 18) / 100)
    return { subtotal, tax, total: subtotal + tax }
  }, [items, data])

  const setItem = (key, patch) => {
    setItems((list) => list.map((it) => (it.key === key ? { ...it, ...patch } : it)))
  }
  const removeItem = (key) => {
    setItems((list) => (list.length > 1 ? list.filter((it) => it.key !== key) : list))
  }
  const addItem = () => setItems((list) => [...list, EMPTY_ITEM()])

  const submit = () => {
    const errs = {}
    if (!customerId) errs.customer = 'Select a customer'
    for (const it of items) {
      if (!it.productId) {
        errs.items = 'Every line needs a product'
        break
      }
      const q = Number(it.quantity)
      if (!(q > 0)) {
        errs.items = 'Quantities must be at least 1'
        break
      }
      const p = data.products.find((x) => x.id === it.productId)
      if (p && !p.service && q > p.stock) {
        errs.items = `Only ${p.stock} of “${p.name}” in stock`
        break
      }
    }
    if (items.length === 0) errs.items = 'Add at least one product'
    setErrors(errs)
    if (Object.keys(errs).length) return

    const lineItems = items.map((it) => {
      const p = data.products.find((x) => x.id === it.productId)
      return { productId: p.id, name: p.name, quantity: Number(it.quantity), unitPrice: p.price }
    })
    const nextNo = nextSaleNumber(data.sales)
    const saleDate = new Date(`${date}T11:00:00`)
    const sale = {
      id: uid('sle'),
      number: `SL-${nextNo}`,
      customerId,
      date: saleDate.toISOString(),
      items: lineItems,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
      paymentMethod,
      status
    }
    registerSale(sale, { makeInvoice })
    showToast(
      'ok',
      'Sale recorded',
      `Sale SL-${nextNo} for ${formatCurrency(sale.total)} was saved${makeInvoice ? ' and an invoice was generated' : ''}.`
    )
    if (physicalItems.length && status === 'paid') {
      for (const it of physicalItems) {
        const p = data.products.find((x) => x.id === it.productId)
        if (p && p.stock - it.quantity <= p.minStock) {
          showToast('warn', 'Low stock', `${p.name} is now near its minimum level.`)
        }
      }
    }
    onDone()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record new sale"
      subtitle="Save a sale — inventory and dashboards update automatically."
      size="lg"
      footer={
        <>
          <span className="grow" />
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon="save" onClick={submit}>Save sale</Button>
        </>
      }
    >
      <div className="grid grid-2" style={{ gap: 14 }}>
        <Field label="Customer" required error={errors.customer}>
          <Select value={customerId} hasError={!!errors.customer} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Select a customer…</option>
            {data.customers.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.city}</option>)}
          </Select>
        </Field>
        <Field label="Sale date" required>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={new Date().toISOString().slice(0, 10)} />
        </Field>
      </div>

      <div style={{ margin: '16px 0 8px' }}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
          <span className="field-label">Items {errors.items && <span className="danger" style={{ color: 'var(--danger-text)' }}>— {errors.items}</span>}</span>
          <Button variant="secondary" size="sm" icon="plus" onClick={addItem}>Add item</Button>
        </div>
        <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 12, background: 'var(--surface-2)' }}>
          {items.map((it, i) => {
            const p = data.products.find((x) => x.id === it.productId)
            const lineTotal = p ? p.price * (Number(it.quantity) || 0) : 0
            return (
              <div key={it.key} className="line-item-row">
                <Field label={i === 0 ? 'Product' : null}>
                  <Select value={it.productId} onChange={(e) => setItem(it.key, { productId: e.target.value })}>
                    <option value="">Select product…</option>
                    {data.products.map((prod) => (
                      <option key={prod.id} value={prod.id} disabled={!prod.service && Number(prod.stock) === 0}>
                        {prod.name}{!prod.service ? ` · ${prod.stock} available` : ''}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={i === 0 ? 'Qty' : null}>
                  <Input type="number" min="1" value={it.quantity} onChange={(e) => setItem(it.key, { quantity: e.target.value })} />
                </Field>
                <div className="li-total">{formatCurrency(lineTotal)}</div>
                <button type="button" className="btn-icon btn-sm" style={{ marginTop: i === 0 ? 20 : 0 }} aria-label="Remove item" onClick={() => removeItem(it.key)}>
                  <Icon name="trash" size={15} />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-2" style={{ gap: 14, marginTop: 4 }}>
        <Field label="Payment method" required>
          <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            {['Mobile Money', 'Cash', 'Bank Transfer', 'Card'].map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
        </Field>
        <Field label="Payment status" required>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
          </Select>
        </Field>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
        <label className="checkbox">
          <input type="checkbox" checked={makeInvoice} onChange={(e) => setMakeInvoice(e.target.checked)} />
          Generate an invoice for this sale
        </label>
        <div style={{ textAlign: 'right' }}>
          <div className="faint text-xs">Subtotal <b className="tabular">{formatCurrency(totals.subtotal)}</b></div>
          <div className="faint text-xs">Tax ({(data.business?.taxRate || 18)}%) <b className="tabular">{formatCurrency(totals.tax)}</b></div>
          <div className="text-md strong" style={{ marginTop: 2 }}>Total {formatCurrency(totals.total)}</div>
        </div>
      </div>
    </Modal>
  )
}

function nextSaleNumber(sales) {
  let max = 1000
  for (const s of sales) {
    const n = parseInt(s.number.replace(/\D/g, ''), 10)
    if (!Number.isNaN(n) && n > max) max = n
  }
  return max + 1
}