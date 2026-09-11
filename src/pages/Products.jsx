import React, { useMemo, useState } from 'react'
import { useApp } from '../store/AppContext.jsx'
import { CATEGORIES } from '../data/seed.js'
import { stockStatus, salesByProduct } from '../utils/calc.js'
import { formatCurrency, formatDate, formatNumber, uid } from '../utils/format.js'
import { Icon } from '../components/ui/Icon.jsx'
import { Button, Field, Input, Select, StatusBadge, Badge, Avatar, Pagination, EmptyState } from '../components/ui/kit.jsx'
import { Modal, Drawer } from '../components/ui/Overlay.jsx'
import { ResponsiveTable } from '../components/ui/Table.jsx'
import { PageHead } from '../components/layout/StatCard.jsx'

const PAGE_SIZE = 8
const catIcon = { el: 'zap', cl: 'shrink-2', gr: 'tag', ts: 'cpu' }

function validate(form, products, editingId) {
  const e = {}
  if (!form.name.trim()) e.name = 'Product name is required'
  if (!form.sku.trim()) e.sku = 'SKU is required'
  else if (products.some((p) => p.sku.toLowerCase() === form.sku.trim().toLowerCase() && p.id !== editingId)) {
    e.sku = 'This SKU is already in use'
  }
  if (!form.category) e.category = 'Select a category'
  const price = Number(form.price)
  const cost = Number(form.cost)
  const stock = Number(form.stock)
  const minStock = Number(form.minStock)
  if (!(price > 0)) e.price = 'Enter a valid price'
  if (!(cost >= 0)) e.cost = 'Enter a valid cost'
  if (isNaN(stock) || stock < 0) e.stock = 'Stock cannot be negative'
  if (isNaN(minStock) || minStock < 0) e.minStock = 'Enter a valid minimum'
  return e
}

