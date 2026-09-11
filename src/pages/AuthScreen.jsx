import React, { useState } from 'react'
import { useApp } from '../store/AppContext.jsx'
import { Logo } from '../components/ui/Icon.jsx'
import { Button, Field, Input, Icon } from '../components/ui/index.js'
import { computeKpis } from '../utils/calc.js'
import { formatCompact } from '../utils/format.js'

export function AuthScreen() {
  const { signIn, data, showToast } = useApp()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  const kpis = data ? computeKpis(data, '30d') : null

  const submit = (e) => {
    e.preventDefault()
    const errs = {}
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Enter a valid email address'
    if (password.length < 6) errs.password = 'Password must be at least 6 characters'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true)
    setTimeout(() => {
      showToast('ok', 'Welcome back, Alex', 'Signed in to NEXUS. Your workspace is ready.')
      signIn()
    }, 450)
  }

  return (
    <div className="auth">
      <div className="auth-visual">
        <div className="content">
          <span className="auth-logo">
            <Logo light size={40} />
          </span>
          <h1>Run your whole business from one clean workspace.</h1>
          <p>
            Products, inventory, sales, customers, invoices, expenses and reports — organised, connected and always
            up to date. Built for small and growing businesses in Tanzania.
          </p>
        </div>
        {kpis && (
          <div className="auth-mini-stats">
            <div className="auth-mini-stat">
              <div className="v">TZS {formatCompact(kpis.revenue)}</div>
              <div className="l">Revenue · 30 days</div>
            </div>
            <div className="auth-mini-stat">
              <div className="v">{kpis.sales}</div>
              <div className="l">Orders · 30 days</div>
            </div>
            <div className="auth-mini-stat">
              <div className="v">{data?.products?.length}</div>
              <div className="l">Products tracked</div>
            </div>
          </div>
        )}
      </div>

      <div className="auth-panel">
        <div className="nx-anim-in">
          <h2 className="auth-heading">Sign in to NEXUS</h2>
          <p className="auth-sub">Welcome back. Enter your details to continue.</p>

          <form onSubmit={submit} noValidate>
            <Field label="Email address" required error={errors.email}>
              <Input
                type="email"
                placeholder="you@company.co.tz"
                value={email}
                hasError={!!errors.email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </Field>
            <Field label="Password" required error={errors.password} className="mt-3">
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                hasError={!!errors.password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </Field>
            <Button type="submit" variant="primary" className="btn-block" size="lg" style={{ marginTop: 22 }} disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <div className="auth-demo-tip">
            <Icon name="zap" size={16} />
            <span>
              Demo mode — no account needed. Use <b>any</b> email and password (6+ characters).
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
            <span className="divider grow" />
            <span className="faint" style={{ fontSize: 12, fontWeight: 600 }}>or</span>
            <span className="divider grow" />
          </div>

          <Button variant="secondary" className="btn-block" size="lg" onClick={() => signIn()}>
            <Icon name="spark" size={16} />
            Continue as demo user (Alex)
          </Button>

          <div className="auth-features">
            <span className="auth-feature"><Icon name="check" size={14} /> LocalStorage persistence</span>
            <span className="auth-feature"><Icon name="check" size={14} /> Light & dark mode</span>
            <span className="auth-feature"><Icon name="check" size={14} /> Fully interactive demo</span>
            <span className="auth-feature"><Icon name="check" size={14} /> No backend required</span>
          </div>

          <p className="auth-foot">NEXUS Business Management · Portfolio project</p>
        </div>
      </div>
    </div>
  )
}