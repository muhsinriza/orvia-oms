const router = require('express').Router()
const db = require('../db')
const { requireAuth } = require('../middleware/auth')

router.use(requireAuth)

// GET /order-links/sales/:so_id
router.get('/sales/:so_id', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT ol.*, po.party_no AS po_party_no, s.name AS supplier_name
      FROM order_links ol
      JOIN purchase_orders po ON po.id = ol.purchase_order_id
      JOIN suppliers s ON s.id = po.supplier_id
      WHERE ol.sales_order_id = $1
      ORDER BY ol.created_at
    `, [req.params.so_id])
    res.json(rows)
  } catch (e) { console.error(e); res.status(500).json({ error: 'Sunucu hatası' }) }
})

// POST /order-links
router.post('/', async (req, res) => {
  const { sales_order_id, purchase_order_id, linked_kg } = req.body
  if (!sales_order_id || !purchase_order_id || !linked_kg) {
    return res.status(400).json({ error: 'sales_order_id, purchase_order_id ve linked_kg zorunlu' })
  }
  try {
    const { rows } = await db.query(
      `INSERT INTO order_links (sales_order_id, purchase_order_id, linked_kg)
       VALUES ($1,$2,$3) RETURNING *`,
      [sales_order_id, purchase_order_id, linked_kg]
    )
    res.status(201).json(rows[0])
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Bu bağlantı zaten mevcut' })
    console.error(e); res.status(500).json({ error: 'Sunucu hatası' })
  }
})

// DELETE /order-links/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM order_links WHERE id=$1', [req.params.id])
    res.json({ ok: true })
  } catch (e) { console.error(e); res.status(500).json({ error: 'Sunucu hatası' }) }
})

module.exports = router
