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
    customer_id, product_id, variety, caliber, origin,
    quantity_kg, price_per_unit, currency,
    payment_method, payment_term, incoterm,
    port_loading, port_discharge, shipment_date, delivery_date,
    transport_mode, box_type, box_weight_kg, pallets,
    quality_notes, required_docs, notes, status,
    tracking_number, container_number, seawaybill_number, vessel_name,
    flight_number, driver_name, driver_phone,
  } = req.body
  try {
    const { rows } = await db.query(`
      INSERT INTO sales_orders
        (customer_id, product_id, variety, caliber, origin,
         quantity_kg, price_per_unit, currency,
         payment_method, payment_term, incoterm,
         port_loading, port_discharge, shipment_date, delivery_date,
         transport_mode, box_type, box_weight_kg, pallets,
         quality_notes, required_docs, notes, status, created_by,
         tracking_number, container_number, seawaybill_number, vessel_name,
         flight_number, driver_name, driver_phone)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31)
      RETURNING *
    `, [customer_id, product_id, variety, caliber || null, origin,
        quantity_kg, price_per_unit, currency || 'USD',
        payment_method, payment_term, incoterm,
        port_loading, port_discharge, shipment_date || null, delivery_date || null,
        transport_mode, box_type, box_weight_kg || null, pallets || null,
        quality_notes, JSON.stringify(required_docs || {}), notes,
        status || 'draft', req.session.userId,
        tracking_number || null, container_number || null, seawaybill_number || null, vessel_name || null,
        flight_number || null, driver_name || null, driver_phone || null])
    res.status(201).json(rows[0])
  } catch (e) { console.error(e); res.status(500).json({ error: 'Sunucu hatası' }) }
})

// PUT /sales-orders/:id
router.put('/:id', async (req, res) => {
  const {
    customer_id, product_id, variety, caliber, origin,
    quantity_kg, price_per_unit, currency,
    payment_method, payment_term, incoterm,
    port_loading, port_discharge, shipment_date, delivery_date,
    transport_mode, box_type, box_weight_kg, pallets,
    quality_notes, required_docs, notes, status,
    tracking_number, container_number, seawaybill_number, vessel_name,
    flight_number, driver_name, driver_phone,
  } = req.body
  try {
    const { rows } = await db.query(`
      UPDATE sales_orders SET
        customer_id=$1, product_id=$2, variety=$3, caliber=$4, origin=$5,
        quantity_kg=$6, price_per_unit=$7, currency=$8,
        payment_method=$9, payment_term=$10, incoterm=$11,
        port_loading=$12, port_discharge=$13, shipment_date=$14, delivery_date=$15,
        transport_mode=$16, box_type=$17, box_weight_kg=$18, pallets=$19,
        quality_notes=$20, required_docs=$21, notes=$22, status=$23,
        tracking_number=$25, container_number=$26, seawaybill_number=$27, vessel_name=$28,
        flight_number=$29, driver_name=$30, driver_phone=$31
      WHERE id=$24
      RETURNING *
    `, [customer_id, product_id, variety, caliber || null, origin,
        quantity_kg, price_per_unit, currency,
        payment_method, payment_term, incoterm,
        port_loading, port_discharge, shipment_date || null, delivery_date || null,
        transport_mode, box_type, box_weight_kg || null, pallets || null,
        quality_notes, JSON.stringify(required_docs || {}), notes, status,
        req.params.id,
        tracking_number || null, container_number || null, seawaybill_number || null, vessel_name || null,
        flight_number || null, driver_name || null, driver_phone || null])
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
