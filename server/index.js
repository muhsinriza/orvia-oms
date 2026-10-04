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
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
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
