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

    res.json({ ...rows[0], links: links.rows })
  } catch (e) { console.error(e); res.status(500).json({ error: 'Sunucu hatası' }) }
})

// POST /sales-orders
router.post('/', async (req, res) => {
  const {
    sales_type, sa_number,
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
  } = req.body
  try {
    // Ensure columns exist (idempotent migration)
    await db.query(`
      ALTER TABLE sales_orders
        ADD COLUMN IF NOT EXISTS sales_type    TEXT DEFAULT 'ihracat',
        ADD COLUMN IF NOT EXISTS sa_number     TEXT,
        ADD COLUMN IF NOT EXISTS dest_country  TEXT,
        ADD COLUMN IF NOT EXISTS transit_entry TEXT,
        ADD COLUMN IF NOT EXISTS transit_exit  TEXT
    `)

    const { rows } = await db.query(`
      INSERT INTO sales_orders
        (sales_type, sa_number,
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
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38)
      RETURNING *
    `, [
      sales_type || 'ihracat', sa_number || null,
      customer_id, product_id, variety, caliber || null, origin,
      quantity_kg, price_per_unit, currency || 'USD',
      payment_method, payment_term, incoterm,
      port_loading, port_discharge, dest_country || null,
      transit_entry || null, transit_exit || null,
      shipment_date || null, delivery_date || null, etd || null, eta || null,
      transport_mode, box_type, box_weight_kg || null, pallets || null,
      quality_notes, JSON.stringify(required_docs || {}), notes,
      status || 'draft', req.session.userId,
      tracking_number || null, container_number || null, seawaybill_number || null, vessel_name || null,
      flight_number || null, driver_name || null, driver_phone || null,
    ])
    res.status(201).json(rows[0])
  } catch (e) { console.error(e); res.status(500).json({ error: 'Sunucu hatası' }) }
})

// PUT /sales-orders/:id
router.put('/:id', async (req, res) => {
  const {
    sales_type, sa_number,
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
  } = req.body
  try {
    const { rows } = await db.query(`
      UPDATE sales_orders SET
        sales_type=$1, sa_number=$2,
        customer_id=$3, product_id=$4, variety=$5, caliber=$6, origin=$7,
        quantity_kg=$8, price_per_unit=$9, currency=$10,
        payment_method=$11, payment_term=$12, incoterm=$13,
        port_loading=$14, port_discharge=$15, dest_country=$16,
        transit_entry=$17, transit_exit=$18,
        shipment_date=$19, delivery_date=$20, etd=$21, eta=$22,
        transport_mode=$23, box_type=$24, box_weight_kg=$25, pallets=$26,
        quality_notes=$27, required_docs=$28, notes=$29, status=$30,
        tracking_number=$32, container_number=$33, seawaybill_number=$34, vessel_name=$35,
        flight_number=$36, driver_name=$37, driver_phone=$38
      WHERE id=$31
      RETURNING *
    `, [
      sales_type || 'ihracat', sa_number || null,
      customer_id, product_id, variety, caliber || null, origin,
      quantity_kg, price_per_unit, currency,
      payment_method, payment_term, incoterm,
      port_loading, port_discharge, dest_country || null,
      transit_entry || null, transit_exit || null,
      shipment_date || null, delivery_date || null, etd || null, eta || null,
      transport_mode, box_type, box_weight_kg || null, pallets || null,
      quality_notes, JSON.stringify(required_docs || {}), notes, status,
      req.params.id,
      tracking_number || null, container_number || null, seawaybill_number || null, vessel_name || null,
      flight_number || null, driver_name || null, driver_phone || null,
    ])
    if (!rows[0]) return res.status(404).json({ error: 'Bulunamadı' })
    res.json(rows[0])
  } catch (e) { console.error(e); res.status(500).json({ error: 'Sunucu hatası' }) }
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
