require('dotenv').config()
const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const session = require('express-session')
const pgSession = require('connect-pg-simple')(session)
const db = require('./db')

const app = express()
const PORT = process.env.PORT || 3001

app.set('trust proxy', 1)

// CORS — allow dev origin and production domain
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://orviaoms.com',
  'https://www.orviaoms.com',
]
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
    cb(new Error('CORS policy violation'))
  },
  credentials: true,
}))

app.use(express.json())
app.use(cookieParser())

// Session store in PostgreSQL
app.use(session({
  store: new pgSession({
    pool: db,
    tableName: 'session',
    createTableIfMissing: true,
  }),
  secret: (() => {
    const s = process.env.SESSION_SECRET
    if (!s) {
      if (process.env.NODE_ENV === 'production') {
        console.error('[FATAL] SESSION_SECRET env var is not set. Refusing to start in production.')
        process.exit(1)
      }
      console.warn('[WARN] SESSION_SECRET not set — using insecure dev default. DO NOT use in production.')
      return 'dev-secret-only-for-local'
    }
    return s
  })(),
  resave: false,
  saveUninitialized: false,
  name: 'sid',
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
}))

// ─── Startup migrations (idempotent) ─────────────────────────────────────────
async function runMigrations () {
  try {
    // sales_orders extra columns
    await db.query(`
      ALTER TABLE sales_orders
        ADD COLUMN IF NOT EXISTS sales_type    TEXT DEFAULT 'ihracat',
        ADD COLUMN IF NOT EXISTS sa_number     TEXT,
        ADD COLUMN IF NOT EXISTS invoice_no    TEXT,
        ADD COLUMN IF NOT EXISTS lot_no        TEXT,
        ADD COLUMN IF NOT EXISTS dest_country  TEXT,
        ADD COLUMN IF NOT EXISTS transit_entry TEXT,
        ADD COLUMN IF NOT EXISTS transit_exit  TEXT
    `)
    // sales_order_items table
    await db.query(`
      CREATE TABLE IF NOT EXISTS sales_order_items (
        id             SERIAL PRIMARY KEY,
        sales_order_id UUID REFERENCES sales_orders(id) ON DELETE CASCADE,
        product_id     INTEGER,
        variety        TEXT,
        caliber        TEXT,
        origin         TEXT,
        quantity_kg    NUMERIC,
        price_per_unit NUMERIC,
        box_type       TEXT,
        box_weight_kg  NUMERIC,
        sell_by        TEXT DEFAULT 'box',
        sort_order     INTEGER DEFAULT 0
      )
    `)
    await db.query(`ALTER TABLE sales_order_items ADD COLUMN IF NOT EXISTS sell_by TEXT DEFAULT 'box'`)
    // Fix: ALTER product_id from INTEGER to TEXT so UUID strings can be stored
    const pidCheck = await db.query(`
      SELECT data_type FROM information_schema.columns
      WHERE table_name='sales_order_items' AND column_name='product_id'
    `)
    if (pidCheck.rows[0] && pidCheck.rows[0].data_type === 'integer') {
      console.log('[migrate] Changing sales_order_items.product_id from INTEGER to TEXT')
      await db.query(`ALTER TABLE sales_order_items ALTER COLUMN product_id TYPE TEXT USING product_id::TEXT`)
      console.log('[migrate] sales_order_items.product_id changed to TEXT')
    }
    // Fix: if sales_order_id column type is wrong (integer instead of uuid), recreate table
    // Check column type and fix if needed
    const colCheck = await db.query(`
      SELECT data_type FROM information_schema.columns
      WHERE table_name='sales_order_items' AND column_name='sales_order_id'
    `)
    if (colCheck.rows[0] && colCheck.rows[0].data_type !== 'uuid') {
      console.log('[migrate] Fixing sales_order_items.sales_order_id type (was', colCheck.rows[0].data_type, '→ uuid)')
      await db.query(`DROP TABLE IF EXISTS sales_order_items CASCADE`)
      await db.query(`
        CREATE TABLE sales_order_items (
          id             SERIAL PRIMARY KEY,
          sales_order_id UUID REFERENCES sales_orders(id) ON DELETE CASCADE,
          product_id     INTEGER,
          variety        TEXT,
          caliber        TEXT,
          origin         TEXT,
          quantity_kg    NUMERIC,
          price_per_unit NUMERIC,
          box_type       TEXT,
          box_weight_kg  NUMERIC,
          sell_by        TEXT DEFAULT 'box',
          sort_order     INTEGER DEFAULT 0
        )
      `)
      console.log('[migrate] sales_order_items recreated with correct UUID type')
    }
    // products extra columns
    await db.query(`
      ALTER TABLE products
        ADD COLUMN IF NOT EXISTS default_origin  TEXT,
        ADD COLUMN IF NOT EXISTS box_type        TEXT,
        ADD COLUMN IF NOT EXISTS box_net_kg      NUMERIC,
        ADD COLUMN IF NOT EXISTS box_gross_kg    NUMERIC,
        ADD COLUMN IF NOT EXISTS units_per_box   INTEGER,
        ADD COLUMN IF NOT EXISTS boxes_per_pallet INTEGER
    `)
    // customers India regulatory columns
    await db.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS gst_no   TEXT`)
    await db.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS iec_no   TEXT`)
    await db.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS pan_no   TEXT`)
    await db.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS fssai_no TEXT`)
    // shipment_events table — fix old schema if order_id was INTEGER instead of UUID
    const seCheck = await db.query(`
      SELECT data_type FROM information_schema.columns
      WHERE table_name='shipment_events' AND column_name='order_id'
    `)
    if (seCheck.rows[0] && seCheck.rows[0].data_type !== 'uuid') {
      console.log('[migrate] Dropping old shipment_events (order_id was integer, not uuid)')
      await db.query(`DROP TABLE IF EXISTS shipment_events CASCADE`)
    }
    await db.query(`
      CREATE TABLE IF NOT EXISTS shipment_events (
        id         SERIAL PRIMARY KEY,
        order_type TEXT NOT NULL CHECK (order_type IN ('purchase','sales')),
        order_id   UUID NOT NULL,
        event_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        event_type TEXT DEFAULT 'note',
        title      TEXT,
        description TEXT,
        location   TEXT,
        created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    await db.query(`CREATE INDEX IF NOT EXISTS shipment_events_order_idx ON shipment_events(order_type, order_id)`)
    // sa_number unique constraint (prevents race condition duplicates)
    await db.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS sales_orders_sa_number_unique
      ON sales_orders (sa_number) WHERE sa_number IS NOT NULL
    `)
    console.log('[migrate] All migrations applied successfully')
  } catch (e) {
    console.error('[migrate] Migration error:', e.message)
  }
}
runMigrations()

// Routes
app.use('/api/auth',            require('./routes/auth'))
app.use('/api/dashboard',       require('./routes/dashboard'))
app.use('/api/purchase-orders', require('./routes/purchaseOrders'))
app.use('/api/sales-orders',    require('./routes/salesOrders'))
app.use('/api/suppliers',       require('./routes/suppliers'))
app.use('/api/customers',       require('./routes/customers'))
app.use('/api/products',        require('./routes/products'))
app.use('/api/order-links',     require('./routes/orderLinks'))
app.use('/api/shipment-events', require('./routes/shipmentEvents'))
app.use('/api/pdf',             require('./routes/pdf'))

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true }))

// Global error handler
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Sunucu hatası' })
})

app.listen(PORT, () => {
  console.log(`Orvia OMS backend listening on port ${PORT}`)
})
