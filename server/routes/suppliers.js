const router = require('express').Router()
const db = require('../db')
const { requireAuth } = require('../middleware/auth')

router.use(requireAuth)

router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM suppliers ORDER BY name')
    res.json(rows)
  } catch (e) { console.error(e); res.status(500).json({ error: 'Sunucu hatası' }) }
})

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM suppliers WHERE id=$1', [req.params.id])
    if (!rows[0]) return res.status(404).json({ error: 'Bulunamadı' })
    res.json(rows[0])
  } catch (e) { console.error(e); res.status(500).json({ error: 'Sunucu hatası' }) }
})

router.post('/', async (req, res) => {
  const { name, country, city, address, contact_name, email, phone, tax_number, notes } = req.body
  if (!name) return res.status(400).json({ error: 'İsim zorunlu' })
  try {
    const { rows } = await db.query(
      `INSERT INTO suppliers (name,country,city,address,contact_name,email,phone,tax_number,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [name, country, city, address, contact_name, email, phone, tax_number, notes]
    )
    res.status(201).json(rows[0])
  } catch (e) { console.error(e); res.status(500).json({ error: 'Sunucu hatası' }) }
})

router.put('/:id', async (req, res) => {
  const { name, country, city, address, contact_name, email, phone, tax_number, notes } = req.body
  if (!name) return res.status(400).json({ error: 'İsim zorunlu' })
  try {
    const { rows } = await db.query(
      `UPDATE suppliers SET name=$1,country=$2,city=$3,address=$4,contact_name=$5,
       email=$6,phone=$7,tax_number=$8,notes=$9 WHERE id=$10 RETURNING *`,
      [name, country, city, address, contact_name, email, phone, tax_number, notes, req.params.id]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Bulunamadı' })
    res.json(rows[0])
  } catch (e) { console.error(e); res.status(500).json({ error: 'Sunucu hatası' }) }
})

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM suppliers WHERE id=$1', [req.params.id])
    res.json({ ok: true })
  } catch (e) {
    console.error(e)
    if (e.code === '23503') return res.status(409).json({ error: 'Bu tedarikçiye ait siparişler var, önce siparişleri silin' })
    res.status(500).json({ error: 'Sunucu hatası' })
  }
})

module.exports = router
