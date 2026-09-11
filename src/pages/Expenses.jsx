import React, { useMemo, useState } from 'react'
import { useApp } from '../store/AppContext.jsx'
import { expenseByCategory, startOfCurrentPeriod } from '../utils/calc.js'
import { formatCurrency, formatDate, formatNumber, uid } from '../utils/format.js'
import { Icon } from '../components/ui/Icon.jsx'
import { Button, Field, Input, Select, Pagination, Badge } from '../components/ui/kit.jsx'
import { Modal } from '../components/ui/Overlay.jsx'
import { ResponsiveTable } from '../components/ui/Table.jsx'
import { DonutChart, BarChart } from '../components/charts/charts.jsx'
import { StatCard, PageHead } from '../components/layout/StatCard.jsx'

export const EXPENSE_CATEGORIES = [
  { key: 'Rent', icon: 'building', color: 'var(--chart-1)' },
  { key: 'Transport', icon: 'truck', color: 'var(--chart-5)' },
  { key: 'Salaries', icon: 'users', color: 'var(--chart-2)' },
  { key: 'Utilities', icon: 'zap', color: 'var(--chart-3)' },
  { key: 'Marketing', icon: 'globe', color: 'var(--chart-6)' },
  { key: 'Supplies', icon: 'package', color: 'var(--chart-4)' },
  { key: 'Other', icon: 'more', color: '#64748B' }
]
export const catMeta = (key) => EXPENSE_CATEGORIES.find((c) => c.key === key) || EXPENSE_CATEGORIES[6]

const PAGE_SIZE = 8

