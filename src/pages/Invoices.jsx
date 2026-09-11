import React, { useMemo, useState } from 'react'
import { useApp, nextInvoiceNumber } from '../store/AppContext.jsx'
import { formatCurrency, formatDate, formatNumber, uid } from '../utils/format.js'
import { Icon, Logo } from '../components/ui/Icon.jsx'
import { Button, Field, Input, Select, StatusBadge, Avatar, Badge, Pagination, Menu } from '../components/ui/kit.jsx'
import { Modal } from '../components/ui/Overlay.jsx'
import { ResponsiveTable } from '../components/ui/Table.jsx'
import { StatCard, PageHead } from '../components/layout/StatCard.jsx'

const PAGE_SIZE = 8
const EMPTY_ITEM = () => ({ key: uid('li'), productId: '', quantity: 1 })

export function InvoicesPage() {
  const { data, saveInvoice, deleteInvoice, showToast, confirmDialog } = useApp()
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [preview, setPreview] = useState(null)
  const [menuFor, setMenuFor] = useState(null)

  const customerName = (id) => data.customers.find((c) => c.id === id)?.name || 'Walk-in customer'

  const filtered = useMemo(() => {
    let list = [...data.invoices]
    const query = q.trim().toLowerCase()
    if (query) list = list.filter((i) => [i.number, customerName(i.customerId)].join(' ').toLowerCase().includes(query))
    if (statusFilter !== 'all') list = list.filter((i) => i.status === statusFilter)
    list.sort((a, b) => (a.date < b.date ? 1 : -1))
    return list
  }, [data.invoices, q, statusFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  const stats = useMemo(() => {
    const outstanding = data.invoices.filter((i) => i.status === 'pending' || i.status === 'overdue').reduce((s, i) => s + i.total, 0)
    const overdue = data.invoices.filter((i) => i.status === 'overdue').reduce((s, i) => s + i.total, 0)
    const thisMonth = new Date().getMonth()
    const paidMonth = data.invoices
      .filter((i) => i.status === 'paid' && new Date(i.paidAt || i.date).getMonth() === thisMonth)
      .reduce((s, i) => s + i.total, 0)
    return { outstanding, overdue, paidMonth }
  }, [data.invoices])

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pages)
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const markStatus = (inv, next) => {
    saveInvoice({ ...inv, status: next, paidAt: next === 'paid' ? new Date().toISOString() : inv.paidAt })
    showToast('ok', `Invoice marked as ${next}`, `${inv.number} is now ${next}.`)
  }

  const handleDelete = async (inv) => {
    const ok = await confirmDialog({
      title: 'Delete this invoice?',
      message: `Invoice ${inv.number} for ${formatCurrency(inv.total)} will be permanently removed.`,
      confirmLabel: 'Delete invoice',
      danger: true
    })
    if (ok) {
      deleteInvoice(inv.id)
      if (preview?.id === inv.id) setPreview(null)
      showToast('ok', 'Invoice deleted', `${inv.number} was removed.`)
    }
  }

  const columns = [
    { key: 'number', label: 'Invoice', render: (i) => (
      <span>
        <b className="mono" style={{ fontSize: 13 }}>{i.number}</b>
        <span className="faint text-xs" style={{ display: 'block' }}>Issued {formatDate(i.date)}</span>
      </span>
    ) },
    { key: 'customer', label: 'Customer', render: (i) => (
      <span className="cust-cell">
        <Avatar name={customerName(i.customerId)} size="sm" />
        <span className="cell-main" style={{ display: 'block' }}>{customerName(i.customerId)}</span>
      </span>
    ) },
    { key: 'due', label: 'Due date', render: (i) => (
      <span className={i.status === 'overdue' ? 'danger' : 'muted'} style={{ color: i.status === 'overdue' ? 'var(--danger-text)' : undefined, whiteSpace: 'nowrap' }}>
        {formatDate(i.dueDate)}
      </span>
    ) },
    { key: 'total', label: 'Amount', align: 'right', render: (i) => <b className="tabular">{formatCurrency(i.total)}</b> },
    { key: 'status', label: 'Status', render: (i) => <StatusBadge status={i.status} /> },
    {
      key: 'actions', label: '', align: 'right', hideMobile: true, render: (i) => (
        <span className="cell-actions" onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
          <Button variant="ghost" size="sm" icon="eye" aria-label={`Preview ${i.number}`} onClick={() => setPreview(i)} />
          <Button variant="ghost" size="sm" aria-label={`Actions for ${i.number}`} onClick={() => setMenuFor(menuFor === i.id ? null : i.id)}>
            <Icon name="more" size={16} />
          </Button>
          {menuFor === i.id && (
            <Menu
              onClose={() => setMenuFor(null)}
              style={{ top: 32, right: 24 }}
              items={[
                { label: 'Preview invoice', icon: 'eye', onClick: () => setPreview(i) },
                'sep',
                { label: 'Mark as paid', icon: 'check-circle', onClick: () => markStatus(i, 'paid') },
                { label: 'Mark as overdue', icon: 'clock', onClick: () => markStatus(i, 'overdue') },
                'sep',
                { label: 'Delete invoice', icon: 'trash', danger: true, onClick: () => handleDelete(i) }
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
        title="Invoices"
        subtitle="Create professional invoices, track payments and send print-ready statements."
        actions={<Button variant="primary" icon="plus" onClick={() => setCreateOpen(true)}>Create invoice</Button>}
      />

      <div className="stat-grid">
        <StatCard label="Outstanding" value={formatCurrency(stats.outstanding)} icon="invoices" tone="warn" compare="Pending + overdue" />
        <StatCard label="Overdue" value={formatCurrency(stats.overdue)} icon="alert" tone="danger" compare="Past due date" />
        <StatCard label="Paid this month" value={formatCurrency(stats.paidMonth)} icon="check-circle" tone="ok" compare="Collected in current month" />
        <StatCard label="Total invoices" value={formatNumber(data.invoices.length)} icon="file-text" tone="primary" compare="Across all statuses" />
      </div>

      <div className="toolbar row wrap" role="search">
        <span className="input-wrap">
          <Icon name="search" size={15} />
          <Input placeholder="Search by number or customer…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} aria-label="Search invoices" />
        </span>
        <Field label={null} style={{ width: 160 }}>
          <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }} aria-label="Filter by status">
            <option value="all">All statuses</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
            <option value="draft">Draft</option>
          </Select>
        </Field>
      </div>

      <ResponsiveTable
        columns={columns}
        rows={pageRows.map((r, i) => ({ ...r, __key: r.id || i }))}
        onRowClick={(i) => setPreview(i)}
        emptyIcon="invoices"
        emptyTitle={q || statusFilter !== 'all' ? 'No invoices match your filters' : 'No invoices yet'}
        emptyDesc="Create your first invoice and turn it into a clean, printable statement."
        emptyAction={<Button variant="primary" size="sm" icon="plus" onClick={() => setCreateOpen(true)}>Create invoice</Button>}
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

      <CreateInvoiceModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        data={data}
        onSave={(inv) => {
          saveInvoice(inv)
          setCreateOpen(false)
          showToast('ok', 'Invoice created', `${inv.number} was created${inv.status === 'pending' ? ' and is now payable' : ''}.`)
          setPreview(inv)
        }}
      />

      <InvoicePreviewModal
        invoice={preview}
        onClose={() => setPreview(null)}
        data={data}
        onSetStatus={(next) => { markStatus(preview, next); setPreview((p) => ({ ...p, status: next })) }}
        onDelete={() => handleDelete(preview)}
        onPrint={() => window.print()}
      />
    </>
  )
}

function CreateInvoiceModal({ open, onClose, data, onSave }) {
  const [customerId, setCustomerId] = useState('')
  const [items, setItems] = useState([EMPTY_ITEM()])
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState(() => new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10))
  const [status, setStatus] = useState('pending')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState({})

  React.useEffect(() => {
    if (open) {
      setCustomerId('')
      setItems([EMPTY_ITEM()])
      setStatus('pending')
      setNotes('')
      setErrors({})
    }
  }, [open])

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, it) => {
      const p = data.products.find((x) => x.id === it.productId)
      return s + (p ? p.price * (Number(it.quantity) || 0) : 0)
    }, 0)
    const tax = Math.round((subtotal * (data.business?.taxRate || 18)) / 100)
    return { subtotal, tax, total: subtotal + tax }
  }, [items, data])

  const submit = () => {
    const errs = {}
    if (!customerId) errs.customer = 'Select a customer'
    if (items.length === 0 || items.some((it) => !it.productId)) errs.items = 'Add at least one item'
    if (!issueDate) errs.date = 'Issue date is required'
    setErrors(errs)
    if (Object.keys(errs).length) return

    const lineItems = items.map((it) => {
      const p = data.products.find((x) => x.id === it.productId)
      return { productId: p.id, name: p.name, quantity: Number(it.quantity), unitPrice: p.price }
    })
    const number = nextInvoiceNumber(data.invoices)
    onSave({
      id: uid('inv'),
      number,
      customerId,
      date: new Date(`${issueDate}T10:00:00`).toISOString(),
      dueDate: new Date(`${dueDate}T10:00:00`).toISOString(),
      items: lineItems,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
      status,
      paidAt: status === 'paid' ? new Date().toISOString() : null,
      notes
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create invoice"
      subtitle="Build a professional invoice in seconds."
      size="lg"
      footer={
        <>
          <span className="grow" />
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon="save" onClick={submit}>Create invoice</Button>
        </>
      }
    >
      <div className="grid grid-2" style={{ gap: 14 }}>
        <Field label="Customer" required error={errors.customer}>
          <Select value={customerId} hasError={!!errors.customer} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Select a customer…</option>
            {data.customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <div className="grid grid-2" style={{ gap: 14 }}>
          <Field label="Issue date" required error={errors.date}>
            <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </Field>
          <Field label="Due date" required>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
          <span className="field-label">
            Line items {errors.items && <span style={{ color: 'var(--danger-text)' }}>— {errors.items}</span>}
          </span>
          <Button variant="secondary" size="sm" icon="plus" onClick={() => setItems((l) => [...l, EMPTY_ITEM()])}>Add item</Button>
        </div>
        <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 12, background: 'var(--surface-2)' }}>
          {items.map((it, i) => {
            const p = data.products.find((x) => x.id === it.productId)
            return (
              <div key={it.key} className="line-item-row">
                <Field label={i === 0 ? 'Product / service' : null}>
                  <Select value={it.productId} onChange={(e) => setItems((l) => l.map((x) => (x.key === it.key ? { ...x, productId: e.target.value } : x)))}>
                    <option value="">Select…</option>
                    {data.products.map((prod) => (
                      <option key={prod.id} value={prod.id}>{prod.name}</option>
                    ))}
                  </Select>
                </Field>
                <Field label={i === 0 ? 'Qty' : null}>
                  <Input type="number" min="1" value={it.quantity} onChange={(e) => setItems((l) => l.map((x) => (x.key === it.key ? { ...x, quantity: e.target.value } : x)))} />
                </Field>
                <div className="li-total">{formatCurrency(p ? p.price * (Number(it.quantity) || 0) : 0)}</div>
                <button type="button" className="btn-icon btn-sm" style={{ marginTop: i === 0 ? 20 : 0 }} aria-label="Remove item" onClick={() => setItems((l) => (l.length > 1 ? l.filter((x) => x.key !== it.key) : l))}>
                  <Icon name="trash" size={15} />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-2" style={{ gap: 14, marginTop: 14 }}>
        <Field label="Invoice status">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="pending">Pending</option>
            <option value="draft">Draft</option>
            <option value="paid">Paid</option>
          </Select>
        </Field>
        <div style={{ textAlign: 'right', alignSelf: 'flex-end', paddingBottom: 2 }}>
          <div className="faint text-xs">Subtotal <b className="tabular">{formatCurrency(totals.subtotal)}</b></div>
          <div className="faint text-xs">Tax ({(data.business?.taxRate || 18)}%) <b className="tabular">{formatCurrency(totals.tax)}</b></div>
          <div className="text-md strong" style={{ marginTop: 2 }}>Total {formatCurrency(totals.total)}</div>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <Field label="Notes for the customer">
          <Input placeholder="Payment terms, bank details, thank-you note…" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}

export function InvoiceSheet({ invoice, data, className, showBadge }) {
  const customer = data.customers.find((c) => c.id === invoice.customerId) || { name: 'Walk-in customer', email: '', phone: '', city: '', address: '' }
  const biz = data.business
  const due = new Date(invoice.dueDate).getTime()
  const isOverdue = invoice.status === 'overdue'
  const daysLate = isOverdue ? Math.max(0, Math.round((Date.now() - new Date(invoice.dueDate).getTime()) / 86400000)) : 0

  return (
    <div className={className || 'invoice-sheet'}>
      <div className="invoice-head">
        <div>
          <div className="invoice-brand" style={{ color: '#1a202c' }}>
            <Logo size={38} compact />
            <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05 }}>
              <span className="bn">{biz.name}</span>
              <span className="bs">{biz.tagline}</span>
            </span>
          </div>
          <div style={{ color: '#4a5568', fontSize: 12, marginTop: 8, lineHeight: 1.6 }}>
            {biz.address} · {biz.city}<br />
            {biz.phone} · {biz.email}<br />
            {biz.taxId}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="invoice-title">INVOICE</div>
          <div style={{ marginTop: 6, fontSize: 13 }}>
            <div><b>No:</b> <span style={{ fontFamily: 'var(--font-mono)' }}>{invoice.number}</span></div>
            <div className="row" style={{ justifyContent: 'flex-end', gap: 6, marginTop: 3 }}>
              <b>Status:</b> <StatusBadge status={invoice.status} />
            </div>
            {showBadge && isOverdue && (
              <Badge tone="danger" style={{ marginTop: 6 }}>
                {daysLate} day{daysLate !== 1 ? 's' : ''} overdue
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="invoice-meta">
        <div className="invoice-box">
          <h4>Billed to</h4>
          <div className="nm">{customer.name}</div>
          <div className="ln">
            {customer.email}<br />
            {customer.phone}<br />
            {customer.city}
          </div>
        </div>
        <div className="invoice-box">
          <h4>Invoice details</h4>
          <div className="ln">
            <b>Issue date:</b> {formatDate(invoice.date)}<br />
            <b>Due date:</b> {formatDate(invoice.dueDate)}<br />
            <b>Customer ID:</b> {customer.id?.toUpperCase()}
          </div>
        </div>
      </div>

      <table className="invoice-table">
        <thead>
          <tr>
            <th style={{ width: 44 }}>#</th>
            <th>Description</th>
            <th style={{ textAlign: 'right' }}>Qty</th>
            <th style={{ textAlign: 'right' }}>Unit price</th>
            <th style={{ textAlign: 'right' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((it, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>{it.name}</td>
              <td className="num">{formatNumber(it.quantity)}</td>
              <td className="num">{formatCurrency(it.unitPrice)}</td>
              <td className="num">{formatCurrency(it.quantity * it.unitPrice)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="invoice-total">
        <div className="tr"><span>Subtotal</span><span>{formatCurrency(invoice.subtotal)}</span></div>
        <div className="tr"><span>Tax ({(biz.taxRate || 18)}% VAT)</span><span>{formatCurrency(invoice.tax)}</span></div>
        <div className="tr grand"><span>Total due</span><span>{formatCurrency(invoice.total)}</span></div>
      </div>

      {invoice.notes && (
        <div style={{ marginTop: 18, fontSize: 12.5, color: '#4a5568' }}>
          <b>Notes:</b> {invoice.notes}
        </div>
      )}

      <div className="invoice-foot">
        <span>Payment is due within 14 days of the invoice date.</span>
        <span>Thank you for your business — {biz.name}</span>
      </div>
    </div>
  )
}

function InvoicePreviewModal({ invoice, onClose, data, onSetStatus, onDelete, onPrint }) {
  if (!invoice) return null
  const cust = data.customers.find((c) => c.id === invoice.customerId)
  return (
    <Modal
      open={!!invoice}
      onClose={onClose}
      title={`Invoice ${invoice.number}`}
      subtitle={`Prepared for ${cust?.name || 'Walk-in customer'}`}
      size="lg"
      footer={
        <>
          <div className="grow" style={{ fontSize: 12.5 }}>
            {invoice.status === 'pending' && <Button variant="secondary" size="sm" icon="check-circle" onClick={() => onSetStatus('paid')}>Mark paid</Button>}
            {invoice.status === 'paid' && <Button variant="secondary" size="sm" icon="refresh" onClick={() => onSetStatus('pending')}>Mark unpaid</Button>}
            <Button variant="danger-ghost" size="sm" icon="trash" onClick={onDelete} style={{ marginLeft: 8 }}>Delete</Button>
          </div>
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button variant="primary" icon="print" onClick={onPrint}>Print / PDF</Button>
        </>
      }
    >
      <div className="invoice-modal-body">
        <div className="print-area" style={{ borderRadius: 14, overflow: 'hidden' }}>
          <InvoiceSheet invoice={invoice} data={data} showBadge />
        </div>
      </div>
    </Modal>
  )
}