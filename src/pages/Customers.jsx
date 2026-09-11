import React, { useMemo, useState } from 'react'
import { useApp } from '../store/AppContext.jsx'
import { customerStats } from '../utils/calc.js'
import { formatCurrency, formatDate, formatNumber, timeAgo, uid } from '../utils/format.js'
import { Icon } from '../components/ui/Icon.jsx'
import { Button, Field, Input, Select, StatusBadge, Avatar, Badge, Pagination } from '../components/ui/kit.jsx'
import { Modal, Drawer } from '../components/ui/Overlay.jsx'
import { ResponsiveTable } from '../components/ui/Table.jsx'
import { StatCard, PageHead } from '../components/layout/StatCard.jsx'

const PAGE_SIZE = 8

export function CustomersPage() {
  const { data, saveCustomer, deleteCustomer, confirmDialog, showToast } = useApp()

  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState({ key: 'name', dir: 1 })
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [detail, setDetail] = useState(null)

  const enriched = useMemo(
    () =>
      data.customers.map((c) => {
        const stats = customerStats(data, c.id)
        return { ...c, ...stats, __stats: stats }
      }),
    [data]
  )

  const totalSpentAll = useMemo(
    () => data.sales.filter((s) => s.status === 'paid').reduce((sum, s) => sum + s.total, 0),
    [data.sales]
  )

  const counts = useMemo(() => {
    const c = { all: data.customers.length }
    for (const st of ['active', 'vip', 'new', 'inactive']) {
      c[st] = data.customers.filter((x) => x.status === st).length
    }
    return c
  }, [data.customers])

  const filtered = useMemo(() => {
    let list = [...enriched]
    const query = q.trim().toLowerCase()
    if (query) {
      list = list.filter((c) => [c.name, c.email, c.phone, c.city].join(' ').toLowerCase().includes(query))
    }
    if (status !== 'all') list = list.filter((c) => c.status === status)
    const { key, dir } = sort
    list.sort((a, b) => {
      const va = typeof a[key] === 'string' ? a[key].toLowerCase() : a[key]
      const vb = typeof b[key] === 'string' ? b[key].toLowerCase() : b[key]
      if (key === 'spent' || key === 'orders') {
        if (va < vb) return 1 * dir
        if (va > vb) return -1 * dir
        return 0
      }
      if (va < vb) return -1 * dir
      if (va > vb) return 1 * dir
      return 0
    })
    return list
  }, [enriched, q, status, sort])

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pages)
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const handleDelete = async (c) => {
    const ok = await confirmDialog({
      title: 'Delete this customer?',
      message: `“${c.name}” will be removed from your customer list. Sales history stays unchanged.`,
      confirmLabel: 'Delete customer',
      danger: true
    })
    if (ok) {
      deleteCustomer(c.id)
      showToast('ok', 'Customer deleted', `${c.name} was removed.`)
    }
  }

  const columns = [
    {
      key: 'name', label: 'Customer', sortable: true, render: (c) => (
        <span className="cust-cell">
          <Avatar name={c.name} size="sm" />
          <span className="grow" style={{ minWidth: 0 }}>
            <span className="cell-main truncate" style={{ display: 'block' }}>
              {c.name} {c.status === 'vip' && <Badge tone="primary" style={{ marginLeft: 4 }}>VIP</Badge>}
            </span>
            <span className="cell-sub">{c.city}</span>
          </span>
        </span>
      )
    },
    { key: 'email', label: 'Email', render: (c) => <span className="muted truncate" style={{ display: 'block', maxWidth: 190 }}>{c.email}</span> },
    { key: 'phone', label: 'Phone', render: (c) => <span className="muted nowrap">{c.phone}</span> },
    { key: 'orders', label: 'Orders', sortable: true, align: 'right', render: (c) => <span className="strong tabular">{formatNumber(c.orders)}</span> },
    { key: 'spent', label: 'Total spent', sortable: true, align: 'right', render: (c) => <b className="tabular">{formatCurrency(c.spent)}</b> },
    { key: 'last', label: 'Last purchase', render: (c) => <span className="muted">{c.lastPurchase ? timeAgo(c.lastPurchase) : '—'}</span> },
    { key: 'status', label: 'Status', render: (c) => <StatusBadge status={c.status} /> },
    {
      key: 'actions', label: '', align: 'right', hideMobile: true, render: (c) => (
        <span className="cell-actions" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" icon="edit" aria-label={`Edit ${c.name}`} onClick={() => { setEditing(c); setFormOpen(true) }} />
          <Button variant="ghost" size="sm" icon="trash" aria-label={`Delete ${c.name}`} onClick={() => handleDelete(c)} />
        </span>
      )
    }
  ]

  return (
    <>
      <PageHead
        title="Customers"
        subtitle={`${data.customers.length} customers · customer lifetime value is tracked automatically.`}
        actions={<Button variant="primary" icon="plus" onClick={() => { setEditing(null); setFormOpen(true) }}>Add customer</Button>}
      />

      <div className="stat-grid">
        <StatCard label="Total customers" value={formatNumber(counts.all)} icon="customers" tone="primary" compare="In your directory" />
        <StatCard label="Active customers" value={formatNumber(counts.active + counts.vip)} icon="check-circle" tone="ok" compare={`${formatNumber(counts.vip)} VIP`} />
        <StatCard label="New customers" value={formatNumber(counts.new)} icon="star" tone="info" compare="Recently joined" />
        <StatCard label="Lifetime revenue" value={formatCurrency(totalSpentAll)} icon="dollar" tone="warn" compare="All paid sales" />
      </div>

      <div className="toolbar row wrap" role="search">
        <span className="input-wrap">
          <Icon name="search" size={15} />
          <Input placeholder="Search customers…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} aria-label="Search customers" />
        </span>
        <Field label={null} style={{ width: 170 }}>
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} aria-label="Filter by status">
            <option value="all">All statuses — {counts.all}</option>
            <option value="active">Active — {counts.active}</option>
            <option value="vip">VIP — {counts.vip}</option>
            <option value="new">New — {counts.new}</option>
            <option value="inactive">Inactive — {counts.inactive}</option>
          </Select>
        </Field>
      </div>

      <ResponsiveTable
        columns={columns}
        rows={pageRows.map((r, i) => ({ ...r, __key: r.id || i }))}
        sort={sort}
        onSort={(key) => setSort((s) => ({ key, dir: s.key === key ? -s.dir : 1 }))}
        onRowClick={(c) => setDetail(c)}
        emptyIcon="customers"
        emptyTitle={q || status !== 'all' ? 'No customers match your filters' : 'No customers yet'}
        emptyDesc="Add your first customer to start building relationships and tracking value."
        emptyAction={<Button variant="primary" size="sm" icon="plus" onClick={() => { setEditing(null); setFormOpen(true) }}>Add customer</Button>}
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

      <CustomerFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editing={editing}
        onSave={(c) => {
          const isNew = !editing
          saveCustomer(c)
          setFormOpen(false)
          showToast('ok', isNew ? 'Customer added' : 'Customer updated', `${c.name} was ${isNew ? 'added to your directory' : 'saved'}.`)
        }}
      />

      <Drawer open={detail != null} onClose={() => setDetail(null)} title="Customer profile">
        {detail && (
          <CustomerDetails
            customer={detail}
            purchases={data.sales
              .filter((s) => s.customerId === detail.id && s.status !== 'cancelled')
              .sort((a, b) => (a.date < b.date ? 1 : -1))
              .slice(0, 6)}
            onEdit={() => { setDetail(null); setEditing(detail); setFormOpen(true) }}
            onDelete={() => { setDetail(null); handleDelete(detail) }}
          />
        )}
      </Drawer>
    </>
  )
}

