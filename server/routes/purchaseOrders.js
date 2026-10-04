const router = require('express').Router()
const db = require('../db')
const { requireAuth } = require('../middleware/auth')

router.use(requireAuth)

// GET /purchase-orders
router.get('/', async (req, res) => {
  const { status, search } = req.query
  try {
    let q = `
      SELECT po.*, s.name AS supplier_name, p.name AS product_name
      FROM purchase_orders po
      LEFT JOIN suppliers s ON s.id = po.supplier_id
      LEFT JOIN products  p ON p.id = po.product_id
      WHERE 1=1
    `
    const params = []
    if (status) { params.push(status); q += ` AND po.status = $${params.length}` }
    if (search) {
      params.push(`%${search}%`)
      q += ` AND (po.party_no ILIKE $${params.length} OR s.name ILIKE $${params.length})`
    }
    q += ' ORDER BY po.created_at DESC'
    const { rows } = await db.query(q, params)
    res.json(rows)
  } catch (e) { console.error(e); res.status(500).json({ error: 'Sunucu hatası' }) }
})

// GET /purchase-orders/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT po.*, s.name AS supplier_name, p.name AS product_name
      FROM purchase_orders po
      LEFT JOIN suppliers s ON s.id = po.supplier_id
      LEFT JOIN products  p ON p.id = po.product_id
      WHERE po.id = $1
    `, [req.params.id])
    if (!rows[0]) return res.status(404).json({ error: 'Bulunamadı' })

    const links = await db.query(`
      SELECT ol.*, so.party_no AS so_party_no, c.name AS customer_name
      FROM order_links ol
      JOIN sales_orders so ON so.id = ol.sales_order_id
      JOIN customers c ON c.id = so.customer_id
      WHERE ol.purchase_order_id = $1
    `, [req.params.id])

    res.json({ ...rows[0], links: links.rows })
  } catch (e) { console.error(e); res.status(500).json({ error: 'Sunucu hatası' }) }
})

// POST /purchase-orders
router.post('/', async (req, res) => {
  const {
    supplier_id, product_id, variety, origin,
    quantity_kg, price_per_unit, currency,
    payment_method, payment_term, incoterm,
    port_loading, port_discharge, shipment_date, delivery_date,
    transport_mode, box_type, box_weight_kg, pallets,
    quality_notes, required_docs, notes, status,
  } = req.body
  try {
    const { rows } = await db.query(`
      INSERT INTO purchase_orders
        (supplier_id, product_id, variety, origin,
         quantity_kg, price_per_unit, currency,
         payment_method, payment_term, incoterm,
         port_loading, port_discharge, shipment_date, delivery_date,
         transport_mode, box_type, box_weight_kg, pallets,
         quality_notes, required_docs, notes, status, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
      RETURNING *
    `, [supplier_id, product_id, variety, origin,
        quantity_kg, price_per_unit, currency || 'USD',
        payment_method, payment_term, incoterm,
        port_loading, port_discharge, shipment_date || null, delivery_date || null,
        transport_mode, box_type, box_weight_kg || null, pallets || null,
        quality_notes, JSON.stringify(required_docs || {}), notes,
        status || 'draft', req.session.userId])
    res.status(201).json(rows[0])
  } catch (e) { console.error(e); res.status(500).json({ error: 'Sunucu hatası' }) }
})

// PUT /purchase-orders/:id
router.put('/:id', async (req, res) => {
  const {
    supplier_id, product_id, variety, origin,
    quantity_kg, price_per_unit, currency,
    payment_method, payment_term, incoterm,
    port_loading, port_discharge, shipment_date, delivery_date,
    transport_mode, box_type, box_weight_kg, pallets,
    quality_notes, required_docs, notes, status,
  } = req.body
  try {
    const { rows } = await db.query(`
      UPDATE purchase_orders SET
        supplier_id=$1, product_id=$2, variety=$3, origin=$4,
        quantity_kg=$5, price_per_unit=$6, currency=$7,
        payment_method=$8, payment_term=$9, incoterm=$10,
        port_loading=$11, port_discharge=$12, shipment_date=$13, delivery_date=$14,
        transport_mode=$15, box_type=$16, box_weight_kg=$17, pallets=$18,
        quality_notes=$19, required_docs=$20, notes=$21, status=$22
      WHERE id=$23
      RETURNING *
    `, [supplier_id, product_id, variety, origin,
        quantity_kg, price_per_unit, currency,
        payment_method, payment_term, incoterm,
        port_loading, port_discharge, shipment_date || null, delivery_date || null,
        transport_mode, box_type, box_weight_kg || null, pallets || null,
        quality_notes, JSON.stringify(required_docs || {}), notes, status,
        req.params.id])
    if (!rows[0]) return res.status(404).json({ error: 'Bulunamadı' })
    res.json(rows[0])
  } catch (e) { console.error(e); res.status(500).json({ error: 'Sunucu hatası' }) }
})

// PATCH /purchase-orders/:id/status
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body
  try {
    const { rows } = await db.query(
      'UPDATE purchase_orders SET status=$1 WHERE id=$2 RETURNING *',
      [status, req.params.id]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Bulunamadı' })
    res.json(rows[0])
  } catch (e) { console.error(e); res.status(500).json({ error: 'Sunucu hatası' }) }
})

// DELETE /purchase-orders/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM purchase_orders WHERE id=$1', [req.params.id])
    res.json({ ok: true })
  } catch (e) { console.error(e); res.status(500).json({ error: 'Sunucu hatası' }) }
})

module.exports = router
