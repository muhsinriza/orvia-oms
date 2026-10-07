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
    purchase_type,
    supplier_id, product_id, variety, caliber, origin,
    origin_country, customs_ref,
    quantity_kg, price_per_unit, currency,
    payment_method, payment_term, incoterm,
    port_loading, port_discharge,
    shipment_date, arrival_date, etd, eta,
    transport_type,
    box_type, net_weight_box, boxes_per_pallet, total_pallets, pallet_type,
    grade, size_range, quality_notes, required_documents, special_notes,
    notes, status,
    tracking_number, container_number, seawaybill_number, vessel_name,
    flight_number, driver_name, driver_phone,
  } = req.body
  try {
    const { rows } = await db.query(`
      INSERT INTO purchase_orders
        (purchase_type, supplier_id, product_id, variety, caliber, origin,
         origin_country, customs_ref,
         quantity_kg, price_per_unit, currency,
         payment_method, payment_term, incoterm,
         port_loading, port_discharge,
         shipment_date, arrival_date, etd, eta,
         transport_type,
         box_type, net_weight_box, boxes_per_pallet, total_pallets, pallet_type,
         grade, size_range, quality_notes, required_docs, special_notes,
         notes, status, created_by,
         tracking_number, container_number, seawaybill_number, vessel_name,
         flight_number, driver_name, driver_phone)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41)
      RETURNING *
    `, [
      purchase_type || 'ithalat',
      supplier_id, product_id, variety, caliber || null, origin,
      origin_country || null, customs_ref || null,
      quantity_kg, price_per_unit, currency || 'USD',
      payment_method, payment_term, incoterm,
      port_loading, port_discharge,
      shipment_date || null, arrival_date || null, etd || null, eta || null,
      transport_type || null,
      box_type, net_weight_box || null, boxes_per_pallet || null, total_pallets || null, pallet_type || null,
      grade || null, size_range || null, quality_notes,
      JSON.stringify(required_documents || required_docs || {}),
      special_notes || null,
      notes, status || 'draft', req.session.userId,
      tracking_number || null, container_number || null, seawaybill_number || null, vessel_name || null,
      flight_number || null, driver_name || null, driver_phone || null,
    ])
    res.status(201).json(rows[0])
  } catch (e) { console.error(e); res.status(500).json({ error: 'Sunucu hatası', detail: e.message }) }
})

// PUT /purchase-orders/:id
router.put('/:id', async (req, res) => {
  const {
    purchase_type,
    supplier_id, product_id, variety, caliber, origin,
    origin_country, customs_ref,
    quantity_kg, price_per_unit, currency,
    payment_method, payment_term, incoterm,
    port_loading, port_discharge,
    shipment_date, arrival_date, etd, eta,
    transport_type,
    box_type, net_weight_box, boxes_per_pallet, total_pallets, pallet_type,
    grade, size_range, quality_notes, required_documents, special_notes,
    notes, status,
    tracking_number, container_number, seawaybill_number, vessel_name,
    flight_number, driver_name, driver_phone,
  } = req.body
  try {
    const { rows } = await db.query(`
      UPDATE purchase_orders SET
        purchase_type=$1, supplier_id=$2, product_id=$3, variety=$4, caliber=$5, origin=$6,
        origin_country=$7, customs_ref=$8,
        quantity_kg=$9, price_per_unit=$10, currency=$11,
        payment_method=$12, payment_term=$13, incoterm=$14,
        port_loading=$15, port_discharge=$16,
        shipment_date=$17, arrival_date=$18, etd=$19, eta=$20,
        transport_type=$21,
        box_type=$22, net_weight_box=$23, boxes_per_pallet=$24, total_pallets=$25, pallet_type=$26,
        grade=$27, size_range=$28, quality_notes=$29, required_docs=$30, special_notes=$31,
        notes=$32, status=$33,
        tracking_number=$35, container_number=$36, seawaybill_number=$37, vessel_name=$38,
        flight_number=$39, driver_name=$40, driver_phone=$41
      WHERE id=$34
      RETURNING *
    `, [
      purchase_type || 'ithalat',
      supplier_id, product_id, variety, caliber || null, origin,
      origin_country || null, customs_ref || null,
      quantity_kg, price_per_unit, currency,
      payment_method, payment_term, incoterm,
      port_loading, port_discharge,
      shipment_date || null, arrival_date || null, etd || null, eta || null,
      transport_type || null,
      box_type, net_weight_box || null, boxes_per_pallet || null, total_pallets || null, pallet_type || null,
      grade || null, size_range || null, quality_notes,
      JSON.stringify(required_documents || required_docs || {}),
      special_notes || null,
      notes, status,
      req.params.id,
      tracking_number || null, container_number || null, seawaybill_number || null, vessel_name || null,
      flight_number || null, driver_name || null, driver_phone || null,
    ])
    if (!rows[0]) return res.status(404).json({ error: 'Bulunamadı' })
    res.json(rows[0])
  } catch (e) { console.error(e); res.status(500).json({ error: 'Sunucu hatası', detail: e.message }) }
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