export function ProductsPage() {
  const { data, saveProduct, deleteProduct, confirmDialog, showToast } = useApp()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [sort, setSort] = useState({ key: 'name', dir: 1 })
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [detail, setDetail] = useState(null)

  const prodStats = useMemo(() => {
    const map = new Map(salesByProduct(data).map((s) => [s.productId, s]))
    return map
  }, [data])

  const filtered = useMemo(() => {
    let list = [...data.products]
    const query = q.trim().toLowerCase()
    if (query) list = list.filter((p) => [p.name, p.sku, CATEGORIES.find((c) => c.key === p.category)?.label].join(' ').toLowerCase().includes(query))
    if (cat !== 'all') list = list.filter((p) => p.category === cat)
    const { key, dir } = sort
    list.sort((a, b) => {
      let va = a[key]
      let vb = b[key]
      if (typeof va === 'string') va = va.toLowerCase()
      if (typeof vb === 'string') vb = vb.toLowerCase()
      if (va < vb) return -1 * dir
      if (va > vb) return 1 * dir
      return 0
    })
    return list
  }, [data.products, q, cat, sort])

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pages)
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const counts = useMemo(() => {
    const c = { all: data.products.length }
    for (const cat of CATEGORIES) c[cat.key] = data.products.filter((p) => p.category === cat.key).length
    return c
  }, [data.products])

  const openNew = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (p) => {
    setEditing(p)
    setFormOpen(true)
  }

  const handleDelete = async (p) => {
    const ok = await confirmDialog({
      title: 'Delete this product?',
      message: `“${p.name}” will be removed from your catalogue. Historical sales keep their records.`,
      confirmLabel: 'Delete product',
      danger: true
    })
    if (ok) {
      deleteProduct(p.id)
      showToast('ok', 'Product deleted', `${p.name} was removed.`)
    }
  }

  const columns = [
    { key: 'name', label: 'Product', sortable: true, render: (p) => (
      <span className="product-cell">
        <span className={`product-ic ${CATEGORIES.find((c) => c.key === p.category)?.color}`}>
          <Icon name={catIcon[p.category] || 'products'} size={17} />
        </span>
        <span className="grow" style={{ minWidth: 0 }}>
          <span className="cell-main truncate" style={{ display: 'block' }}>{p.name}</span>
          <span className="cell-sub">{CATEGORIES.find((c) => c.key === p.category)?.label}</span>
        </span>
      </span>
    ) },
    { key: 'sku', label: 'SKU', sortable: true, render: (p) => <span className="mono faint">{p.sku}</span> },
    { key: 'price', label: 'Price', align: 'right', sortable: true, render: (p) => <b className="tabular">{formatCurrency(p.price)}</b> },
    { key: 'cost', label: 'Cost', align: 'right', sortable: true, render: (p) => <span className="muted tabular">{formatCurrency(p.cost)}</span> },
    { key: 'stock', label: 'Stock', align: 'right', sortable: true, render: (p) => (
      p.service ? <Badge tone="info">Service</Badge> : <span className="strong tabular">{formatNumber(p.stock)}</span>
    ) },
    { key: 'status', label: 'Status', render: (p) => <StatusBadge status={stockStatus(p)} /> },
    { key: 'actions', label: '', align: 'right', hideMobile: true, render: (p) => (
      <span className="cell-actions" onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="sm" icon="edit" aria-label={`Edit ${p.name}`} onClick={() => openEdit(p)} />
        <Button variant="ghost" size="sm" icon="trash" aria-label={`Delete ${p.name}`} onClick={() => handleDelete(p)} />
      </span>
    ) }
  ]

  const salesFor = (id) => prodStats.get(id)

  return (
    <>
      <PageHead
        title="Products"
        subtitle={`${data.products.length} products in your catalogue across ${CATEGORIES.length} categories.`}
        actions={<Button variant="primary" icon="plus" onClick={openNew}>Add product</Button>}
      />

      <div className="toolbar row wrap" role="search">
        <span className="input-wrap">
          <Icon name="search" size={15} />
          <Input placeholder="Search products or SKU…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} aria-label="Search products" />
        </span>
        <div className="row gap-2 wrap">
          <button className={cat === 'all' ? 'chip active' : 'chip'} onClick={() => { setCat('all'); setPage(1) }}>
            All <span className="count">{counts.all}</span>
          </button>
          {CATEGORIES.map((c) => (
            <button key={c.key} className={cat === c.key ? 'chip active' : 'chip'} onClick={() => { setCat(c.key); setPage(1) }}>
              {c.label} <span className="count">{counts[c.key]}</span>
            </button>
          ))}
        </div>
      </div>

      <ResponsiveTable
        className="rt"
        columns={columns}
        rows={pageRows.map((r, i) => ({ ...r, __key: r.id || i }))}
        sort={sort}
        onSort={(key) => setSort((s) => ({ key, dir: s.key === key ? -s.dir : 1 }))}
        onRowClick={(p) => setDetail(p)}
        emptyIcon="products"
        emptyTitle={q || cat !== 'all' ? 'No products match your filters' : 'No products yet'}
        emptyDesc={q || cat !== 'all' ? 'Try adjusting your search or category filter.' : 'Add your first product to start tracking inventory.'}
        emptyAction={<Button variant="primary" size="sm" icon="plus" onClick={openNew}>Add your first product</Button>}
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

      <ProductFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editing={editing}
        onSave={(p) => {
          const isNew = !editing
          saveProduct(p)
          setFormOpen(false)
          showToast('ok', isNew ? 'Product added' : 'Product updated', `${p.name} was ${isNew ? 'added to your catalogue' : 'saved'}.`)
        }}
        data={data}
      />

      <Drawer open={detail != null} onClose={() => setDetail(null)} title="Product details">
        {detail && <ProductDetails product={detail} stats={salesFor(detail.id)} onEdit={() => { setDetail(null); openEdit(detail) }} onDelete={() => { setDetail(null); handleDelete(detail) }} />}
      </Drawer>
    </>
  )
}

