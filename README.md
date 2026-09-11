# NEXUS — Business Management Platform

A complete, self-contained Business Management / ERP-style demo application built as a portfolio project for a **Web Designer / Front-End Developer** role.

NEXUS lets a small business run its entire back office from one screen: sales, products, inventory, customers, invoicing, expenses and reporting — with a polished, responsive, light/dark interface. Everything runs locally in the browser; no accounts, servers or fees. It is pre-loaded with realistic demo data for a Dar es Salaam tech & retail business.

---

## Quick start

Requires Node.js 18+.

```bash
npm install
npm run dev      # start the dev server (http://localhost:5173)
npm run build    # production build -> dist/
npm run preview  # preview the production build
```

Sign in with any name and email to explore the demo workspace.

---

## Why this project is a good fit

- **Design & craft first** — a custom design system with tokens, two full themes (light/dark), responsive layouts from 320px to widescreen, micro-animations, keyboard focus states and a mobile drawer navigation.
- **Zero-Dependency code** — no UI kit. Every component (buttons, tables, charts, modals, time-series charts) is hand-built, so the code demonstrates real front-end fundamentals.
- **Data architecture** — a single React Context store with localStorage persistence, seeded demo data, CRUD flows, derived analytics and cross-feature state (a sale reduces stock, can generate an invoice, and updates reports instantly).
- **Real business logic** — VAT on invoices, stock minimums with out-of-stock alerts, paging and filtering, printable invoices (print stylesheet), KPI comparisons vs previous period, payment-method breakdowns and profit & loss views.

---

## Feature tour

| Area | Highlights |
| --- | --- |
| **Dashboard** | KPIs vs previous period, revenue/expense chart, top products, sales by category, low-stock & overdue alerts, timeline |
| **Sales** | Record sales with line items, VAT, stock deduction, payment method; filter/status management, sale detail, convert to invoice |
| **Products** | Full CRUD, pricing/tax margin preview, unit & category management |
| **Inventory** | Stock levels, live valuation, low-stock/out-of-stock states, restock modal, search/filters |
| **Customers** | CRM-style directory with loyalty badges, profile cards, purchase history & per-customer stats |
| **Invoices** | Create invoices from sales or manually, status pipeline (draft → pending → paid/overdue), style-clean printable invoices |
| **Expenses** | Category tagging (rent, salaries, transport…), spending trend, category distribution, CRUD |
| **Reports** | Revenue, Sales, Expenses, Profit and Inventory report tabs with 30d / 3mo / 12mo ranges, charts, P&L statement |
| **Settings** | Profile, business info (shown on invoices), theme, notification prefs, security options, JSON export & data reset |

---

## Tech stack

- **React 18** + **Vite 5** — plain JavaScript (JSX), no TypeScript, no external component libraries
- **React Router 6 (hash routing)** — deep-linkable pages, suitable for static hosting
- **100% hand-built UI & charts** — SVG line/bar/donut/sparkline charts with dual-axis support
- **localStorage** — data persists between sessions; `nexus.data.v1`, `nexus.preferences.v1`, `nexus.session.v1`
- **CSS custom properties** — token-driven design system, `data-theme` light/dark switching with system preference sync

---

## Project structure

```
src/
├── styles/            # design system CSS
│   ├── base.css       # tokens, reset, typography, utilities
│   ├── ui.css         # components (buttons, tables, modals, tabs, switches…)
│   ├── layout.css     # shell, sidebar, topbar, responsive behaviour
│   └── pages.css      # page-level styles + invoice print stylesheet
├── components/
│   ├── ui/            # Icon set, Button/Input/Select/Badge/Menu/Switch, Modal/Drawer, Table
│   ├── charts/        # LineChart, BarChart, DonutChart, Sparkline, useMeasure
│   └── layout/        # AppShell (sidebar/topbar/global search), StatCard helpers
├── store/
│   └── AppContext.jsx # global data store, persistence, toasts, confirm dialogs
├── utils/
│   ├── calc.js        # KPIs, series, monthly reports, stock & customer analytics
│   └── format.js      # currency/date/number formatting, PRNG, JSON export
├── data/
│   └── seed.js        # deterministic demo dataset (mulberry32 PRNG)
└── pages/             # route screens (Dashboard, Sales, Products, … Settings)
```

---

## Nice details worth mentioning

- **Deterministic demo data** — a seeded PRNG regenerates the same ~12 months of orders/invoices/expenses on every reset, so the app always demos well.
- **Printable invoices** — the invoice preview is a dedicated print-area with a `@media print` stylesheet; printing hides the app chrome.
- **Responsive tables** — tables collapse into touch-friendly cards below 768px.
- **Accessible foundations** — semantic landmarks, labelled inputs, `aria-selected`/`role="tablist"`, visible focus rings, reduced-motion support.
- **Global command palette** — spotlight-style search across products, customers, pages and actions.

---

## Deliberate edge cases handled

- Out-of-stock products can't be sold; low stock surfaces on dashboard, inventory and notifications.
- Selling with the "generate invoice" option sets the invoice's due date automatically.
- Invoices can be marked paid/overdue inline and from the preview.
- Deleting customers/products asks for confirmation and keeps related sales records intact.
- Date/time series and period-to-period change percentages are computed against the seed date ("today"), so dashboards always look fresh.

---

## Future improvements

- Real backend sync (Supabase/Firebase) with auth
- Multi-store / multi-owner workspaces
- Receipt printing and email/SMS invoice delivery
- Purchase orders & stock-in tracking
- PDF export of reports and invoices
- Mobile PWA wrapper (offline-first)

---

## Running as a static site

`npm run build` outputs to `dist/` with relative asset paths (base `./`), so it can be dropped onto any static host or opened from `file://` without configuration.