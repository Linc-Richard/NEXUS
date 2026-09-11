import React, { useEffect, useRef } from 'react'
import { cls } from '../../utils/format.js'
import { Icon } from './Icon.jsx'
import { Button } from './kit.jsx'
import { useApp } from '../../store/AppContext.jsx'

function useMountAnim() {
  return React.useState(true)
}

export function Modal({ open, onClose, title, subtitle, size = 'md', children, footer, className }) {
  const bodyRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={cls('modal', `modal-${size}`, className)}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {(title || onClose) && (
          <div className="modal-header">
            <div style={{ minWidth: 0 }}>
              {title && <div className="modal-title">{title}</div>}
              {subtitle && <div className="modal-sub">{subtitle}</div>}
            </div>
            {onClose && (
              <button className="btn-icon btn-sm" onClick={onClose} aria-label="Close dialog">
                <Icon name="close" size={16} />
              </button>
            )}
          </div>
        )}
        <div className="modal-body" ref={bodyRef}>
          {children}
        </div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}

export function Drawer({ open, onClose, children, title }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="drawer" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="drawer-panel" role="dialog" aria-modal="true" aria-label={title}>
        {title && (
          <div className="modal-header">
            <div className="modal-title">{title}</div>
            <button className="btn-icon btn-sm" onClick={onClose} aria-label="Close panel">
              <Icon name="close" size={16} />
            </button>
          </div>
        )}
        <div className="modal-body" style={{ padding: 0 }}>
          {children}
        </div>
      </div>
    </div>
  )
}

export function ConfirmDialog() {
  const { confirmState, resolveConfirm, showToast } = useApp()
  useMountAnim()
  if (!confirmState) return null
  return (
    <div className="modal-overlay">
      <div className="modal modal-sm" role="alertdialog" aria-modal="true" aria-label={confirmState.title}>
        <div className="modal-body" style={{ textAlign: 'center', padding: '26px 24px' }}>
          <div
            className="empty-ic"
            style={{
              width: 54,
              height: 54,
              borderRadius: 16,
              margin: '0 auto 14px',
              background: confirmState.danger ? 'var(--danger-soft)' : 'var(--primary-soft)',
              color: confirmState.danger ? 'var(--danger)' : 'var(--primary)'
            }}
          >
            <Icon name={confirmState.danger ? 'alert' : 'info'} size={24} />
          </div>
          <div className="modal-title" style={{ fontSize: 16 }}>{confirmState.title}</div>
          {confirmState.message && (
            <div className="muted" style={{ fontSize: 13.5, marginTop: 8, lineHeight: 1.6 }}>
              {confirmState.message}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'center' }}>
            <Button variant="ghost" onClick={() => resolveConfirm(false)}>
              {confirmState.cancelLabel}
            </Button>
            <Button
              variant={confirmState.danger ? 'danger' : 'primary'}
              onClick={() => resolveConfirm(true)}
            >
              {confirmState.confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function TempToasts() {
  const { toasts, dismissToast } = useApp()
  return (
    <div className="toast-stack" aria-live="polite" role="region" aria-label="Notifications">
      {toasts.map((t) => (
        <div key={t.id} className={cls('toast', t.type)} role="status">
          <span className="toast-ic">
            <Icon name={t.icon || { ok: 'check-circle', danger: 'alert', warn: 'alert', info: 'info' }[t.type] || 'check-circle'} size={16} />
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="toast-title">{t.title}</div>
            {t.message && <div className="toast-msg">{t.message}</div>}
          </div>
          <button className="toast-close" onClick={() => dismissToast(t.id)} aria-label="Dismiss notification">
            <Icon name="close" size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}