function CustomerFormModal({ open, onClose, editing, onSave }) {
  const empty = { name: '', email: '', phone: '', city: '', status: 'active' }
  const [form, setForm] = useState(empty)
  const [errors, setErrors] = useState({})

  React.useEffect(() => {
    if (open) {
      if (editing) setForm({ name: editing.name, email: editing.email, phone: editing.phone || '', city: editing.city || '', status: editing.status })
      else setForm(empty)
      setErrors({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing])

  const submit = (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.name.trim()) errs.name = 'Name is required'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email'
    if (!form.phone.trim()) errs.phone = 'Phone is required'
    setErrors(errs)
    if (Object.keys(errs).length) return
    onSave({
      id: editing?.id || uid('cus'),
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      city: form.city.trim() || 'Dar es Salaam',
      status: form.status,
      joinedAt: editing?.joinedAt || new Date().toISOString()
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit customer' : 'Add customer'}
      subtitle={editing ? `Update ${editing.name}'s details` : 'Create a customer profile'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="customer-form">{editing ? 'Save changes' : 'Add customer'}</Button>
        </>
      }
    >
      <form id="customer-form" onSubmit={submit} noValidate>
        <div className="grid grid-2" style={{ gap: 14 }}>
          <Field label="Full name" required error={errors.name}>
            <Input placeholder="e.g. Neema Moshi" value={form.name} hasError={!!errors.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </Field>
          <Field label="Email" required error={errors.email}>
            <Input type="email" placeholder="name@example.co.tz" value={form.email} hasError={!!errors.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </Field>
          <Field label="Phone" required error={errors.phone}>
            <Input type="tel" placeholder="+255 7xx xxx xxx" value={form.phone} hasError={!!errors.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </Field>
          <Field label="City">
            <Select value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}>
              {['Dar es Salaam', 'Arusha', 'Dodoma', 'Mwanza', 'Zanzibar', 'Mbeya', 'Moshi', 'Morogoro', 'Tanga'].map(
                (city) => <option key={city} value={city}>{city}</option>
              )}
            </Select>
          </Field>
          <Field label="Customer status" hint="VIP customers get highlighted across the app.">
            <Select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              <option value="active">Active</option>
              <option value="vip">VIP</option>
              <option value="new">New</option>
              <option value="inactive">Inactive</option>
            </Select>
          </Field>
        </div>
      </form>
    </Modal>
  )
}

function CustomerDetails({ customer, purchases, onEdit, onDelete }) {
  const st = customer.__stats
  return (
    <div>
      <div style={{ padding: '22px 22px 16px', textAlign: 'center' }}>
        <Avatar name={customer.name} size="lg" />
        <div className="text-lg" style={{ marginTop: 12 }}>{customer.name}</div>
        <div className="row" style={{ justifyContent: 'center', gap: 6, marginTop: 4 }}>
          <StatusBadge status={customer.status} />
          <span className="faint text-xs">since {formatDate(customer.joinedAt)}</span>
        </div>
        <div className="row" style={{ justifyContent: 'center', gap: 8, marginTop: 10, fontSize: 13, color: 'var(--text-2)' }}>
          <span className="row gap-1"><Icon name="mail" size={14} /> {customer.email}</span>
        </div>
        <div className="row" style={{ justifyContent: 'center', gap: 8, marginTop: 5, fontSize: 13, color: 'var(--text-2)' }}>
          <span className="row gap-1"><Icon name="phone" size={14} /> {customer.phone}</span>
          <span className="row gap-1"><Icon name="globe" size={14} /> {customer.city}</span>
        </div>
      </div>
      <div className="divider" />
      <div style={{ padding: '16px 22px' }}>
        <div className="grid grid-2" style={{ gap: 8 }}>
          <div className="card" style={{ boxShadow: 'none', background: 'var(--surface-2)', border: 'none' }}>
            <div className="card-body" style={{ padding: 12 }}>
              <div className="faint text-xs">Orders</div>
              <div className="text-md strong tabular">{formatNumber(st?.orders || 0)}</div>
            </div>
          </div>
          <div className="card" style={{ boxShadow: 'none', background: 'var(--surface-2)', border: 'none' }}>
            <div className="card-body" style={{ padding: 12 }}>
              <div className="faint text-xs">Total spent</div>
              <div className="text-md strong tabular">{formatCurrency(st?.spent || 0)}</div>
            </div>
          </div>
          <div className="card" style={{ boxShadow: 'none', background: 'var(--surface-2)', border: 'none' }}>
            <div className="card-body" style={{ padding: 12 }}>
              <div className="faint text-xs">Avg order value</div>
              <div className="text-md strong tabular">{formatCurrency(st?.avgOrder || 0)}</div>
            </div>
          </div>
          <div className="card" style={{ boxShadow: 'none', background: 'var(--surface-2)', border: 'none' }}>
            <div className="card-body" style={{ padding: 12 }}>
              <div className="faint text-xs">Outstanding</div>
              <div className="text-md strong tabular">{formatCurrency(st?.outstanding || 0)}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '6px 22px 8px' }}>
        <div className="card-title" style={{ marginBottom: 10 }}>Recent purchases</div>
        {purchases.length === 0 ? (
          <div className="muted" style={{ fontSize: 13, padding: '10px 0 16px' }}>{customer.name} has no purchases yet.</div>
        ) : (
          purchases.map((s) => (
            <div key={s.id} className="row gap-3" style={{ padding: '11px 0', borderBottom: '1px solid var(--border)' }}>
              <span className="product-ic" style={{ background: 'var(--surface-3)', color: 'var(--text-2)' }}>
                <Icon name="sales" size={16} />
              </span>
              <span className="grow">
                <b style={{ fontSize: 13 }}>{s.number}</b>
                <span className="faint text-xs" style={{ display: 'block' }}>{formatDate(s.date, { time: true })} · {s.items.length} item(s)</span>
              </span>
              <b className="tabular">{formatCurrency(s.total)}</b>
              <StatusBadge status={s.status} />
            </div>
          ))
        )}
      </div>

      <div className="modal-footer">
        <Button variant="danger-ghost" icon="trash" onClick={onDelete}>Delete</Button>
        <Button variant="primary" icon="edit" onClick={onEdit}>Edit customer</Button>
      </div>
    </div>
  )
}