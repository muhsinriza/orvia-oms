const router = require('express').Router()
const db = require('../db')
const { requireAuth } = require('../middleware/auth')

router.use(requireAuth)

// GET /sales-orders
router.get('/', async (req, res) => {
  const { status, search } = req.query
  try {
    let q = `
      SELECT so.*, c.name AS customer_name, p.name AS product_name
      FROM sales_orders so
      LEFT JOIN customers c ON c.id = so.customer_id
      LEFT JOIN products  p ON p.id = so.product_id
      WHERE 1=1
    `
    const params = []
    if (status) { params.push(status); q += ` AND so.status = $${params.length}` }
    if (search) {
      params.push(`%${search}%`)
      q += ` AND (so.party_no ILIKE $${params.length} OR c.name ILIKE $${params.length})`
    }
    q += ' ORDER BY so.created_at DESC'
    const { rows } = await db.query(q, params)
    res.json(rows)
  } catch (e) { console.error(e); res.status(500).json({ error: 'Sunucu hatası' }) }
})

// GET /sales-orders/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT so.*, c.name AS customer_name, p.name AS product_name
      FROM sales_orders so
      LEFT JOIN customers c ON c.id = so.customer_id
      LEFT JOIN products  p ON p.id = so.product_id
      WHERE so.id = $1
    `, [req.params.id])
    if (!rows[0]) return res.status(404).json({ error: 'Bulunamadı' })

    const links = await db.query(`
      SELECT ol.*, po.party_no AS po_party_no, s.name AS supplier_name
      FROM order_links ol
      JOIN purchase_orders po ON po.id = ol.purchase_order_id
      JOIN suppliers s ON s.id = po.supplier_id
      WHERE ol.sales_order_id = $1
    `, [req.params.id])

    let itemRows = []
    try {
      const itemsRes = await db.query(`
        SELECT soi.*, p.name AS product_name
        FROM sales_order_items soi
        LEFT JOIN products p ON p.id = soi.product_id
        WHERE soi.sales_order_id = $1
        ORDER BY soi.sort_order
      `, [req.params.id])
      itemRows = itemsRes.rows
    } catch (_) {}

    res.json({ ...rows[0], links: links.rows, items: itemRows })
  } catch (e) { console.error(e); res.status(500).json({ error: 'Sunucu hatası' }) }
})

// Helper: upsert items for a sales order
async function upsertItems(client, salesOrderId, items) {
  await client.query(`DELETE FROM sales_order_items WHERE sales_order_id = $1`, [salesOrderId])
  if (!Array.isArray(items) || items.length === 0) return
  for (let i = 0; i < items.length; i++) {
    const it = items[i]
    await client.query(`
      INSERT INTO sales_order_items
        (sales_order_id, product_id, variety, caliber, origin, quantity_kg, price_per_unit, box_type, box_weight_kg, sell_by, sort_order)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    `, [
      salesOrderId,
      it.product_id ? parseInt(it.product_id) : null,
      it.variety || null,
      it.caliber || null,
      it.origin || null,
      it.quantity_kg || null,
      it.price_per_unit || null,
      it.box_type || null,
      it.box_weight_kg || null,
      it.sell_by || 'box',
      i,
    ])
  }
}

// POST /sales-orders
router.post('/', async (req, res) => {
  const {
    sales_type, sa_number, invoice_no, lot_no,
    customer_id, product_id, variety, caliber, origin,
    quantity_kg, price_per_unit, currency,
    payment_method, payment_term, incoterm,
    port_loading, port_discharge, dest_country,
    transit_entry, transit_exit,
    shipment_date, delivery_date, etd, eta,
    transport_mode, box_type, box_weight_kg, pallets,
    quality_notes, required_docs, notes, status,
    tracking_number, container_number, seawaybill_number, vessel_name,
    flight_number, driver_name, driver_phone,
    items,
  } = req.body
  const client = await db.connect()
  try {
    await client.query('BEGIN')

    // Ensure columns exist (idempotent migration)
    await client.query(`
      ALTER TABLE sales_orders
        ADD COLUMN IF NOT EXISTS sales_type    TEXT DEFAULT 'ihracat',
        ADD COLUMN IF NOT EXISTS sa_number     TEXT,
        ADD COLUMN IF NOT EXISTS invoice_no    TEXT,
        ADD COLUMN IF NOT EXISTS lot_no        TEXT,
        ADD COLUMN IF NOT EXISTS dest_country  TEXT,
        ADD COLUMN IF NOT EXISTS transit_entry TEXT,
        ADD COLUMN IF NOT EXISTS transit_exit  TEXT
    `)

    // Ensure items table exists
    await client.query(`
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
    await client.query(`ALTER TABLE sales_order_items ADD COLUMN IF NOT EXISTS sell_by TEXT DEFAULT 'box'`)

    // Auto-generate SA number if not provided
    let finalSaNumber = sa_number || null
    if (!finalSaNumber) {
      const year = new Date().getFullYear()
      const { rows: countRows } = await client.query(
        `SELECT COUNT(*) FROM sales_orders WHERE sa_number LIKE $1`,
        [`SA-${year}-%`]
      )
      const seq = String(parseInt(countRows[0].count) + 1).padStart(3, '0')
      finalSaNumber = `SA-${year}-${seq}`
    }

    // Derive legacy single-line fields from items[0] if items provided
    const firstItem = Array.isArray(items) && items.length > 0 ? items[0] : null
    const effProductId    = (firstItem?.product_id) || product_id
    const effVariety      = (firstItem?.variety)    || variety
    const effCaliber      = (firstItem?.caliber)    || caliber
    const effOrigin       = (firstItem?.origin)     || origin
    const effQty          = (firstItem?.quantity_kg)    || quantity_kg
    const effPrice        = (firstItem?.price_per_unit) || price_per_unit
    const effBoxType      = (firstItem?.box_type)       || box_type
    const effBoxWeight    = (firstItem?.box_weight_kg)  || box_weight_kg

    const { rows } = await client.query(`
      INSERT INTO sales_orders
        (sales_type, sa_number, invoice_no, lot_no,
         customer_id, product_id, variety, caliber, origin,
         quantity_kg, price_per_unit, currency,
         payment_method, payment_term, incoterm,
         port_loading, port_discharge, dest_country,
         transit_entry, transit_exit,
         shipment_date, delivery_date, etd, eta,
         transport_mode, box_type, box_weight_kg, pallets,
         quality_notes, required_docs, notes, status, created_by,
         tracking_number, container_number, seawaybill_number, vessel_name,
         flight_number, driver_name, driver_phone)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40)
      RETURNING *
    `, [
      sales_type || 'ihracat', finalSaNumber, invoice_no || null, lot_no || null,
      customer_id, effProductId, effVariety, effCaliber || null, effOrigin,
      effQty, effPrice, currency || 'USD',
      payment_method, payment_term, incoterm,
      port_loading, port_discharge, dest_country || null,
      transit_entry || null, transit_exit || null,
      shipment_date || null, delivery_date || null, etd || null, eta || null,
      transport_mode, effBoxType, effBoxWeight || null, pallets || null,
      quality_notes, JSON.stringify(required_docs || {}), notes,
      status || 'draft', req.session.userId,
      tracking_number || null, container_number || null, seawaybill_number || null, vessel_name || null,
      flight_number || null, driver_name || null, driver_phone || null,
    ])

    await upsertItems(client, rows[0].id, items)
    await client.query('COMMIT')
    res.status(201).json(rows[0])
  } catch (e) {
    await client.query('ROLLBACK')
    console.error(e); res.status(500).json({ error: 'Sunucu hatası', detail: e.message })
  } finally {
    client.release()
  }
})

