import React, { useState } from 'react'
import { useApp } from '../store/AppContext.jsx'
import { initials, downloadJSON, formatDate } from '../utils/format.js'
import { Icon } from '../components/ui/Icon.jsx'
import { Button, Field, Input, Segmented, Switch, Badge } from '../components/ui/kit.jsx'
import { PageHead } from '../components/layout/StatCard.jsx'

const THEMES = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' }
]

function Section({ icon, title, subtitle, children, actions }) {
  return (
    <section className="card settings-card">
      <div className="row gap-3" style={{ alignItems: 'flex-start', justifyContent: 'space-between', padding: '20px 24px 0' }}>
        <div className="row gap-3" style={{ alignItems: 'flex-start' }}>
          <span className="settings-icon"><Icon name={icon} size={17} /></span>
          <div>
            <h2 className="card-title" style={{ marginBottom: 2 }}>{title}</h2>
            <p className="card-subtitle" style={{ margin: 0 }}>{subtitle}</p>
          </div>
        </div>
        {actions && <div>{actions}</div>}
      </div>
      <div className="card-body" style={{ padding: '18px 24px 24px' }}>
        {children}
      </div>
    </section>
  )
}

export function SettingsPage() {
  const { data, updateBusiness, updatePreferences, resetData, confirmDialog, showToast, signOut, exportData } = useApp()
  const { business, preferences } = data
  const profile = preferences.profile || {}

  /* ---- gates for edited forms ---- */
  const [profileForm, setProfileForm] = useState(null)
  const [businessForm, setBusinessForm] = useState(null)
  const [profileErrors, setProfileErrors] = useState({})
  const [businessErrors, setBusinessErrors] = useState({})

  const saveProfile = (e) => {
    e.preventDefault()
    const f = profileForm || profile
    const errs = {}
    if (!f.name.trim()) errs.name = 'Name is required'
    if (!/^\S+@\S+\.\S+$/.test(f.email)) errs.email = 'Enter a valid email'
    if (Object.keys(errs).length) { setProfileErrors(errs); return }
    updatePreferences({ profile: { ...profile, ...f } })
    setProfileForm(null)
    showToast('ok', 'Profile updated', 'Your personal details were saved.')
  }

  const saveBusiness = (e) => {
    e.preventDefault()
    const f = businessForm || business
    const errs = {}
    if (!f.name.trim()) errs.name = 'Business name is required'
    if (!/^\S+@\S+\.\S+$/.test(f.email)) errs.email = 'Enter a valid email'
    if (!(Number(f.taxRate) >= 0 && Number(f.taxRate) <= 100)) errs.taxRate = 'Tax rate must be 0–100%'
    if (Object.keys(errs).length) { setBusinessErrors(errs); return }
    updateBusiness({ ...f, taxRate: Number(f.taxRate) })
    setBusinessForm(null)
    showToast('ok', 'Business updated', 'Company information was saved.')
  }

  const togglePref = (key, section, value) => {
    updatePreferences({ [section]: { ...preferences[section], [key]: value } })
    showToast('ok', 'Preference saved', 'The setting was applied.')
  }

  const handleExport = () => {
    downloadJSON('nexus-backup.json', exportData())
    showToast('ok', 'Export ready', 'A JSON backup was downloaded.')
  }

  const handleReset = async () => {
    const ok = await confirmDialog({
      title: 'Reset all demo data?',
      message: 'Every product, sale, invoice, customer and expense returns to the original demo dataset. This cannot be undone.',
      confirmLabel: 'Reset data',
      danger: true
    })
    if (ok) {
      resetData()
      showToast('ok', 'Data reset', 'You are back on fresh demo data.')
    }
  }

  const handleLogout = async () => {
    const ok = await confirmDialog({
      title: 'Sign out?',
      message: 'Your data is safe in this browser.',
      confirmLabel: 'Sign out'
    })
    if (ok) signOut()
  }

  const dataSizeKB = Math.max(1, Math.round(new Blob([JSON.stringify(data)]).size / 1024))

  return (
    <>
      <PageHead title="Settings" subtitle="Manage your profile, business, appearance and data." />

      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Settings sections">
          <a href="#s-profile" className="settings-nav-item"><Icon name="user" size={15} /> Profile</a>
          <a href="#s-business" className="settings-nav-item"><Icon name="store" size={15} /> Business</a>
          <a href="#s-appearance" className="settings-nav-item"><Icon name="theme" size={15} /> Appearance</a>
          <a href="#s-notifications" className="settings-nav-item"><Icon name="bell" size={15} /> Notifications</a>
          <a href="#s-security" className="settings-nav-item"><Icon name="lock" size={15} /> Security</a>
          <a href="#s-data" className="settings-nav-item"><Icon name="database" size={15} /> Data & backup</a>
        </nav>

        <div className="settings-main">
          <div id="s-profile" className="settings-anchor">
            <Section
              icon="user"
              title="Profile"
              subtitle="How you appear across the app"
              actions={<Button variant="ghost" size="sm" icon="pencil" onClick={() => setProfileForm(profileForm ? null : profile)}>{profileForm ? 'Cancel edit' : 'Edit profile'}</Button>}
            >
              <div className="row gap-4 profile-line">
                <span className="avatar avatar-xl" data-tone="info">{initials(profile.name)}</span>
                <div>
                  <div className="profile-name">{profileForm?.name || profile.name}</div>
                  <Badge tone="info">{profileForm?.role || profile.role || 'Owner'}</Badge>
                </div>
              </div>
              {profileForm ? (
                <form id="profile-form" onSubmit={saveProfile} noValidate style={{ marginTop: 20 }}>
                  <div className="grid grid-2" style={{ gap: 14 }}>
                    <Field label="Full name" required error={profileErrors.name} style={{ gridColumn: '1 / -1' }}>
                      <Input value={profileForm.name} hasError={!!profileErrors.name} onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))} />
                    </Field>
                    <Field label="Role">
                      <Input value={profileForm.role || ''} onChange={(e) => setProfileForm((f) => ({ ...f, role: e.target.value }))} />
                    </Field>
                    <Field label="Email" required error={profileErrors.email}>
                      <Input type="email" value={profileForm.email} hasError={!!profileErrors.email} onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))} />
                    </Field>
                    <Field label="Phone" style={{ gridColumn: '1 / -1' }}>
                      <Input value={profileForm.phone || ''} onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))} />
                    </Field>
                  </div>
                  <div className="row" style={{ marginTop: 16, justifyContent: 'flex-end', gap: 10 }}>
                    <Button variant="ghost" size="sm" onClick={() => setProfileForm(null)}>Cancel</Button>
                    <Button variant="primary" size="sm" type="submit">Save changes</Button>
                  </div>
                </form>
              ) : (
                <div className="kv-grid" style={{ marginTop: 20 }}>
                  <div className="kv"><span className="faint text-xs">EMAIL</span><b className="text-sm">{profile.email}</b></div>
                  <div className="kv"><span className="faint text-xs">PHONE</span><b className="text-sm">{profile.phone || '—'}</b></div>
                </div>
              )}
            </Section>
          </div>

          <div id="s-business" className="settings-anchor">
            <Section
              icon="store"
              title="Business information"
              subtitle="Details shown on invoices and reports"
              actions={<Button variant="ghost" size="sm" icon="pencil" onClick={() => setBusinessForm(businessForm ? null : business)}>{businessForm ? 'Cancel edit' : 'Edit business'}</Button>}
            >
              {businessForm ? (
                <form id="business-form" onSubmit={saveBusiness} noValidate>
                  <div className="grid grid-2" style={{ gap: 14 }}>
                    <Field label="Business name" required error={businessErrors.name} style={{ gridColumn: '1 / -1' }}>
                      <Input value={businessForm.name} hasError={!!businessErrors.name} onChange={(e) => setBusinessForm((f) => ({ ...f, name: e.target.value }))} />
                    </Field>
                    <Field label="Tagline" style={{ gridColumn: '1 / -1' }}>
                      <Input value={businessForm.tagline || ''} onChange={(e) => setBusinessForm((f) => ({ ...f, tagline: e.target.value }))} />
                    </Field>
                    <Field label="Email" required error={businessErrors.email}>
                      <Input type="email" value={businessForm.email} hasError={!!businessErrors.email} onChange={(e) => setBusinessForm((f) => ({ ...f, email: e.target.value }))} />
                    </Field>
                    <Field label="Phone">
                      <Input value={businessForm.phone || ''} onChange={(e) => setBusinessForm((f) => ({ ...f, phone: e.target.value }))} />
                    </Field>
                    <Field label="Address" style={{ gridColumn: '1 / -1' }}>
                      <Input value={businessForm.address || ''} onChange={(e) => setBusinessForm((f) => ({ ...f, address: e.target.value }))} />
                    </Field>
                    <Field label="City">
                      <Input value={businessForm.city || ''} onChange={(e) => setBusinessForm((f) => ({ ...f, city: e.target.value }))} />
                    </Field>
                    <Field label="Tax ID">
                      <Input value={businessForm.taxId || ''} onChange={(e) => setBusinessForm((f) => ({ ...f, taxId: e.target.value }))} />
                    </Field>
                    <Field label="Tax rate (%)" required error={businessErrors.taxRate}>
                      <Input type="number" min="0" max="100" value={businessForm.taxRate} hasError={!!businessErrors.taxRate} onChange={(e) => setBusinessForm((f) => ({ ...f, taxRate: e.target.value }))} />
                    </Field>
                    <Field label="Currency" hint="Demo builds render TZS throughout">
                      <Input value={business.currency || 'TZS'} disabled />
                    </Field>
                  </div>
                  <div className="row" style={{ marginTop: 16, justifyContent: 'flex-end', gap: 10 }}>
                    <Button variant="ghost" size="sm" onClick={() => setBusinessForm(null)}>Cancel</Button>
                    <Button variant="primary" size="sm" type="submit">Save changes</Button>
                  </div>
                </form>
              ) : (
                <div className="kv-grid">
                  <div className="kv"><span className="faint text-xs">NAME</span><b className="text-sm">{business.name}</b></div>
                  <div className="kv"><span className="faint text-xs">TAGLINE</span><b className="text-sm">{business.tagline}</b></div>
                  <div className="kv"><span className="faint text-xs">EMAIL</span><b className="text-sm">{business.email}</b></div>
                  <div className="kv"><span className="faint text-xs">PHONE</span><b className="text-sm">{business.phone}</b></div>
                  <div className="kv"><span className="faint text-xs">ADDRESS</span><b className="text-sm">{business.city ? `${business.address}, ${business.city}` : business.address}</b></div>
                  <div className="kv"><span className="faint text-xs">TAX ID</span><b className="text-sm">{business.taxId}</b></div>
                  <div className="kv"><span className="faint text-xs">TAX RATE</span><b className="text-sm">{business.taxRate}%</b></div>
                  <div className="kv"><span className="faint text-xs">CURRENCY</span><b className="text-sm">{business.currency}</b></div>
                </div>
              )}
            </Section>
          </div>

          <div id="s-appearance" className="settings-anchor">
            <Section icon="theme" title="Appearance" subtitle="Pick a theme for this device">
              <div className="row gap-3" style={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
                <div>
                  <div className="text-sm" style={{ fontWeight: 600, marginBottom: 4 }}>Theme</div>
                  <div className="faint text-xs">System follows your operating system preference.</div>
                </div>
                <Segmented options={THEMES} value={preferences.theme || 'system'} onChange={(v) => updatePreferences({ theme: v })} />
              </div>
              <div className="theme-swatches" style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {THEMES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    aria-pressed={preferences.theme === t.value}
                    className={`theme-swatch ${preferences.theme === t.value ? 'active' : ''}`}
                    onClick={() => updatePreferences({ theme: t.value })}
                  >
                    <span className={`swatch-preview swatch-${t.value}`}>
                      <span className="swatch-sun">☀</span>
                      <span className="swatch-moon">☾</span>
                    </span>
                    <span className="swatch-label">{t.label}</span>
                  </button>
                ))}
              </div>
            </Section>
          </div>

          <div id="s-notifications" className="settings-anchor">
            <Section icon="bell" title="Notifications" subtitle="Choose what NEXUS should flag for you">
              {[
                { key: 'lowStock', title: 'Low stock alerts', body: 'Notify when a product drops below its minimum stock.' },
                { key: 'overdueInvoices', title: 'Overdue invoice alerts', body: 'Remind you when an invoice passes its due date.' },
                { key: 'weeklyDigest', title: 'Weekly summary', body: 'A Monday morning digest of revenue, orders and expenses.' },
                { key: 'email', title: 'Email notifications', body: 'Demo builds show notifications in-app only.' }
              ].map((n) => (
                <div key={n.key} className="row gap-3 toggle-row">
                  <span className="grow">
                    <div className="text-sm" style={{ fontWeight: 600 }}>{n.title}</div>
                    <div className="faint text-xs" style={{ marginTop: 2 }}>{n.body}</div>
                  </span>
                  <Switch checked={!!preferences.notifications[n.key]} onChange={(v) => togglePref(n.key, 'notifications', v)} label={n.title} />
                </div>
              ))}
            </Section>
          </div>

          <div id="s-security" className="settings-anchor">
            <Section icon="lock" title="Security" subtitle="Demo environment — no real credentials are used">
              <div className="row gap-3 toggle-row">
                <span className="grow">
                  <div className="text-sm" style={{ fontWeight: 600 }}>Require PIN to open the app</div>
                  <div className="faint text-xs" style={{ marginTop: 2 }}>Adds a lightweight lock screen before the dashboard.</div>
                </span>
                <Switch checked={!!preferences.security?.pin} onChange={(v) => togglePref('pin', 'security', v)} label="Require PIN to open the app" />
              </div>
              <div className="kv-grid" style={{ marginTop: 16 }}>
                <div className="kv"><span className="faint text-xs">LAST SIGN IN</span><b className="text-sm">This device · {formatDate(new Date().toISOString())}</b></div>
                <div className="kv"><span className="faint text-xs">DATA STORAGE</span><b className="text-sm">Local browser only — nothing is uploaded</b></div>
              </div>
            </Section>
          </div>

          <div id="s-data" className="settings-anchor">
            <Section icon="database" title="Data & backup" subtitle={`Your demo workspace is currently ${dataSizeKB} KB in this browser`}>
              <div className="row gap-3" style={{ flexWrap: 'wrap', gap: 12 }}>
                <Button variant="outline" icon="download" onClick={handleExport}>Export data (JSON)</Button>
                <Button variant="ghost" icon="refresh" onClick={handleReset}>Reset demo data</Button>
                <span className="spacer" />
                <Button variant="ghost" tone="danger" icon="logout" onClick={handleLogout}>Sign out</Button>
              </div>
              <p className="faint text-xs" style={{ marginTop: 16, lineHeight: 1.6, maxWidth: 640 }}>
                NEXUS is a self-contained demo. All records are seeded demo data stored in your browser's localStorage — you can safely
                experiment, reset everything, or export a JSON snapshot at any time.
              </p>
            </Section>
          </div>
        </div>
      </div>
    </>
  )
}
