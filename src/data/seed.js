import { mulberry32, pick, weightedPick, addDaysISO } from '../utils/format.js'

export const CATEGORIES = [
  { key: 'el', label: 'Electronics', color: 'cat-el' },
  { key: 'cl', label: 'Clothing', color: 'cat-cl' },
  { key: 'gr', label: 'Grocery', color: 'cat-gr' },
  { key: 'ts', label: 'Technology Services', color: 'cat-ts' }
]

export const TAX_RATE = 0.18

const NOW = Date.now()
const baseProducts = [
  { name: 'Samsung Galaxy A15 128GB', category: 'el', price: 385000, cost: 340000, stock: 24, minStock: 8, unit: 'piece' },
  { name: 'Tecno Spark 20', category: 'el', price: 295000, cost: 255000, stock: 38, minStock: 10, unit: 'piece' },
  { name: 'Xiaomi Redmi Note 13', category: 'el', price: 420000, cost: 360000, stock: 5, minStock: 10, unit: 'piece' },
  { name: 'Apple AirPods (3rd Gen)', category: 'el', price: 690000, cost: 590000, stock: 15, minStock: 5, unit: 'piece' },
  { name: 'JBL Go 3 Bluetooth Speaker', category: 'el', price: 165000, cost: 128000, stock: 0, minStock: 6, unit: 'piece' },
  { name: 'Anker 10000mAh Power Bank', category: 'el', price: 98000, cost: 74000, stock: 42, minStock: 12, unit: 'piece' },
  { name: 'Men\'s Formal Shirt — White', category: 'cl', price: 45000, cost: 28000, stock: 60, minStock: 20, unit: 'piece' },
  { name: 'Women\'s Ankara Dress', category: 'cl', price: 68000, cost: 41000, stock: 35, minStock: 12, unit: 'piece' },
  { name: 'Leather Office Shoes', category: 'cl', price: 145000, cost: 95000, stock: 18, minStock: 8, unit: 'pair' },
  { name: 'Men\'s Denim Jeans', category: 'cl', price: 52000, cost: 33000, stock: 7, minStock: 10, unit: 'piece' },
  { name: 'Kilombero Rice 10kg', category: 'gr', price: 48000, cost: 39000, stock: 120, minStock: 30, unit: 'bag' },
  { name: 'Sunflower Cooking Oil 5L', category: 'gr', price: 32000, cost: 26000, stock: 5, minStock: 15, unit: 'bottle' },
  { name: 'Azam Wheat Flour 5kg', category: 'gr', price: 18000, cost: 14000, stock: 90, minStock: 25, unit: 'bag' },
  { name: 'Instant Coffee 50g', category: 'gr', price: 8000, cost: 5200, stock: 140, minStock: 40, unit: 'jar' },
  { name: 'Maas Fresh Milk 1L', category: 'gr', price: 4200, cost: 3000, stock: 3, minStock: 50, unit: 'pack' },
  { name: 'Website Package — Standard', category: 'ts', price: 850000, cost: 400000, stock: 999, minStock: 1, unit: 'project', service: true },
  { name: 'POS Setup & Staff Training', category: 'ts', price: 350000, cost: 180000, stock: 999, minStock: 1, unit: 'project', service: true },
  { name: 'Monthly IT Support Retainer', category: 'ts', price: 150000, cost: 60000, stock: 999, minStock: 1, unit: 'month', service: true },
  { name: 'CCTV Installation — 4 Cameras', category: 'ts', price: 1200000, cost: 780000, stock: 999, minStock: 1, unit: 'project', service: true }
]

const baseCustomers = [
  { name: 'Jumanne Mwakasege', phone: '+255 754 123 456', email: 'jumanne.m@example.co.tz', city: 'Dar es Salaam', status: 'vip', joinedMonths: 26 },
  { name: 'Neema Moshi', phone: '+255 762 889 001', email: 'neema.moshi@example.co.tz', city: 'Arusha', status: 'active', joinedMonths: 18 },
  { name: 'Baraka Mwangi', phone: '+255 757 445 332', email: 'baraka.mwangi@example.co.tz', city: 'Dar es Salaam', status: 'active', joinedMonths: 14 },
  { name: 'Zawadi Kimaro', phone: '+255 713 672 890', email: 'zawadi.k@example.co.tz', city: 'Dodoma', status: 'active', joinedMonths: 10 },
  { name: 'Amani Mrisho', phone: '+255 784 556 112', email: 'amani.mrisho@example.co.tz', city: 'Mwanza', status: 'new', joinedMonths: 2 },
  { name: 'Rehema Salim', phone: '+255 655 908 774', email: 'rehema.salim@example.co.tz', city: 'Zanzibar', status: 'active', joinedMonths: 22 },
  { name: 'Hassan Ally', phone: '+255 748 223 909', email: 'hassan.ally@example.co.tz', city: 'Dar es Salaam', status: 'inactive', joinedMonths: 30 },
  { name: 'Beatrice Mushi', phone: '+255 682 341 567', email: 'beatrice.mushi@example.co.tz', city: 'Mbeya', status: 'active', joinedMonths: 16 },
  { name: 'Emmanuel Mtui', phone: '+255 755 809 213', email: 'emmah.mtui@example.co.tz', city: 'Moshi', status: 'vip', joinedMonths: 12 },
  { name: 'Grace Ngowi', phone: '+255 769 908 705', email: 'grace.ngowi@example.co.tz', city: 'Arusha', status: 'new', joinedMonths: 1 },
  { name: 'Salome Kessy', phone: '+255 623 117 480', email: 'salome.kessy@example.co.tz', city: 'Morogoro', status: 'active', joinedMonths: 20 },
  { name: 'David Mrema', phone: '+255 719 550 042', email: 'david.mrema@example.co.tz', city: 'Tanga', status: 'inactive', joinedMonths: 40 }
]