function ProductFormModal({ open, onClose, editing, onSave, data }) {
  const empty = {
    name: '',
    sku: '',
    category: 'el',
    price: '',
    cost: '',
    stock: '',
    minStock: '',
    unit: 'piece',
    service: false
  }
  const [form, setForm] = useState(empty)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState(false)

  React.useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          name: editing.name,
          sku: editing.sku,
          category: editing.category,
          price: String(editing.price),
          cost: String(editing.cost),
          stock: String(editing.stock),
          minStock: String(editing.minStock),
          unit: editing.unit || 'piece',
          service: !!editing.service
        })
      } else {
        setForm(empty)
        const used = new Set(data.products.map((p) => p.sku))
        let sku = ''
        for (let i = 1001; i < 9999; i++) {
          const candidate = `NX-${i}`
          if (!used.has(candidate)) {
            sku = candidate
            break
          }
        }
        setForm((f) => ({ ...f, sku }))
      }
      setErrors({})
      setTouched(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing])

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }))
    if (touched) setErrors(validate({ ...form, [k]: v }, data.products, editing?.id))
  }

  const submit = (e) => {
    e.preventDefault()
    setTouched(true)
    const errs = validate(form, data.products, editing?.id)
    setErrors(errs)
    if (Object.keys(errs).length) return
    const payload = {
      id: editing?.id || uid('prd'),
      name: form.name.trim(),
      sku: form.sku.trim().toUpperCase(),
      category: form.category,
      price: Number(form.price),
      cost: Number(form.cost),
      stock: form.service ? 999 : Number(form.stock),
      minStock: Number(form.minStock),
      unit: form.unit,
      service: form.service,
      createdAt: editing?.createdAt || new Date().toISOString()
    }
    onSave(payload)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit product' : 'Add product'}
      subtitle={editing ? `Update ${editing.name} details` : 'Add a new product to your catalogue'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="product-form">{editing ? 'Save changes' : 'Add product'}</Button>
        </>
      }
    >
      <form id="product-form" onSubmit={submit} noValidate>
        <div className="grid grid-2" style={{ gap: 14 }}>
          <Field label="Product name" required error={errors.name} className="row-span-2">
            <Input placeholder="e.g. Samsung Galaxy A15" value={form.name} hasError={!!errors.name} onChange={(e) => set('name', e.target.value)} />
          </Field>
          <Field label="SKU" required error={errors.sku}>
            <Input placeholder="NX-1001" value={form.sku} hasError={!!errors.sku} onChange={(e) => set('sku', e.target.value)} />
          </Field>
          <Field label="Category" required error={errors.category}>
            <Select value={form.category} hasError={!!errors.category} onChange={(e) => set('category', e.target.value)}>
              {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </Select>
          </Field>
          <Field label="Selling price (TZS)" required error={errors.price}>
            <Input type="number" min="0" step="500" placeholder="120000" value={form.price} hasError={!!errors.price} onChange={(e) => set('price', e.target.value)} />
          </Field>
          <Field label="Cost price (TZS)" required error={errors.cost}>
            <Input type="number" min="0" step="500" placeholder="90000" value={form.cost} hasError={!!errors.cost} onChange={(e) => set('cost', e.target.value)} />
          </Field>
          {form.service ? (
            <Field hint="Service products are always marked in stock">
              <label className="checkbox" style={{ marginTop: 14 }}>
                <input type="checkbox" checked={form.service} onChange={(e) => set('service', e.target.checked)} />
                This is a service, not physical stock
              </label>
            </Field>
          ) : (
            <>
              <Field label="Current stock" required error={errors.stock}>
                <Input type="number" min="0" placeholder="50" value={form.stock} hasError={!!errors.stock} onChange={(e) => set('stock', e.target.value)} />
              </Field>
              <Field label="Minimum stock" required error={errors.minStock} hint="You'll get a low-stock warning below this level.">
                <Input type="number" min="0" placeholder="10" value={form.minStock} hasError={!!errors.minStock} onChange={(e) => set('minStock', e.target.value)} />
              </Field>
              <Field label="Unit">
                <Select value={form.unit} onChange={(e) => set('unit', e.target.value)}>
                  {['piece', 'pair', 'bag', 'bottle', 'jar', 'pack', 'box'].map((u) => <option key={u} value={u}>{u}</option>)}
                </Select>
              </Field>
              <Field label="Service product" hint="Turn on for services that are never out of stock.">
                <label className="checkbox" style={{ marginTop: 10 }}>
                  <input type="checkbox" checked={form.service} onChange={(e) => set('service', e.target.checked)} />
                  This is a service, not physical stock
                </label>
              </Field>
            </>
          )}
          {form.price && form.cost > 0 && (
            <Field className="row-span-2" label="Margin preview">
              <div className="card" style={{ boxShadow: 'none', background: 'var(--surface-2)' }}>
                <div className="card-body" style={{ padding: 12 }}>
                  <span className="row gap-2">
                    <Badge tone={(Number(form.price) - Number(form.cost)) > 0 ? 'ok' : 'danger'}>
                      {(Number(form.price) - Number(form.cost)) > 0 ? '+' : ''}{formatCurrency(Number(form.price) - Number(form.cost))} margin
                    </Badge>
                    <span className="faint text-xs">
                      {Number(form.price) > 0 ? `${Math.round(((Number(form.price) - Number(form.cost)) / Number(form.price)) * 100)}% markup` : ''}
                    </span>
                  </span>
                </div>
              </div>
            </Field>
          )}
        </div>
      </form>
    </Modal>
  )
}

