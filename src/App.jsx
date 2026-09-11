import React, { Component, useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AppProvider, useApp } from './store/AppContext.jsx'
import { Shell } from './components/layout/Shell.jsx'
import { ConfirmDialog, TempToasts } from './components/ui/Overlay.jsx'
import { Icon, Logo } from './components/ui/Icon.jsx'
import { Button } from './components/ui/kit.jsx'
import { AuthScreen } from './pages/AuthScreen.jsx'
import { Dashboard } from './pages/Dashboard.jsx'
import { SalesPage } from './pages/Sales.jsx'
import { ProductsPage } from './pages/Products.jsx'
import { InventoryPage } from './pages/Inventory.jsx'
import { CustomersPage } from './pages/Customers.jsx'
import { InvoicesPage } from './pages/Invoices.jsx'
import { ExpensesPage } from './pages/Expenses.jsx'
import { ReportsPage } from './pages/Reports.jsx'
import { SettingsPage } from './pages/Settings.jsx'

class ErrorBoundary extends Component {
  state = { hasError: false }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(err) {
    console.error('[NEXUS] page error:', err)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="main" style={{ maxWidth: 560 }}>
          <div className="card" style={{ boxShadow: 'none' }}>
            <div style={{ padding: 48, textAlign: 'center' }}>
              <div className="empty-ic" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
                <Icon name="alert" size={26} />
              </div>
              <div className="empty-title" style={{ fontSize: 17, marginTop: 6 }}>Something went wrong</div>
              <p className="muted" style={{ marginTop: 8, fontSize: 13.5 }}>
                This view hit an unexpected error. Your data is safe — try reloading the page, or go back.
              </p>
              <div style={{ marginTop: 18, display: 'flex', gap: 10, justifyContent: 'center' }}>
                <Button variant="primary" onClick={() => (window.location.hash = '#/')}>Back to overview</Button>
                <Button variant="ghost" onClick={() => window.location.reload()}>Reload app</Button>
              </div>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function WireGlobals() {
  const { confirmDialog } = useApp()
  useEffect(() => {
    window.appConfirm = confirmDialog
  }, [confirmDialog])
  return null
}

function BootScreen() {
  return (
    <div className="boot-screen" role="status" aria-label="Loading NEXUS">
      <Logo size={48} />
      <div className="boot-bar"><div /></div>
      <div className="faint" style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em' }}>
        LOADING WORKSPACE
      </div>
    </div>
  )
}

function PageTransition({ children }) {
  const location = useLocation()
  return (
    <div key={location.pathname} className="nx-page-anim">
      {children}
    </div>
  )
}

function AppRoutes() {
  const { booted, signedIn } = useApp()
  if (!booted) return <BootScreen />
  if (!signedIn)
    return (
      <>
        <AuthScreen />
        <TempToasts />
        <ConfirmDialog />
      </>
    )
  return (
    <>
      <Shell>
        <PageTransition>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/sales" element={<SalesPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/expenses" element={<ExpensesPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </PageTransition>
      </Shell>
      <TempToasts />
      <ConfirmDialog />
    </>
  )
}

export default function App() {
  return (
    <AppProvider>
      <WireGlobals />
      <ErrorBoundary>
        <HashRouter>
          <AppRoutes />
        </HashRouter>
      </ErrorBoundary>
    </AppProvider>
  )
}