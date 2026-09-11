import React, { useMemo, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useApp } from '../../store/AppContext.jsx'
import { notificationDigest, inventorySummary } from '../../utils/calc.js'
import { cls, initials, downloadJSON } from '../../utils/format.js'
import { Icon, Logo } from '../ui/Icon.jsx'
import { Button, IconButton, Avatar, Menu } from '../ui/kit.jsx'
import { Modal } from '../ui/Overlay.jsx'
import { useOutsideClick } from './hooks.js'

const NAV = [
  {
    group: 'Business',
    items: [
      { to: '/', icon: 'overview', label: 'Overview', end: true },
      { to: '/sales', icon: 'sales', label: 'Sales' },
      { to: '/products', icon: 'products', label: 'Products' },
      { to: '/inventory', icon: 'inventory', label: 'Inventory', badge: 'inv' }
    ]
  },
  {
    group: 'Manage',
    items: [
      { to: '/customers', icon: 'customers', label: 'Customers' },
      { to: '/invoices', icon: 'invoices', label: 'Invoices', badge: 'inv' },
      { to: '/expenses', icon: 'expenses', label: 'Expenses' },
      { to: '/reports', icon: 'reports', label: 'Reports' }
    ]
  },
  {
    group: 'System',
    items: [{ to: '/settings', icon: 'settings', label: 'Settings' }]
  }
]

export function Shell({ children }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="shell">
      {open && <div className="sidebar-backdrop" onClick={() => setOpen(false)} />}
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="main-col">
        <Topbar onMenu={() => setOpen(true)} />
        <main className="main">{children}</main>
      </div>
    </div>
  )
}

