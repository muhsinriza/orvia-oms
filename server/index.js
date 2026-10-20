require('dotenv').config()
const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const session = require('express-session')
const pgSession = require('connect-pg-simple')(session)
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const db = require('./db')

const app = express()
const PORT = process.env.PORT || 3001

app.set('trust proxy', 1)

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // PDF/packing list routes serve inline HTML — CSP would break them
  crossOriginEmbedderPolicy: false,
}))

// Rate limiting — login endpoint
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Çok fazla deneme. 15 dakika sonra tekrar deneyin.' },
}))

// Rate limiting — PDF/Excel generation (CPU-intensive, abuse risk)
const pdfRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Çok fazla istek. Lütfen bekleyin.' },
})
app.use('/api/pdf', pdfRateLimit)
app.use('/api/customs-excel', pdfRateLimit)

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

app.use(express.json({ limit: '2mb' }))
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
    sameSite: 'strict',
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
    // purchase_orders extra columns (added after initial schema)
    await db.query(`
      ALTER TABLE purchase_orders
        ADD COLUMN IF NOT EXISTS purchase_type   TEXT DEFAULT 'ithalat',
        ADD COLUMN IF NOT EXISTS caliber         TEXT,
        ADD COLUMN IF NOT EXISTS origin_country  TEXT,
        ADD COLUMN IF NOT EXISTS customs_ref     TEXT,
        ADD COLUMN IF NOT EXISTS arrival_date    DATE,
        ADD COLUMN IF NOT EXISTS etd             DATE,
        ADD COLUMN IF NOT EXISTS eta             DATE,
        ADD COLUMN IF NOT EXISTS transport_type  TEXT,
        ADD COLUMN IF NOT EXISTS net_weight_box  NUMERIC,
        ADD COLUMN IF NOT EXISTS total_pallets   INTEGER,
        ADD COLUMN IF NOT EXISTS pallet_type     TEXT,
        ADD COLUMN IF NOT EXISTS grade           TEXT,
        ADD COLUMN IF NOT EXISTS size_range      TEXT,
        ADD COLUMN IF NOT EXISTS special_notes   TEXT,
        ADD COLUMN IF NOT EXISTS tracking_number      TEXT,
        ADD COLUMN IF NOT EXISTS container_number     TEXT,
        ADD COLUMN IF NOT EXISTS seawaybill_number    TEXT,
        ADD COLUMN IF NOT EXISTS vessel_name          TEXT,
        ADD COLUMN IF NOT EXISTS flight_number        TEXT,
        ADD COLUMN IF NOT EXISTS driver_name          TEXT,
        ADD COLUMN IF NOT EXISTS driver_phone         TEXT
    `)
    // packing list data column
    await db.query(`ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS packing_list_data JSONB`)
    // migration 005: multi-container support
    await db.query(`
      CREATE TABLE IF NOT EXISTS sales_order_containers (
        id                SERIAL PRIMARY KEY,
        sales_order_id    UUID NOT NULL,
        container_number  TEXT    NOT NULL DEFAULT '',
        sort_order        INTEGER NOT NULL DEFAULT 0,
        packing_list_data JSONB,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    // migration 006: fix sales_order_id column type from INTEGER to UUID (idempotent)
    await db.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='sales_order_containers'
            AND column_name='sales_order_id'
            AND data_type='integer'
        ) THEN
          DROP TABLE IF EXISTS sales_order_containers;
          CREATE TABLE sales_order_containers (
            id                SERIAL PRIMARY KEY,
            sales_order_id    UUID NOT NULL,
            container_number  TEXT NOT NULL DEFAULT '',
            sort_order        INTEGER NOT NULL DEFAULT 0,
            packing_list_data JSONB,
            created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
        END IF;
      END $$;
    `)
    await db.query(`CREATE INDEX IF NOT EXISTS idx_soc_sales_order_id ON sales_order_containers(sales_order_id, sort_order)`)
    // migrate existing single container values (idempotent via WHERE NOT EXISTS)
    await db.query(`
      INSERT INTO sales_order_containers (sales_order_id, container_number, sort_order, packing_list_data)
      SELECT s.id, s.container_number, 0, s.packing_list_data
      FROM sales_orders s
      WHERE s.container_number IS NOT NULL AND s.container_number <> ''
        AND NOT EXISTS (
          SELECT 1 FROM sales_order_containers c WHERE c.sales_order_id = s.id
        )
    `)
    // migration 007: gtip_code on products, loading_address + freight_amount on sales_orders
    await db.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS gtip_code TEXT`)
    await db.query(`ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS loading_address TEXT`)
    await db.query(`ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS freight_amount NUMERIC`)
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
app.use('/api/customs-excel',   require('./routes/customsExcel'))
app.use('/api/tracking',        require('./routes/tracking'))

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true }))

// Global error handler
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Sunucu hatası' })
})

app.listen(PORT, () => {
  console.log(`Orvia OMS backend listening on port ${PORT}`)
  // Shipping tracking cron'u başlat
  const { startCron } = require('./scraper/index')
  startCron()
})