const paymentMethods = [
  { v: 'Mobile Money', w: 40 },
  { v: 'Cash', w: 30 },
  { v: 'Bank Transfer', w: 18 },
  { v: 'Card', w: 12 }
]

function monthsAgoISO(months) {
  const d = NEW_DATE(months * 30)
  d.setHours(11, 0, 0, 0)
  return d.toISOString()
}

function NEW_DATE(daysAgo) {
  const d = new Date(NOW - daysAgo * 86400000)
  return d
}

function saleStatus(rand) {
  const r = rand()
  if (r < 0.7) return 'paid'
  if (r < 0.9) return 'pending'
  return 'cancelled'
}

export function buildSeed(now = Date.now()) {
  const rand = mulberry32(20260910)
  const today = new Date(now)
  today.setHours(23, 59, 59, 999)
  const TODAY = today.getTime()

  const products = baseProducts.map((p, i) => ({
    id: `prd_${i + 1}`,
    sku: `NX-${String(1000 + i)}`,
    name: p.name,
    category: p.category,
    price: p.price,
    cost: p.cost,
    stock: p.stock,
    minStock: p.minStock,
    unit: p.unit,
    service: !!p.service,
    createdAt: monthsAgoISO(4 + Math.floor(rand() * 8))
  }))
  const productById = Object.fromEntries(products.map((p) => [p.id, p]))

  const customers = baseCustomers.map((c, i) => ({
    id: `cus_${i + 1}`,
    name: c.name,
    phone: c.phone,
    email: c.email,
    city: c.city,
    status: c.status,
    joinedAt: monthsAgoISO(c.joinedMonths)
  }))
  const customerById = Object.fromEntries(customers.map((c) => [c.id, c]))

  /* ---- Sales: up to 4 per day for ~365 days ---- */
  const sales = []
  let saleNo = 1000
  for (let day = 365; day >= 0; day--) {
    const weekendBoost = day % 7 === 5 || day % 7 === 6 ? 0.25 : 0
    let count = 0
    const roll = rand()
    if (roll < 0.32) count = 1
    else if (roll < 0.68) count = 2
    else if (roll < 0.85) count = 3
    else count = 2 + Math.floor(rand() * 2)
    if (weekendBoost && rand() < 0.4) count += 1
    count = Math.min(count, 4)

    for (let k = 0; k < count; k++) {
      const daysAgo = day + k * 0.07
      if (daysAgo > 365) continue
      const d = NEW_DATE(daysAgo)
      d.setHours(8 + Math.floor(rand() * 12), Math.floor(rand() * 60), 0, 0)
      const itemsCount = weightedPick([
        { v: 1, w: 5 },
        { v: 2, w: 3 },
        { v: 3, w: 1.4 },
        { v: 4, w: 0.6 }
      ], rand)
      const lineItems = []
      for (let li = 0; li < itemsCount; li++) {
        const p = pick(products, rand)
        const existing = lineItems.find((x) => x.productId === p.id)
        if (existing) {
          existing.quantity += 1 + Math.floor(rand() * 2)
        } else {
          lineItems.push({
            productId: p.id,
            name: p.name,
            quantity: p.service ? 1 : 1 + Math.floor(rand() * 3),
            unitPrice: p.service ? p.price : p.price
          })
        }
      }
      const subtotal = lineItems.reduce((s, it) => s + it.quantity * it.unitPrice, 0)
      const tax = Math.round(subtotal * TAX_RATE)
      const status = saleStatus(rand)
      sales.push({
        id: `sle_${saleNo}`,
        number: `SL-${saleNo}`,
        customerId: pick(customers, rand).id,
        date: d.toISOString(),
        items: lineItems,
        subtotal,
        tax,
        total: subtotal + tax,
        paymentMethod: weightedPick(paymentMethods, rand),
        status,
        createdAt: d.toISOString()
      })
      saleNo++
    }
  }

  /* ---- Expenses over ~180 days ---- */
  const expenseCategories = ['Rent', 'Transport', 'Salaries', 'Utilities', 'Marketing', 'Supplies', 'Other']
  const expenses = []
  let expNo = 1
  // recurring monthly
  for (let m = 6; m >= 0; m--) {
    const rentDay = NEW_DATE(m * 30)
    rentDay.setHours(9, 30, 0, 0)
    expenses.push({ id: `exp_${expNo++}`, category: 'Rent', description: 'Monthly rent — Samora Avenue store', amount: 1500000, date: rentDay.toISOString() })

    const salaryDay = NEW_DATE(m * 30 + 3)
    salaryDay.setHours(10, 0, 0, 0)
    expenses.push({ id: `exp_${expNo++}`, category: 'Salaries', description: 'Staff salaries & wages', amount: 4200000, date: salaryDay.toISOString() })

    const utilDay = NEW_DATE(m * 30 + 9)
    utilDay.setHours(8, 45, 0, 0)
    const utilAmount = 160000 + Math.floor(rand() * 120000)
    expenses.push({ id: `exp_${expNo++}`, category: 'Utilities', description: 'Electricity, water & internet', amount: utilAmount, date: utilDay.toISOString() })

    const adDay = NEW_DATE(m * 30 + 13)
    adDay.setHours(12, 0, 0, 0)
    if (rand() > 0.25) {
      const adAmount = 180000 + Math.floor(rand() * 220000)
      expenses.push({ id: `exp_${expNo++}`, category: 'Marketing', description: pick(['Facebook & Instagram ads', 'City billboard placement', 'Radio spots'], rand), amount: adAmount, date: adDay.toISOString() })
    }
  }
  // variable expenses
  let vDay = 176
  while (vDay > 0) {
    vDay -= 2 + Math.floor(rand() * 4)
    const d = NEW_DATE(vDay)
    d.setHours(11 + Math.floor(rand() * 6), Math.floor(rand() * 60), 0, 0)
    const roll = rand()
    if (roll < 0.45) {
      const cat = pick(['Transport', 'Supplies'], rand)
      expenses.push({
        id: `exp_${expNo++}`,
        category: cat,
        description:
          cat === 'Transport'
            ? pick(['Delivery truck fuel', 'Courier to Arusha', 'Freight — Dar to Mwanza'], rand)
            : pick(['Packing materials', 'Bags & boxes restock'], rand),
        amount: 40000 + Math.floor(rand() * 160000),
        date: d.toISOString()
      })
    } else if (roll < 0.6) {
      expenses.push({
        id: `exp_${expNo++}`,
        category: 'Utilities',
        description: pick(['Office supplies', 'Printer toner'], rand),
        amount: 20000 + Math.floor(rand() * 60000),
        date: d.toISOString()
      })
    } else if (roll < 0.72) {
      expenses.push({
        id: `exp_${expNo++}`,
        category: 'Other',
        description: pick(['Business permits renewal', 'Bank charges', 'Insurance premium'], rand),
        amount: 35000 + Math.floor(rand() * 120000),
        date: d.toISOString()
      })
    }
  }

  /* ---- Invoices: derive from recent non-cancelled sales ---- */
  const invoices = []
  let invNo = 0
  const recentSales = sales
    .filter((s) => s.status !== 'cancelled')
    .filter((s) => new Date(s.date).getTime() > TODAY - 130 * 86400000)
  const shuffled = [...recentSales].sort((a, b) => (a.date < b.date ? -1 : 1))
  for (const s of shuffled) {
    if (rand() > 0.42) continue
    invNo++
    const invDate = new Date(s.date)
    const dueDate = new Date(invDate.getTime() + 14 * 86400000)
    const draft = rand() < 0.1 && invDate.getTime() > TODAY - 10 * 86400000
    let status
    if (draft) status = 'draft'
    else if (rand() < 0.58) status = 'paid'
    else if (dueDate.getTime() < TODAY) status = 'overdue'
    else status = 'pending'
    invoices.push({
      id: `inv_${1000 + invNo * 3}`,
      number: `INV-${new Date(invDate).getFullYear()}-${String(invNo).padStart(3, '0')}`,
      customerId: s.customerId,
      date: invDate.toISOString(),
      dueDate: dueDate.toISOString(),
      items: s.items,
      subtotal: s.subtotal,
      tax: s.tax,
      total: s.total,
      status,
      paidAt: status === 'paid' ? invDate.toISOString() : null,
      notes: ''
    })
  }
  invoices.sort((a, b) => (a.date < b.date ? 1 : -1))

  /* ---- Business + preferences ---- */
  const business = {
    name: 'Nexus Retail Ltd',
    tagline: 'Modern retail & technology services',
    email: 'hello@nexusretail.co.tz',
    phone: '+255 745 123 456',
    address: 'Liberty House, Samora Avenue',
    city: 'Dar es Salaam',
    taxId: 'TIN 138-445-770',
    taxRate: 18,
    currency: 'TZS'
  }

  const preferences = {
    theme: 'system',
    profile: {
      name: 'Alex Patel',
      role: 'Business Owner',
      email: 'alex@nexusretail.co.tz',
      phone: '+255 712 000 123'
    },
    notifications: {
      email: true,
      lowStock: true,
      overdueInvoices: true,
      weeklyDigest: false
    }
  }

  const data = {
    version: 1,
    generatedAt: new Date(NOW).toISOString(),
    business,
    preferences,
    products,
    customers,
    sales: sales.reverse(),
    expenses,
    invoices
  }
  return data
}