// PUT /sales-orders/:id
router.put('/:id', async (req, res) => {
  const {
    sales_type, sa_number, invoice_no, lot_no,
    customer_id, product_id, variety, caliber, origin,
    quantity_kg, price_per_unit, currency,
    payment_method, payment_term, incoterm,
    port_loading, port_discharge, dest_country,
    transit_entry, transit_exit,
    shipment_date, delivery_date, etd, eta,
    transport_mode, box_type, box_weight_kg, pallets,
    quality_notes, required_docs, notes, status,
    tracking_number, container_number, seawaybill_number, vessel_name,
    flight_number, driver_name, driver_phone,
    items,
  } = req.body
  const client = await db.connect()
  try {
    await client.query('BEGIN')

    // Ensure columns exist (idempotent migration)
    await client.query(`
      ALTER TABLE sales_orders
        ADD COLUMN IF NOT EXISTS invoice_no TEXT,
        ADD COLUMN IF NOT EXISTS lot_no     TEXT
    `)

    // Ensure items table exists
    await client.query(`
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
    await client.query(`ALTER TABLE sales_order_items ADD COLUMN IF NOT EXISTS sell_by TEXT DEFAULT 'box'`)

    const firstItem = Array.isArray(items) && items.length > 0 ? items[0] : null
    const effProductId    = (firstItem?.product_id) || product_id
    const effVariety      = (firstItem?.variety)    || variety
    const effCaliber      = (firstItem?.caliber)    || caliber
    const effOrigin       = (firstItem?.origin)     || origin
    const effQty          = (firstItem?.quantity_kg)    || quantity_kg
    const effPrice        = (firstItem?.price_per_unit) || price_per_unit
    const effBoxType      = (firstItem?.box_type)       || box_type
    const effBoxWeight    = (firstItem?.box_weight_kg)  || box_weight_kg

    const { rows } = await client.query(`
      UPDATE sales_orders SET
        sales_type=$1, sa_number=$2, invoice_no=$3, lot_no=$4,
        customer_id=$5, product_id=$6, variety=$7, caliber=$8, origin=$9,
        quantity_kg=$10, price_per_unit=$11, currency=$12,
        payment_method=$13, payment_term=$14, incoterm=$15,
        port_loading=$16, port_discharge=$17, dest_country=$18,
        transit_entry=$19, transit_exit=$20,
        shipment_date=$21, delivery_date=$22, etd=$23, eta=$24,
        transport_mode=$25, box_type=$26, box_weight_kg=$27, pallets=$28,
        quality_notes=$29, required_docs=$30, notes=$31, status=$32,
        tracking_number=$34, container_number=$35, seawaybill_number=$36, vessel_name=$37,
        flight_number=$38, driver_name=$39, driver_phone=$40
      WHERE id=$33
      RETURNING *
    `, [
      sales_type || 'ihracat', sa_number || null, invoice_no || null, lot_no || null,
      customer_id, effProductId, effVariety, effCaliber || null, effOrigin,
      effQty, effPrice, currency,
      payment_method, payment_term, incoterm,
      port_loading, port_discharge, dest_country || null,
      transit_entry || null, transit_exit || null,
      shipment_date || null, delivery_date || null, etd || null, eta || null,
      transport_mode, effBoxType, effBoxWeight || null, pallets || null,
      quality_notes, JSON.stringify(required_docs || {}), notes, status,
      req.params.id,
      tracking_number || null, container_number || null, seawaybill_number || null, vessel_name || null,
      flight_number || null, driver_name || null, driver_phone || null,
    ])
    if (!rows[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Bulunamadı' }) }

    await upsertItems(client, rows[0].id, items)
    await client.query('COMMIT')
    res.json(rows[0])
  } catch (e) {
    await client.query('ROLLBACK')
    console.error(e); res.status(500).json({ error: 'Sunucu hatası' })
  } finally {
    client.release()
  }
})

// PATCH /sales-orders/:id/status
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body
  try {
    const { rows } = await db.query(
      'UPDATE sales_orders SET status=$1 WHERE id=$2 RETURNING *',
      [status, req.params.id]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Bulunamadı' })
    res.json(rows[0])
  } catch (e) { console.error(e); res.status(500).json({ error: 'Sunucu hatası' }) }
})

// DELETE /sales-orders/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM sales_orders WHERE id=$1', [req.params.id])
    res.json({ ok: true })
  } catch (e) { console.error(e); res.status(500).json({ error: 'Sunucu hatası' }) }
})

module.exports = router
