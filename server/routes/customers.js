const router = require('express').Router()
const db = require('../db')
const { requireAuth } = require('../middleware/auth')

router.use(requireAuth)

router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM customers ORDER BY name')
    res.json(rows)
  } catch (e) { console.error(e); res.status(500).json({ error: 'Sunucu hatası' }) }
})

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM customers WHERE id=$1', [req.params.id])
    if (!rows[0]) return res.status(404).json({ error: 'Bulunamadı' })
    res.json(rows[0])
  } catch (e) { console.error(e); res.status(500).json({ error: 'Sunucu hatası' }) }
})

router.post('/', async (req, res) => {
  const { name, country, city, address, contact_name, email, phone, tax_number, notes, gst_no, iec_no, pan_no, fssai_no } = req.body
  if (!name) return res.status(400).json({ error: 'İsim zorunlu' })
  try {
    const { rows } = await db.query(
      `INSERT INTO customers (name,country,city,address,contact_name,email,phone,tax_number,notes,gst_no,iec_no,pan_no,fssai_no)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [name, country, city, address, contact_name, email, phone, tax_number, notes, gst_no||null, iec_no||null, pan_no||null, fssai_no||null]
    )
    res.status(201).json(rows[0])
  } catch (e) { console.error(e); res.status(500).json({ error: 'Sunucu hatası' }) }
})

router.put('/:id', async (req, res) => {
  const { name, country, city, address, contact_name, email, phone, tax_number, notes, gst_no, iec_no, pan_no, fssai_no } = req.body
  if (!name) return res.status(400).json({ error: 'İsim zorunlu' })
  try {
    const { rows } = await db.query(
      `UPDATE customers SET name=$1,country=$2,city=$3,address=$4,contact_name=$5,
       email=$6,phone=$7,tax_number=$8,notes=$9,gst_no=$10,iec_no=$11,pan_no=$12,fssai_no=$13
       WHERE id=$14 RETURNING *`,
      [name, country, city, address, contact_name, email, phone, tax_number, notes, gst_no||null, iec_no||null, pan_no||null, fssai_no||null, req.params.id]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Bulunamadı' })
    res.json(rows[0])
  } catch (e) { console.error(e); res.status(500).json({ error: 'Sunucu hatası' }) }
})

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM customers WHERE id=$1', [req.params.id])
    res.json({ ok: true })
  } catch (e) {
    console.error(e)
    if (e.code === '23503') return res.status(409).json({ error: 'Bu müşteriye ait siparişler var, önce siparişleri silin' })
    res.status(500).json({ error: 'Sunucu hatası' })
  }
})

module.exports = router