function ProductDetails({ product, stats, onEdit, onDelete }) {
  const status = stockStatus(product)
  const margin = product.price - product.cost
  const marginPct = product.price > 0 ? (margin / product.price) * 100 : 0
  const cat = CATEGORIES.find((c) => c.key === product.category)
  const stockPct = product.service ? 100 : product.minStock ? Math.min(100, (product.stock / (product.minStock * 3)) * 100) : 100

  return (
    <div>
      <div style={{ padding: '22px 22px 18px', display: 'flex', gap: 14, alignItems: 'center' }}>
        <span className={`product-ic ${cat?.color}`} style={{ width: 56, height: 56, borderRadius: 16 }}>
          <Icon name={catIcon[product.category] || 'products'} size={24} />
        </span>
        <div>
          <div className="text-lg">{product.name}</div>
          <div className="row gap-2" style={{ marginTop: 3 }}>
            <Badge tone="neutral" className="mono">{product.sku}</Badge>
            <Badge tone="primary">{cat?.label}</Badge>
          </div>
        </div>
      </div>
      <div className="divider" />
      <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div className="grid grid-4" style={{ gap: 8 }}>
          <div className="card" style={{ boxShadow: 'none', background: 'var(--surface-2)', border: 'none' }}>
            <div className="card-body" style={{ padding: 12 }}>
              <div className="faint text-xs">Price</div>
              <div className="text-md strong tabular">{formatCurrency(product.price)}</div>
            </div>
          </div>
          <div className="card" style={{ boxShadow: 'none', background: 'var(--surface-2)', border: 'none' }}>
            <div className="card-body" style={{ padding: 12 }}>
              <div className="faint text-xs">Cost</div>
              <div className="text-md strong tabular">{formatCurrency(product.cost)}</div>
            </div>
          </div>
          <div className="card" style={{ boxShadow: 'none', background: 'var(--surface-2)', border: 'none' }}>
            <div className="card-body" style={{ padding: 12 }}>
              <div className="faint text-xs">Margin</div>
              <div className="text-md strong tabular" style={{ color: margin >= 0 ? 'var(--ok-text)' : 'var(--danger-text)' }}>
                {formatCurrency(margin)}
              </div>
            </div>
          </div>
          <div className="card" style={{ boxShadow: 'none', background: 'var(--surface-2)', border: 'none' }}>
            <div className="card-body" style={{ padding: 12 }}>
              <div className="faint text-xs">Units sold</div>
              <div className="text-md strong tabular">{stats ? formatNumber(stats.units) : '—'}</div>
            </div>
          </div>
        </div>

        {!product.service && (
          <>
            <div>
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                <span className="card-title">Stock level</span>
                <StatusBadge status={status} />
              </div>
              <div className="row gap-3">
                <div className="grow">
                  <div className="progress warn">
                    <div style={{ width: `${stockPct}%` }} />
                  </div>
                </div>
                <b className="tabular">{product.stock}{product.unit ? ` / ${product.unit}s min ${product.minStock}` : ''}</b>
              </div>
            </div>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="row gap-1 faint">Created <b>{formatDate(product.createdAt)}</b></span>
              <span className="strong tabular" style={{ fontSize: 12.5 }}>
                Margin: {Math.round(marginPct)}%
              </span>
            </div>
          </>
        )}

        {stats && (
          <div>
            <div className="card-title" style={{ marginBottom: 8 }}>Sales performance</div>
            <div className="row gap-2" style={{ justifyContent: 'space-between' }}>
              <span className="muted text-sm">Units sold</span>
              <b>{formatNumber(stats.units)}</b>
            </div>
            <div className="row gap-2" style={{ justifyContent: 'space-between', marginTop: 6 }}>
              <span className="muted text-sm">Revenue generated</span>
              <b className="tabular">{formatCurrency(stats.revenue)}</b>
            </div>
            {stats.units > 0 && (
              <div className="row gap-2" style={{ justifyContent: 'space-between', marginTop: 6 }}>
                <span className="muted text-sm">Avg unit price</span>
                <b className="tabular">{formatCurrency(stats.revenue / stats.units)}</b>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="modal-footer">
        <Button variant="danger-ghost" icon="trash" onClick={onDelete}>Delete</Button>
        <Button variant="primary" icon="edit" onClick={onEdit}>Edit product</Button>
      </div>
    </div>
  )
}