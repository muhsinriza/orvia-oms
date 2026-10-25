const express = require('express')
const router  = express.Router()
const db      = require('../db')
const { requireAuth } = require('../middleware/auth')

// List ALL credit notes (no filter) — for the standalone page
router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT cn.*,
             so.lot_no, so.party_no,
             c.name AS customer_name_linked
      FROM credit_notes cn
      LEFT JOIN sales_orders so ON so.id = cn.sales_order_id
      LEFT JOIN customers    c  ON c.id  = so.customer_id
      ORDER BY cn.created_at DESC
    `)
    res.json(rows)
  } catch (e) {
    console.error('credit notes list error:', e.message)
    res.status(500).json({ error: e.message })
  }
})

// List credit notes for a specific sales order
router.get('/order/:salesOrderId', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM credit_notes WHERE sales_order_id = $1 ORDER BY created_at DESC`,
      [req.params.salesOrderId]
    )
    res.json(rows)
  } catch (e) {
    console.error('credit notes list error:', e.message)
    res.status(500).json({ error: e.message })
  }
})

// Create a credit note (sales_order_id is optional for manual/standalone notes)
router.post('/', requireAuth, async (req, res) => {
  const { sales_order_id, customer_name, customer_address, order_ref, reason, amount, currency, description } = req.body
  if (!reason || !amount) {
    return res.status(400).json({ error: 'reason ve amount zorunludur' })
  }
  try {
    const year = new Date().getFullYear()
    const seq  = await db.query(`SELECT nextval('credit_note_seq') AS n`)
    const cn_number = `CN-${year}-${String(seq.rows[0].n).padStart(4, '0')}`

    const { rows } = await db.query(
      `INSERT INTO credit_notes (sales_order_id, cn_number, reason, amount, currency, description, customer_name, customer_address, order_ref)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        sales_order_id    || null,
        cn_number,
        reason,
        Number(amount),
        currency          || 'USD',
        description       || null,
        customer_name     || null,
        customer_address  || null,
        order_ref         || null,
      ]
    )
    res.json(rows[0])
  } catch (e) {
    console.error('credit note create error:', e.message)
    res.status(500).json({ error: e.message })
  }
})

// Delete a credit note
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await db.query(`DELETE FROM credit_notes WHERE id = $1`, [req.params.id])
    res.json({ ok: true })
  } catch (e) {
    console.error('credit note delete error:', e.message)
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
