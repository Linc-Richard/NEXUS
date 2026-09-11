import React, { useMemo, useState } from 'react'
import { useApp } from '../store/AppContext.jsx'
import { CATEGORIES } from '../data/seed.js'
import { inventorySummary, stockStatus } from '../utils/calc.js'
import { formatCurrency, formatDate, formatNumber } from '../utils/format.js'
import { Icon } from '../components/ui/Icon.jsx'
import { Button, Field, Input, Select, StatusBadge, Badge, Pagination } from '../components/ui/kit.jsx'
import { Modal } from '../components/ui/Overlay.jsx'
import { ResponsiveTable } from '../components/ui/Table.jsx'
import { StatCard, PageHead } from '../components/layout/StatCard.jsx'

const PAGE_SIZE = 8
const catIcon = { el: 'zap', cl: 'shrink-2', gr: 'tag', ts: 'cpu' }

export function InventoryPage() {
  const { data, saveProduct, showToast } = useApp()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [restock, setRestock] = useState(null)

  const summary = useMemo(() => inventorySummary(data.products), [data.products])

  const lastMovement = useMemo(() => {
    const map = new Map()
    for (const s of data.sales) {
      for (const it of s.items) {
        const prev = map.get(it.productId)
        if (!prev || s.date > prev) map.set(it.productId, s.date)
      }
    }
    return map
  }, [data.sales])

  const filtered = useMemo(() => {
    let list = [...data.products]
    const query = q.trim().toLowerCase()
    if (query) list = list.filter((p) => [p.name, p.sku, CATEGORIES.find((c) => c.key === p.category)?.label].join(' ').toLowerCase().includes(query))
    if (cat !== 'all') list = list.filter((p) => p.category === cat)
    if (status !== 'all') list = list.filter((p) => stockStatus(p) === status)
    return list
  }, [data.products, q, cat, status])

  const alerts = useMemo(
    () => data.products.filter((p) => !p.service && stockStatus(p) !== 'in').sort((a, b) => (a.stock > 0 ? 0 : -1) - (b.stock > 0 ? 0 : -1) || a.stock - b.stock),
    [data.products]
  )

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pages)
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const openRestock = (p) => setRestock(p)

  const columns = [
    { key: 'name', label: 'Product', render: (p) => (
      <span className="product-cell">
        <span className={`product-ic ${CATEGORIES.find((c) => c.key === p.category)?.color}`}>
          <Icon name={catIcon[p.category] || 'products'} size={17} />
        </span>
        <span className="grow" style={{ minWidth: 0 }}>
          <span className="cell-main truncate" style={{ display: 'block' }}>{p.name}</span>
          {p.service && <span className="cell-sub">Service — unlimited stock</span>}
        </span>
      </span>
    ) },
    { key: 'sku', label: 'SKU', render: (p) => <span className="mono faint">{p.sku}</span> },
    { key: 'category', label: 'Category', render: (p) => <span className="muted">{CATEGORIES.find((c) => c.key === p.category)?.label}</span> },
    { key: 'stock', label: 'Stock', align: 'right', render: (p) => p.service ? <Badge tone="info">Unlimited</Badge> : <b className="tabular">{formatNumber(p.stock)}</b> },
    { key: 'minStock', label: 'Min', align: 'right', render: (p) => p.service ? <span className="faint">—</span> : <span className="muted tabular">{formatNumber(p.minStock)}</span> },
    { key: 'status', label: 'Status', render: (p) => <StatusBadge status={stockStatus(p)} /> },
    {
      key: 'updated', label: 'Last updated', render: (p) => {
        const soldAt = lastMovement.get(p.id)
        return <span className="muted">{soldAt ? formatDate(soldAt) : formatDate(p.createdAt)}</span>
      }
    },
    {
      key: 'actions', label: '', align: 'right', hideMobile: true, render: (p) => (
        <span className="cell-actions" onClick={(e) => e.stopPropagation()}>
          {!p.service && <Button variant="ghost" size="sm" icon="plus" onClick={() => openRestock(p)}>Restock</Button>}
        </span>
      )
    }
  ]

  return (
    <>
      <PageHead
        title="Inventory"
        subtitle="Monitor stock levels and keep your best sellers available."
        actions={
          <span className="summary-chip">
            Stock value <b>{formatCurrency(summary.stockValue)}</b>
          </span>
        }
      />

      <div className="stat-grid">
        <StatCard label="Total products" value={formatNumber(summary.total)} icon="products" tone="primary" compare="Across all categories" />
        <StatCard label="In stock" value={formatNumber(summary.in)} icon="check-circle" tone="ok" compare="Healthy stock levels" />
        <StatCard label="Low stock" value={formatNumber(summary.low)} icon="alert" tone="warn" compare="Needs replenishment" />
        <StatCard label="Out of stock" value={formatNumber(summary.out)} icon="trash" tone="danger" compare="Restock immediately" />
      </div>

      {alerts.length > 0 && (
        <section className="card" style={{ marginTop: 18, borderColor: 'rgba(217, 119, 6, 0.4)' }}>
          <div className="card-header">
            <div>
              <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="badge badge-warn"><span className="dot" /> {alerts.length} attention needed</span>
                Low-stock warnings
              </h2>
              <p className="card-subtitle">These products are running low or out of stock.</p>
            </div>
          </div>
          <div className="card-body" style={{ paddingTop: 8 }}>
            <div className="grid grid-2" style={{ gap: 10 }}>
              {alerts.map((p) => {
                const st = stockStatus(p)
                const need = Math.max(0, p.minStock * 2 - p.stock)
                return (
                  <div key={p.id} className="row gap-3" style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <span className={`product-ic ${CATEGORIES.find((c) => c.key === p.category)?.color}`}>
                      <Icon name={catIcon[p.category] || 'products'} size={16} />
                    </span>
                    <span className="grow" style={{ minWidth: 0 }}>
                      <span className="truncate" style={{ display: 'block', fontWeight: 600, fontSize: 13 }}>{p.name}</span>
                      <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                        {st === 'out' ? 'Out of stock' : `${formatNumber(p.stock)} left — min ${formatNumber(p.minStock)}`}
                        {need > 0 && ` · suggest ${formatNumber(need)}+`}
                      </span>
                    </span>
                    <StatusBadge status={st} />
                    <Button size="sm" icon="plus" onClick={() => openRestock(p)}>Restock</Button>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      <div className="toolbar row wrap" role="search" style={{ marginTop: 18 }}>
        <span className="input-wrap">
          <Icon name="search" size={15} />
          <Input placeholder="Search inventory…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} aria-label="Search inventory" />
        </span>
        <Field label={null} style={{ minWidth: 170, width: 170 }}>
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} aria-label="Filter by status">
            <option value="all">All statuses</option>
            <option value="in">In stock</option>
            <option value="low">Low stock</option>
            <option value="out">Out of stock</option>
          </Select>
        </Field>
        <Field label={null} style={{ minWidth: 180, width: 180 }}>
          <Select value={cat} onChange={(e) => { setCat(e.target.value); setPage(1) }} aria-label="Filter by category">
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </Select>
        </Field>
      </div>

      <ResponsiveTable
        columns={columns}
        rows={pageRows.map((r, i) => ({ ...r, __key: r.id || i }))}
        emptyIcon="inventory"
        emptyTitle={q || status !== 'all' || cat !== 'all' ? 'No products match your filters' : 'No inventory yet'}
        emptyDesc="Try adjusting your filters, or add products to begin tracking stock."
        emptyAction={<Button variant="primary" size="sm" icon="plus" onClick={() => (window.location.hash = '#/products')}>Go to products</Button>}
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

      <RestockModal product={restock} onClose={() => setRestock(null)} onSave={(qty) => {
        if (restock) {
          saveProduct({ ...restock, stock: qty, updatedAt: new Date().toISOString() })
          showToast('ok', 'Stock updated', `${restock.name} is now at ${formatNumber(qty)} units.`)
        }
        setRestock(null)
      }} />
    </>
  )
}

function RestockModal({ product, onClose, onSave }) {
  const [qty, setQty] = useState('')
  const [error, setError] = useState(null)
  React.useEffect(() => {
    if (product) {
      setQty(String(product.stock))
      setError(null)
    }
  }, [product])

  if (!product) return null
  const q = Number(qty)
  const st = stockStatus(product)

  return (
    <Modal
      open={!!product}
      onClose={onClose}
      title="Update stock"
      subtitle={product.name}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => {
            if (Number.isNaN(q) || q < 0) {
              setError('Enter a valid stock quantity')
              return
            }
            onSave(q)
          }}>Save stock level</Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="row gap-3" style={{ justifyContent: 'space-between' }}>
          <div>
            <div className="faint text-xs">Current level</div>
            <b className="strong tabular">{formatNumber(product.stock)} {product.unit}s</b>
          </div>
          <div>
            <div className="faint text-xs">Minimum</div>
            <b className="strong tabular">{formatNumber(product.minStock)} {product.unit}s</b>
          </div>
          <StatusBadge status={st} />
        </div>
        <Field label="New stock quantity" required error={error}>
          <Input
            type="number"
            min="0"
            autoFocus
            value={qty}
            hasError={!!error}
            onChange={(e) => setQty(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !error && onSave(q)}
          />
        </Field>
        {!Number.isNaN(q) && q > product.stock && (
          <span className="row gap-2" style={{ fontSize: 12.5, color: 'var(--ok-text)' }}>
            <Icon name="check-circle" size={14} />
            Recording an increase of {formatNumber(q - product.stock)} {product.unit}s.
          </span>
        )}
      </div>
    </Modal>
  )
}