function Sidebar({ open, onClose }) {
  const { data, deleteProduct } = useApp()
  const navigate = useNavigate()
  const invSummary = useMemo(() => (data ? inventorySummary(data.products) : null), [data])
  const overdueCount = useMemo(
    () => (data ? data.invoices.filter((i) => i.status === 'overdue').length : 0),
    [data]
  )
  const lowStock = invSummary ? invSummary.low + invSummary.out : 0

  const handleLogout = async () => {
    onClose()
    const ok = await window.appConfirm({
      title: 'Sign out of NEXUS?',
      message: 'You can sign back in anytime. Your local demo data stays saved on this device.',
      confirmLabel: 'Sign out',
      danger: true
    })
    if (ok) {
      // handled in App via context
    }
  }

  return (
    <aside className={cls('sidebar', open && 'open')} aria-label="Main navigation">
      <div className="sidebar-brand">
        <Logo size={32} />
      </div>

      <nav className="sidebar-nav">
        {NAV.map((group) => (
          <div key={group.group}>
            <div className="nav-group-label">{group.group}</div>
            {group.items.map((item) => {
              let badge = null
              if (item.badge === 'inv' && lowStock > 0) badge = lowStock
              if (item.to === '/invoices' && overdueCount > 0) badge = overdueCount
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => cls('nav-link', isActive && 'active')}
                  onClick={onClose}
                >
                  <Icon name={item.icon} size={18} />
                  <span className="nav-label">{item.label}</span>
                  {badge ? <span className="nav-badge">{badge}</span> : null}
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <button className="nav-link" onClick={() => navigate('/settings')}>
          <Icon name="help" size={18} />
          <span className="nav-label">Help & support</span>
        </button>
        <div className="divider" style={{ margin: '8px 0' }} />
        <button className="nav-link" onClick={() => navigate('/settings')}>
          <Avatar name={data?.preferences?.profile?.name || 'Alex Patel'} size="sm" />
          <span className="nav-label grow" style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
            <b style={{ fontSize: 13 }}>{data?.preferences?.profile?.name || 'Alex Patel'}</b>
            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)' }}>Business Owner</span>
          </span>
        </button>
        <SignOutRow onClick={handleLogout} />
      </div>
    </aside>
  )
}

function SignOutRow({ onClick }) {
  return (
    <button className="nav-link" onClick={onClick} style={{ color: 'var(--danger-text)' }}>
      <Icon name="logout" size={18} />
      <span className="nav-label">Sign out</span>
    </button>
  )
}

function Topbar({ onMenu }) {
  return (
    <header className="topbar">
      <IconButton name="menu" className="hide-desktop" aria-label="Open menu" onClick={onMenu} size={20} />
      <GlobalSearch />
      <div className="topbar-actions">
        <ThemeToggle />
        <NotificationsBell />
        <ProfileMenu />
      </div>
    </header>
  )
}

function ThemeToggle() {
  const { data, updatePreferences } = useApp()
  const theme = data?.preferences?.theme || 'system'
  const dark = document.documentElement.getAttribute('data-theme') === 'dark'
  const next = dark ? 'light' : 'dark'
  return (
    <button
      className="icon-btn"
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => updatePreferences({ theme: next })}
    >
      <Icon name={dark ? 'sun' : 'moon'} size={18} />
    </button>
  )
}

function GlobalSearch() {
  const { data } = useApp()
  const [q, setQ] = useState('')
  const [focused, setFocused] = useState(false)
  const [active, setActive] = useState(0)
  const navigate = useNavigate()
  const ref = useRef(null)
  useOutsideClick(ref, () => setFocused(false), focused)

  const results = useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query || !data) return { products: [], customers: [], invoices: [], sales: [] }
    const match = (str) => (str || '').toLowerCase().includes(query)
    return {
      products: data.products.filter((p) => match(p.name) || match(p.sku) || match(p.category)).slice(0, 4),
      customers: data.customers.filter((c) => match(c.name) || match(c.email) || match(c.phone)).slice(0, 4),
      invoices: data.invoices.filter((i) => match(i.number)).slice(0, 4),
      sales: data.sales.filter((s) => match(s.number) || match(String(s.total))).slice(0, 3)
    }
  }, [q, data])

  const flat = useMemo(() => {
    const list = []
    if (results.products.length) list.push({ group: 'Products', items: results.products.map((p) => ({ to: '/products', icon: 'products', label: p.name, sub: `${p.sku} · ${p.category}` })) })
    if (results.customers.length) list.push({ group: 'Customers', items: results.customers.map((c) => ({ to: '/customers', icon: 'customers', label: c.name, sub: c.email || c.phone })) })
    if (results.invoices.length) list.push({ group: 'Invoices', items: results.invoices.map((i) => ({ to: '/invoices', icon: 'invoices', label: i.number, sub: i.status })) })
    if (results.sales.length) list.push({ group: 'Sales', items: results.sales.map((s) => ({ to: '/sales', icon: 'sales', label: s.number, sub: s.status })) })
    return list
  }, [results])

  const total = flat.reduce((s, g) => s + g.items.length, 0)
  const open = focused && q.trim() && total > 0

  const go = (item) => {
    navigate(item.to)
    setQ('')
    setFocused(false)
  }

  const onKey = (e) => {
    if (!open) return
    const flatItems = flat.flatMap((g) => g.items)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => (a + 1) % flatItems.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => (a - 1 + flatItems.length) % flatItems.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (flatItems[active]) go(flatItems[active])
    } else if (e.key === 'Escape') {
      setFocused(false)
    }
  }

  let idx = -1

  return (
    <div className="topbar-search" ref={ref}>
      <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', zIndex: 1 }}>
        <Icon name="search" size={16} />
      </span>
      <input
        className="input"
        style={{ paddingLeft: 38 }}
        placeholder="Search products, customers, invoices…"
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          setActive(0)
        }}
        onFocus={() => setFocused(true)}
        onKeyDown={onKey}
        aria-label="Global search"
        role="combobox"
        aria-expanded={open}
      />
      {q && (
        <button
          className="icon-btn btn-sm"
          style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', width: 26, height: 26 }}
          onClick={() => setQ('')}
          aria-label="Clear search"
        >
          <Icon name="close" size={14} />
        </button>
      )}
      {focused && q.trim() && (
        <div className="search-popover">
          {total === 0 ? (
            <div className="search-empty">
              No results for <b>“{q}”</b>
            </div>
          ) : (
            flat.map((group) => (
              <div key={group.group}>
                <div className="search-group-label">{group.group}</div>
                {group.items.map((item) => {
                  idx++
                  const i = idx
                  return (
                    <button
                      key={item.label}
                      className="search-result"
                      style={{ background: i === active ? 'var(--surface-3)' : undefined }}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(item)}
                    >
                      <span className="sr-ic">
                        <Icon name={item.icon} size={16} />
                      </span>
                      <span className="grow" style={{ minWidth: 0 }}>
                        <span className="truncate" style={{ display: 'block', fontWeight: 600, fontSize: 13 }}>{item.label}</span>
                        <span className="truncate" style={{ display: 'block', fontSize: 11.5, color: 'var(--text-3)' }}>{item.sub}</span>
                      </span>
                      <Icon name="chevron-right" size={14} className="faint" />
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function NotificationsBell() {
  const { data } = useApp()
  const [open, setOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const navigate = useNavigate()
  const ref = useRef(null)
  useOutsideClick(ref, () => setOpen(false), open)
  const notifs = useMemo(() => notificationDigest(data), [data])

  const toneColor = {
    danger: 'var(--danger)',
    warning: 'var(--warn)',
    info: 'var(--info)',
    neutral: 'var(--text-3)',
    ok: 'var(--ok)'
  }

  return (
    <>
      <div style={{ position: 'relative' }} ref={ref}>
        <button
          className={cls('icon-btn', notifs.some((n) => n.tone === 'danger') && 'has-dot')}
          aria-label="Notifications"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <Icon name="bell" size={18} />
        </button>
        {open && (
          <div className="menu" style={{ right: 0, top: 'calc(100% + 8px)', minWidth: 300, maxWidth: 'min(360px, 90vw)' }}>
            <div className="menu-head">Notifications</div>
            {notifs.map((n, i) => (
              <button
                key={i}
                className="menu-item"
                style={{ alignItems: 'flex-start', gap: 11 }}
                onClick={() => {
                  setOpen(false)
                  if (n.to) navigate(n.to)
                }}
              >
                <span className="sr-ic" style={{ background: (n.tone && toneColor[n.tone]) || 'var(--surface-3)', color: '#fff' }}>
                  <Icon name={n.icon} size={15} />
                </span>
                <span className="grow" style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontWeight: 600, fontSize: 13 }}>{n.title}</span>
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--text-3)', marginTop: 1, lineHeight: 1.45 }}>{n.body}</span>
                </span>
              </button>
            ))}
            <div className="menu-sep" />
            <button className="menu-item" onClick={() => setHelpOpen(true)}>
              <Icon name="help" size={16} />
              Open help centre
            </button>
          </div>
        )}
      </div>
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  )
}

function ProfileMenu() {
  const { data, signOut } = useApp()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const ref = useRef(null)
  useOutsideClick(ref, () => setOpen(false), open)
  const name = data?.preferences?.profile?.name || 'Alex Patel'

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button
        className="icon-btn"
        style={{ width: 40 }}
        aria-label="Account menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Avatar name={name} size="sm" />
      </button>
      {open && (
        <div className="menu" style={{ right: 0, top: 'calc(100% + 8px)', minWidth: 230 }}>
          <div style={{ padding: '10px 12px 6px' }}>
            <b style={{ fontSize: 13.5 }}>{name}</b>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Business Owner</div>
          </div>
          <div className="menu-sep" />
          <button className="menu-item" onClick={() => { setOpen(false); navigate('/settings') }}>
            <Icon name="user" size={16} />
            My profile
          </button>
          <button className="menu-item" onClick={() => { setOpen(false); navigate('/settings') }}>
            <Icon name="monitor" size={16} />
            Appearance
          </button>
          <div className="menu-sep" />
          <button
            className="menu-item danger"
            onClick={async () => {
              const ok = await window.appConfirm({
                title: 'Sign out of NEXUS?',
                message: 'Your local demo data will remain saved on this device.',
                confirmLabel: 'Sign out',
                danger: true
              })
              if (ok) {
                setOpen(false)
                signOut()
              }
            }}
          >
            <Icon name="logout" size={16} />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

export function HelpModal({ open, onClose }) {
  const { showToast, resetData } = useApp()
  return (
    <Modal open={open} onClose={onClose} title="Help & support" subtitle="NEXUS is built as a fully working demo.">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="card" style={{ boxShadow: 'none' }}>
          <div className="card-body">
            <b className="text-md" style={{ display: 'block', marginBottom: 6 }}>How the demo works</b>
            <p className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
              All data is stored locally in your browser. Adding a sale updates inventory, dashboards and persists to
              LocalStorage automatically. Reset or export your data from{' '}
              <b>Settings → Data</b>.
            </p>
          </div>
        </div>
        <div className="card" style={{ boxShadow: 'none' }}>
          <div className="card-body">
            <b className="text-md" style={{ display: 'block', marginBottom: 8 }}>Quick tips</b>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
              <li className="row gap-2"><Icon name="search" size={15} className="faint" /> Use the top search to jump anywhere instantly.</li>
              <li className="row gap-2"><Icon name="moon" size={15} className="faint" /> Toggle light / dark mode from the top bar.</li>
              <li className="row gap-2"><Icon name="calendar" size={15} className="faint" /> Period filters on the dashboard feed every chart.</li>
              <li className="row gap-2"><Icon name="zap" size={15} className="faint" /> Tables support search, filters, sorting & pagination.</li>
            </ul>
          </div>
        </div>
        <Button
          variant="ghost"
          onClick={() => {
            onClose()
            showToast('info', 'Contact support (demo)', 'hello@nexusretail.co.tz — this is placeholder demo contact info.')
          }}
        >
          <Icon name="mail" size={15} />
          Contact support
        </Button>
      </div>
    </Modal>
  )
}