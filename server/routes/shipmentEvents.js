const router = require('express').Router()
const db = require('../db')
const { requireAuth } = require('../middleware/auth')

router.use(requireAuth)

// GET /shipment-events/:orderType/:orderId
router.get('/:orderType/:orderId', async (req, res) => {
  const { orderType, orderId } = req.params
  if (!['purchase', 'sales'].includes(orderType)) {
    return res.status(400).json({ error: 'Geçersiz sipariş tipi' })
  }
  try {
    const { rows } = await db.query(`
      SELECT se.*, p.full_name AS created_by_name
      FROM shipment_events se
      LEFT JOIN profiles p ON p.id = se.created_by
      WHERE se.order_type = $1 AND se.order_id = $2
      ORDER BY se.event_date DESC, se.created_at DESC
    `, [orderType, orderId])
    res.json(rows)
  } catch (e) { console.error(e); res.status(500).json({ error: 'Sunucu hatası' }) }
})

// POST /shipment-events
router.post('/', async (req, res) => {
  const { order_type, order_id, event_date, event_type, title, description, location } = req.body
  if (!['purchase', 'sales'].includes(order_type)) {
    return res.status(400).json({ error: 'Geçersiz sipariş tipi' })
  }
  try {
    const { rows } = await db.query(`
      INSERT INTO shipment_events
        (order_type, order_id, event_date, event_type, title, description, location, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [order_type, order_id, event_date || new Date(), event_type || 'note',
        title, description || null, location || null, req.session.userId])
    res.status(201).json(rows[0])
  } catch (e) { console.error(e); res.status(500).json({ error: 'Sunucu hatası' }) }
})

// DELETE /shipment-events/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM shipment_events WHERE id=$1', [req.params.id])
    res.json({ ok: true })
  } catch (e) { console.error(e); res.status(500).json({ error: 'Sunucu hatası' }) }
})

module.exports = router
