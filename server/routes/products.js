const router = require('express').Router()
const db = require('../db')
const { requireAuth, requireRole } = require('../middleware/auth')

router.use(requireAuth)

router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM products ORDER BY name')
    res.json(rows)
  } catch (e) { console.error(e); res.status(500).json({ error: 'Sunucu hatası' }) }
})

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM products WHERE id=$1', [req.params.id])
    if (!rows[0]) return res.status(404).json({ error: 'Bulunamadı' })
    res.json(rows[0])
  } catch (e) { console.error(e); res.status(500).json({ error: 'Sunucu hatası' }) }
})

router.post('/', requireRole('admin'), async (req, res) => {
  const { name, variety, category, unit, is_active, notes } = req.body
  if (!name) return res.status(400).json({ error: 'İsim zorunlu' })
  try {
    const { rows } = await db.query(
      `INSERT INTO products (name,variety,category,unit,is_active,notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, variety, category, unit || 'kg', is_active !== false, notes]
    )
    res.status(201).json(rows[0])
  } catch (e) { console.error(e); res.status(500).json({ error: 'Sunucu hatası' }) }
})

router.put('/:id', requireRole('admin'), async (req, res) => {
  const { name, variety, category, unit, is_active, notes } = req.body
  if (!name) return res.status(400).json({ error: 'İsim zorunlu' })
  try {
    const { rows } = await db.query(
      `UPDATE products SET name=$1,variety=$2,category=$3,unit=$4,is_active=$5,notes=$6
       WHERE id=$7 RETURNING *`,
      [name, variety, category, unit, is_active, notes, req.params.id]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Bulunamadı' })
    res.json(rows[0])
  } catch (e) { console.error(e); res.status(500).json({ error: 'Sunucu hatası' }) }
})

router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM products WHERE id=$1', [req.params.id])
    res.json({ ok: true })
  } catch (e) { console.error(e); res.status(500).json({ error: 'Sunucu hatası' }) }
})

module.exports = router
