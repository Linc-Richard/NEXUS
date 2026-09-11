import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { buildSeed, TAX_RATE } from '../data/seed.js'
import { uid } from '../utils/format.js'

const DATA_KEY = 'nexus.data.v1'
const PREFS_KEY = 'nexus.preferences.v1'
const SESSION_KEY = 'nexus.session.v1'

const AppContext = createContext(null)

function loadData() {
  try {
    const raw = localStorage.getItem(DATA_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && parsed.version && Array.isArray(parsed.sales)) return parsed
    }
  } catch (e) {
    /* corrupted -> reseed */
  }
  return buildSeed()
}

function persistData(data) {
  try {
    localStorage.setItem(DATA_KEY, JSON.stringify(data))
    localStorage.setItem(PREFS_KEY, JSON.stringify({ theme: data.preferences?.theme || 'system' }))
  } catch (e) {
    /* storage full — ignore in demo */
  }
}

function applyTheme(theme) {
  const sys = window.matchMedia('(prefers-color-scheme: dark)').matches
  const dark = theme === 'dark' || (theme === 'system' && sys)
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
}

export function AppProvider({ children }) {
  const [data, setData] = useState(null)
  const [booted, setBooted] = useState(false)
  const [signedIn, setSignedIn] = useState(() => localStorage.getItem(SESSION_KEY) === '1')
  const [toasts, setToasts] = useState([])
  const [confirmState, setConfirmState] = useState(null)
  const resolveRef = useRef(null)
  const mediaRef = useRef(null)

  useEffect(() => {
    const t = setTimeout(() => {
      const d = loadData()
      setData(d)
      applyTheme(d.preferences?.theme || 'system')
      setBooted(true)
    }, 140)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!data) return
    persistData(data)
    applyTheme(data.preferences?.theme || 'system')

    if (mediaRef.current) {
      mediaRef.current.removeEventListener('change', mediaRef.current.handler)
    }
    if ((data.preferences?.theme || 'system') === 'system') {
      const handler = () => applyTheme('system')
      mediaRef.current = window.matchMedia('(prefers-color-scheme: dark)')
      mediaRef.current.addEventListener('change', handler)
      mediaRef.current.handler = handler
    }
    return () => {
      if (mediaRef.current) mediaRef.current.removeEventListener('change', mediaRef.current.handler)
    }
  }, [data])

  /* ---------- toasts ---------- */
  const showToast = useCallback((type, title, message, duration = 4200) => {
    const id = uid('ts')
    setToasts((prev) => [...prev, { id, type, title, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, duration)
  }, [])

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  /* ---------- confirm dialog ---------- */
  const confirmDialog = useCallback((opts) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve
      setConfirmState({
        title: opts.title || 'Are you sure?',
        message: opts.message || '',
        confirmLabel: opts.confirmLabel || 'Confirm',
        cancelLabel: opts.cancelLabel || 'Cancel',
        danger: !!opts.danger
      })
    })
  }, [])

  const resolveConfirm = (value) => {
    setConfirmState(null)
    if (resolveRef.current) {
      resolveRef.current(value)
      resolveRef.current = null
    }
  }

  /* ---------- auth ---------- */
  const signIn = useCallback(() => {
    localStorage.setItem(SESSION_KEY, '1')
    setSignedIn(true)
  }, [])
  const signOut = useCallback(() => {
    localStorage.removeItem(SESSION_KEY)
    setSignedIn(false)
  }, [])

  /* ---------- data actions ---------- */
  const updateWith = useCallback((fn) => setData((prev) => (prev ? fn(prev) : prev)), [])

  const updateBusiness = useCallback((patch) => {
    updateWith((d) => ({ ...d, business: { ...d.business, ...patch } }))
  }, [updateWith])

  const updatePreferences = useCallback((patch) => {
    updateWith((d) => ({
      ...d,
      preferences: {
        ...d.preferences,
        ...patch,
        theme: patch.theme !== undefined ? patch.theme : d.preferences.theme
      }
    }))
  }, [updateWith])

  const saveItem = useCallback((listKey, item) => {
    updateWith((d) => {
      const list = d[listKey]
      const exists = list.some((x) => x.id === item.id)
      return {
        ...d,
        [listKey]: exists ? list.map((x) => (x.id === item.id ? { ...x, ...item } : x)) : [item, ...list]
      }
    })
  }, [updateWith])

  const removeItem = useCallback((listKey, id) => {
    updateWith((d) => ({ ...d, [listKey]: d[listKey].filter((x) => x.id !== id) }))
  }, [updateWith])

  const saveProduct = useCallback((product) => saveItem('products', product), [saveItem])
  const deleteProduct = useCallback((id) => removeItem('products', id), [removeItem])
  const saveCustomer = useCallback((c) => saveItem('customers', c), [saveItem])
  const deleteCustomer = useCallback((id) => removeItem('customers', id), [removeItem])
  const saveExpense = useCallback((e) => saveItem('expenses', e), [saveItem])
  const deleteExpense = useCallback((id) => removeItem('expenses', id), [removeItem])
  const saveInvoice = useCallback((i) => saveItem('invoices', i), [saveItem])
  const deleteInvoice = useCallback((id) => removeItem('invoices', id), [removeItem])

  const registerSale = useCallback((sale, opts = {}) => {
    updateWith((d) => {
      const saleRecord = {
        id: sale.id,
        number: sale.number,
        customerId: sale.customerId,
        date: sale.date,
        items: sale.items,
        subtotal: sale.subtotal,
        tax: sale.tax,
        total: sale.total,
        paymentMethod: sale.paymentMethod,
        status: sale.status,
        createdAt: new Date().toISOString()
      }
      let invoices = d.invoices
      if (opts.makeInvoice) {
        const now = new Date(sale.date)
        const due = new Date(now)
        due.setDate(due.getDate() + 14)
        const num = nextInvoiceNumber(d.invoices)
        invoices = [
          {
            id: uid('inv'),
            number: num,
            customerId: sale.customerId,
            date: now.toISOString(),
            dueDate: due.toISOString(),
            items: sale.items,
            subtotal: sale.subtotal,
            tax: sale.tax,
            total: sale.total,
            status: 'pending',
            paidAt: null,
            notes: ''
          },
          ...d.invoices
        ]
      }
      const products = d.products.map((p) => {
        const it = sale.items.find((x) => x.productId === p.id)
        if (!it || p.service) return p
        return { ...p, stock: Math.max(0, p.stock - it.quantity) }
      })
      return {
        ...d,
        sales: [saleRecord, ...d.sales],
        invoices,
        products
      }
    })
  }, [updateWith])

  const updateSaleStatus = useCallback((id, status) => {
    updateWith((d) => ({
      ...d,
      sales: d.sales.map((s) => (s.id === id ? { ...s, status } : s)),
      invoices: d.invoices.map((inv) => {
        const saleNum = d.sales.find((x) => x.id === id)?.number
        if (saleNum && inv.number.toLowerCase().includes(saleNum.slice(2).toLowerCase())) {
          return { ...inv, status: status === 'paid' ? 'paid' : inv.status }
        }
        return inv
      })
    }))
  }, [updateWith])

  const resetData = useCallback(() => {
    const fresh = buildSeed()
    persistData(fresh)
    setData(fresh)
  }, [])

  const exportData = useCallback(() => {
    return data
  }, [data])

  const value = useMemo(
    () => ({
      booted,
      signedIn,
      signIn,
      signOut,
      data,
      toasts,
      showToast,
      dismissToast,
      confirmDialog,
      confirmState,
      resolveConfirm,
      updateBusiness,
      updatePreferences,
      saveProduct,
      deleteProduct,
      saveCustomer,
      deleteCustomer,
      saveExpense,
      deleteExpense,
      saveInvoice,
      deleteInvoice,
      registerSale,
      updateSaleStatus,
      resetData,
      exportData,
      taxRate: data?.business?.taxRate ?? TAX_RATE * 100
    }),
    [
      booted, signedIn, signIn, signOut, data, toasts, showToast, dismissToast,
      confirmDialog, confirmState, updateBusiness, updatePreferences,
      saveProduct, deleteProduct, saveCustomer, deleteCustomer, saveExpense,
      deleteExpense, saveInvoice, deleteInvoice, registerSale, updateSaleStatus,
      resetData, exportData
    ]
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

export function nextInvoiceNumber(invoices) {
  const year = new Date().getFullYear()
  const prefix = `INV-${year}-`
  let max = 0
  for (const inv of invoices) {
    if (inv.number.startsWith(prefix)) {
      const n = parseInt(inv.number.slice(prefix.length), 10)
      if (!Number.isNaN(n) && n > max) max = n
    }
  }
  return `${prefix}${String(max + 1).padStart(3, '0')}`
}