export function ExpensesPage() {
  const { data, saveExpense, deleteExpense, confirmDialog, showToast } = useApp()
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('all')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [sort, setSort] = useState({ key: 'date', dir: -1 })

  const { from, to } = useMemo(() => startOfCurrentPeriod('30d'), [])
  const monthFrom = useMemo(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  }, [])

  const thirtyDay = useMemo(() => data.expenses.filter((e) => new Date(e.date).getTime() >= from.getTime()), [data.expenses, from])
  const thirtyTotal = thirtyDay.reduce((s, e) => s + e.amount, 0)

  const monthTotal = useMemo(
    () => data.expenses.filter((e) => new Date(e.date).getTime() >= monthFrom.getTime()).reduce((s, e) => s + e.amount, 0),
    [data.expenses, monthFrom]
  )

  const distribution = useMemo(() => expenseByCategory(data.expenses, from, to), [data.expenses, from, to])
  const largest = distribution[0]

  const monthlyTrend = useMemo(() => {
    const today = new Date()
    const rows = []
    for (let i = 5; i >= 0; i--) {
      const start = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const end = new Date(today.getFullYear(), today.getMonth() - i + 1, 1)
      const sum = data.expenses
        .filter((e) => {
          const t = new Date(e.date).getTime()
          return t >= start.getTime() && t < end.getTime()
        })
        .reduce((s, e) => s + e.amount, 0)
      rows.push({ label: start.toLocaleDateString('en-GB', { month: 'short' }), key: 'amount', amount: sum })
    }
    return rows
  }, [data.expenses])

  const filtered = useMemo(() => {
    let list = [...data.expenses]
    const query = q.trim().toLowerCase()
    if (query) list = list.filter((e) => e.description.toLowerCase().includes(query))
    if (category !== 'all') list = list.filter((e) => e.category === category)
    list.sort((a, b) => (a.date < b.date ? 1 : -1))
    return list
  }, [data.expenses, q, category])

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pages)
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const handleDelete = async (e) => {
    const ok = await confirmDialog({
      title: 'Delete this expense?',
      message: `“${e.description}” (${formatCurrency(e.amount)}) will be removed.`,
      confirmLabel: 'Delete expense',
      danger: true
    })
    if (ok) {
      deleteExpense(e.id)
      showToast('ok', 'Expense deleted', 'The expense entry was removed.')
    }
  }

  const columns = [
    { key: 'date', label: 'Date', sortable: true, render: (e) => <span className="muted nowrap">{formatDate(e.date)}</span> },
    { key: 'category', label: 'Category', render: (e) => {
      const m = catMeta(e.category)
      return (
        <span className="badge badge-neutral"><span className="dot" style={{ background: m.color, color: m.color }} />{e.category}</span>
      )
    } },
    { key: 'description', label: 'Description', render: (e) => <span style={{ fontWeight: 500 }}>{e.description}</span> },
    { key: 'amount', label: 'Amount', align: 'right', sortable: true, render: (e) => <b className="tabular">{formatCurrency(e.amount)}</b> },
    {
      key: 'actions', label: '', align: 'right', hideMobile: true, render: (e) => (
        <span className="cell-actions" onClick={(st) => st.stopPropagation()}>
          <Button variant="ghost" size="sm" icon="edit" aria-label={`Edit expense`} onClick={() => { setEditing(e); setFormOpen(true) }} />
          <Button variant="ghost" size="sm" icon="trash" aria-label={`Delete expense`} onClick={() => handleDelete(e)} />
        </span>
      )
    }
  ]

  return (
    <>
      <PageHead
        title="Expenses"
        subtitle="Track spending by category and protect your margins."
        actions={<Button variant="primary" icon="plus" onClick={() => { setEditing(null); setFormOpen(true) }}>Add expense</Button>}
      />

      <div className="stat-grid">
        <StatCard label="Total expenses (30d)" value={formatCurrency(thirtyTotal)} icon="expenses" tone="warn" compare="Trailing 30 days" />
        <StatCard label="This month" value={formatCurrency(monthTotal)} icon="calendar" tone="primary" compare={new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })} />
        <StatCard
          label="Largest category"
          value={largest ? largest.category : '—'}
          icon={largest ? catMeta(largest.category).icon : 'more'}
          tone="danger"
          compare={largest ? `${formatCurrency(largest.amount)} spent` : 'No expenses yet'}
        />
        <StatCard label="Expense entries" value={formatNumber(data.expenses.length)} icon="clipboard" tone="info" compare="All recorded entries" />
      </div>

      <div className="grid grid-chart" style={{ marginTop: 18 }}>
        <section className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Monthly spending</h2>
              <p className="card-subtitle">Expenses over the last 6 months</p>
            </div>
          </div>
          <div style={{ padding: '14px 10px 8px 0' }}>
            <BarChart
              data={monthlyTrend}
              series={[{ key: 'amount', label: 'Expenses', color: 'var(--chart-3)' }]}
              yFormat={(v) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${Math.round(v / 1000)}K`)}
            />
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Where it goes</h2>
              <p className="card-subtitle">Expense distribution — last 30 days</p>
            </div>
          </div>
          <div style={{ padding: '16px 20px 8px', display: 'flex', justifyContent: 'center' }}>
            {distribution.length ? (
              <DonutChart
                data={distribution.map((d) => ({ label: d.category, value: d.amount, color: catMeta(d.category).color }))}
                size={180}
                centerTop="Spent"
                centerBottom={formatCurrency(thirtyTotal, { compact: true })}
                format={formatCurrency}
              />
            ) : (
              <div className="muted" style={{ padding: 40, fontSize: 13 }}>No expenses this period</div>
            )}
          </div>
          <div className="expense-legend" style={{ padding: '4px 22px 20px' }}>
            {distribution.map((d) => (
              <div key={d.category} className="el-row">
                <span className="el-dot" style={{ background: catMeta(d.category).color }} />
                <span className="el-name">{d.category}</span>
                <span className="el-val">{formatCurrency(d.amount)}</span>
                <span className="el-pct">{thirtyTotal ? Math.round((d.amount / thirtyTotal) * 100) : 0}%</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="toolbar row wrap" role="search" style={{ marginTop: 18 }}>
        <span className="input-wrap">
          <Icon name="search" size={15} />
          <Input placeholder="Search expenses…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} aria-label="Search expenses" />
        </span>
        <Field label={null} style={{ minWidth: 190, width: 190 }}>
          <Select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1) }} aria-label="Filter by category">
            <option value="all">All categories</option>
            {EXPENSE_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.key}</option>)}
          </Select>
        </Field>
        <span className="spacer" />
        <Badge tone="neutral">Total shown: {formatCurrency(filtered.reduce((s, e) => s + e.amount, 0))}</Badge>
      </div>

      <ResponsiveTable
        columns={columns}
        rows={pageRows.map((r, i) => ({ ...r, __key: r.id || i }))}
        sort={sort}
        onSort={(key) => setSort((s) => ({ key, dir: s.key === key ? -s.dir : 1 }))}
        emptyIcon="expenses"
        emptyTitle={q || category !== 'all' ? 'No expenses match your filters' : 'No expenses yet'}
        emptyDesc="Expenses you record here feed straight into your profit reports."
        emptyAction={<Button variant="primary" size="sm" icon="plus" onClick={() => { setEditing(null); setFormOpen(true) }}>Add expense</Button>}
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

      <ExpenseFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editing={editing}
        onSave={(e) => {
          const isNew = !editing
          saveExpense(e)
          setFormOpen(false)
          showToast('ok', isNew ? 'Expense added' : 'Expense updated', `${e.description} — ${formatCurrency(e.amount)}`)
        }}
      />
    </>
  )
}

function ExpenseFormModal({ open, onClose, editing, onSave }) {
  const empty = { category: 'Other', description: '', amount: '', date: new Date().toISOString().slice(0, 10) }
  const [form, setForm] = useState(empty)
  const [errors, setErrors] = useState({})

  React.useEffect(() => {
    if (open) {
      if (editing) setForm({ category: editing.category, description: editing.description, amount: String(editing.amount), date: editing.date.slice(0, 10) })
      else setForm(empty)
      setErrors({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing])

  const submit = (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.description.trim()) errs.description = 'Add a short description'
    if (!(Number(form.amount) > 0)) errs.amount = 'Enter a valid amount'
    if (!form.date) errs.date = 'Pick a date'
    setErrors(errs)
    if (Object.keys(errs).length) return
    onSave({
      id: editing?.id || uid('exp'),
      category: form.category,
      description: form.description.trim(),
      amount: Number(form.amount),
      date: new Date(`${form.date}T10:00:00`).toISOString()
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit expense' : 'Add expense'}
      subtitle={editing ? 'Update this expense entry' : 'Record a new business expense'}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="expense-form">{editing ? 'Save changes' : 'Add expense'}</Button>
        </>
      }
    >
      <form id="expense-form" onSubmit={submit} noValidate>
        <div className="grid grid-2" style={{ gap: 14 }}>
          <Field label="Category" required style={{ gridColumn: '1 / -1' }}>
            <Select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
              {EXPENSE_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.key}</option>)}
            </Select>
          </Field>
          <Field label="Description" required error={errors.description} style={{ gridColumn: '1 / -1' }}>
            <Input placeholder="e.g. Delivery truck fuel" value={form.description} hasError={!!errors.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </Field>
          <Field label="Amount (TZS)" required error={errors.amount}>
            <Input type="number" min="0" placeholder="150000" value={form.amount} hasError={!!errors.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
          </Field>
          <Field label="Date" required error={errors.date}>
            <Input type="date" value={form.date} max={new Date().toISOString().slice(0, 10)} hasError={!!errors.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
          </Field>
        </div>
      </form>
    </Modal>
  )
}