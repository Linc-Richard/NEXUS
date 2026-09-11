import React from 'react'
import { cls } from '../../utils/format.js'
import { Icon } from './Icon.jsx'

/* ---------- Button ---------- */
export function Button({ variant = 'secondary', size, className, children, icon, ...rest }) {
  return (
    <button
      className={cls('btn', `btn-${variant}`, size && `btn-${size}`, className)}
      {...rest}
    >
      {icon && typeof icon === 'string' ? <Icon name={icon} size={16} /> : icon}
      {children}
    </button>
  )
}

export function IconButton({ name, size = 17, className, label, ...rest }) {
  return (
    <button className={cls('btn-icon', className)} aria-label={label} title={label} {...rest}>
      <Icon name={name} size={size} />
    </button>
  )
}

/* ---------- Inputs ---------- */
export function Field({ label, required, hint, error, children, className }) {
  return (
    <div className={cls('field', className)}>
      {label && (
        <label className="field-label">
          {label}
          {required && <span className="req">*</span>}
        </label>
      )}
      {children}
      {error && (
        <span className="field-error">
          <Icon name="alert" size={12} />
          {error}
        </span>
      )}
      {!error && hint && <span className="field-hint">{hint}</span>}
    </div>
  )
}

export function Input({ className, hasError, ...rest }) {
  return <input className={cls('input', hasError && 'has-error', className)} {...rest} />
}

export function Select({ className, hasError, children, ...rest }) {
  return (
    <select className={cls('select', hasError && 'has-error', className)} {...rest}>
      {children}
    </select>
  )
}

export function Textarea({ className, hasError, ...rest }) {
  return <textarea className={cls('textarea', hasError && 'has-error', className)} {...rest} />
}

export function Switch({ checked, onChange, label, id }) {
  return (
    <span className="switch">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="track" />
      <span className="thumb" />
      <span className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
        {label}
      </span>
    </span>
  )
}

/* ---------- Badges ---------- */
export function Badge({ tone = 'neutral', dot = false, children, className }) {
  return (
    <span className={cls('badge', `badge-${tone}`, className)}>
      {dot && <span className="dot" />}
      {children}
    </span>
  )
}

export function StatusBadge({ status }) {
  const map = {
    paid: { tone: 'ok', label: 'Paid' },
    active: { tone: 'ok', label: 'Active' },
    vip: { tone: 'primary', label: 'VIP' },
    completed: { tone: 'ok', label: 'Completed' },
    pending: { tone: 'warn', label: 'Pending' },
    overdue: { tone: 'danger', label: 'Overdue' },
    cancelled: { tone: 'danger', label: 'Cancelled' },
    draft: { tone: 'neutral', label: 'Draft' },
    new: { tone: 'info', label: 'New' },
    inactive: { tone: 'neutral', label: 'Inactive' },
    in: { tone: 'ok', label: 'In stock' },
    low: { tone: 'warn', label: 'Low stock' },
    out: { tone: 'danger', label: 'Out of stock' }
  }
  const s = map[status] || { tone: 'neutral', label: status }
  return <span className={cls('status-badge', `badge-${s.tone}`)}>{s.label}</span>
}

/* ---------- Empty state ---------- */
export function EmptyState({ icon = 'inbox', title, description, action, className }) {
  return (
    <div className={cls('empty-state', className)}>
      <div className="empty-ic">
        <Icon name={icon} size={26} />
      </div>
      <div className="empty-title">{title}</div>
      {description && <div className="empty-desc">{description}</div>}
      {action && <div className="empty-actions">{action}</div>}
    </div>
  )
}

/* ---------- Spinner / skeleton ---------- */
export function Spinner({ size = 16, className }) {
  return <span className={cls('spinner', className)} style={{ width: size, height: size }} aria-hidden="true" />
}

export function Skeleton({ width, height, style, className }) {
  return <div className={cls('skeleton', className)} style={{ width, height, ...style }} />
}

/* ---------- Avatar ---------- */
const AVATAR_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#e11d48', '#8b5cf6', '#2563eb', '#14b8a6']
function hashHue(name = '') {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 997
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}
export function Avatar({ name, size = 'md', className }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')
  return (
    <span
      className={cls('avatar', `avatar-${size}`, className)}
      style={{ background: hashHue(name) }}
      aria-hidden="true"
    >
      {initials}
    </span>
  )
}

/* ---------- Segmented ---------- */
export function Segmented({ options, value, onChange, className }) {
  return (
    <div className={cls('segmented', className)} role="tablist">
      {options.map((opt) => {
        const v = typeof opt === 'string' ? opt : opt.value
        const label = typeof opt === 'string' ? opt : opt.label
        return (
          <button
            key={v}
            role="tab"
            aria-selected={value === v}
            className={cls(value === v && 'active')}
            onClick={() => onChange(v)}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

/* ---------- Pagination ---------- */
export function Pagination({ page, pages, onChange, total, from, to }) {
  const shown = []
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - page) <= 1) shown.push(p)
    else if (shown[shown.length - 1] !== '…') shown.push('…')
  }
  return (
    <div className="pagination">
      <span className="page-info">
        Showing <b>{from}–{to}</b> of <b>{total}</b>
      </span>
      <nav className="pages" aria-label="Pagination">
        <button className="page-btn" aria-label="Previous page" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <Icon name="chevron-left" size={15} />
        </button>
        {shown.map((p, i) =>
          p === '…' ? (
            <span key={`e${i}`} className="page-btn" style={{ border: 0, background: 'transparent' }}>
              …
            </span>
          ) : (
            <button
              key={p}
              className={cls('page-btn', p === page && 'active')}
              aria-current={p === page ? 'page' : undefined}
              onClick={() => onChange(p)}
            >
              {p}
            </button>
          )
        )}
        <button className="page-btn" aria-label="Next page" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          <Icon name="chevron-right" size={15} />
        </button>
      </nav>
    </div>
  )
}

/* ---------- Dropdown menu ---------- */
export function Menu({ items, onClose, style }) {
  return (
    <div className="menu" style={style} role="menu" aria-label="Dropdown menu">
      {items.map((it, i) =>
        it === 'sep' ? (
          <div key={i} className="menu-sep" />
        ) : (
          <button
            key={i}
            className={cls('menu-item', 'danger' in it && it.danger && 'danger')}
            role="menuitem"
            onClick={() => {
              onClose()
              it.onClick && it.onClick()
            }}
          >
            {it.icon && <Icon name={it.icon} size={16} />}
            {it.label}
          </button>
        )
      )}
    </div>
  )
}