const express = require('express')
const router  = express.Router()
const db      = require('../db')
const { requireAuth } = require('./auth')

// List credit notes for a sales order
router.get('/:salesOrderId', requireAuth, async (req, res) => {
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

// Create a credit note
router.post('/', requireAuth, async (req, res) => {
  const { sales_order_id, reason, amount, currency, description } = req.body
  if (!sales_order_id || !reason || !amount) {
    return res.status(400).json({ error: 'sales_order_id, reason ve amount zorunludur' })
  }
  try {
    const year = new Date().getFullYear()
    const seq  = await db.query(`SELECT nextval('credit_note_seq') AS n`)
    const cn_number = `CN-${year}-${String(seq.rows[0].n).padStart(4, '0')}`

    const { rows } = await db.query(
      `INSERT INTO credit_notes (sales_order_id, cn_number, reason, amount, currency, description)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [sales_order_id, cn_number, reason, Number(amount), currency || 'USD', description || null]
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
