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
  const { name, variety, category, unit, is_active, notes,
          default_origin, box_type,
          box_net_kg, box_gross_kg, units_per_box, boxes_per_pallet } = req.body
  if (!name) return res.status(400).json({ error: 'İsim zorunlu' })
  try {
    await db.query(`
      ALTER TABLE products
        ADD COLUMN IF NOT EXISTS default_origin TEXT,
        ADD COLUMN IF NOT EXISTS box_type       TEXT
    `)
    const { rows } = await db.query(
      `INSERT INTO products (name,variety,category,unit,is_active,notes,
         default_origin,box_type,box_net_kg,box_gross_kg,units_per_box,boxes_per_pallet)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [name, variety, category, unit || 'kg', is_active !== false, notes,
       default_origin || null, box_type || null,
       box_net_kg || null, box_gross_kg || null, units_per_box || null, boxes_per_pallet || null]
    )
    res.status(201).json(rows[0])
  } catch (e) { console.error(e); res.status(500).json({ error: 'Sunucu hatası' }) }
})

router.put('/:id', requireRole('admin'), async (req, res) => {
  const { name, variety, category, unit, is_active, notes,
          default_origin, box_type,
          box_net_kg, box_gross_kg, units_per_box, boxes_per_pallet } = req.body
  if (!name) return res.status(400).json({ error: 'İsim zorunlu' })
  try {
    await db.query(`
      ALTER TABLE products
        ADD COLUMN IF NOT EXISTS default_origin TEXT,
        ADD COLUMN IF NOT EXISTS box_type       TEXT
    `)
    const { rows } = await db.query(
      `UPDATE products SET name=$1,variety=$2,category=$3,unit=$4,is_active=$5,notes=$6,
         default_origin=$7,box_type=$8,
         box_net_kg=$9,box_gross_kg=$10,units_per_box=$11,boxes_per_pallet=$12
       WHERE id=$13 RETURNING *`,
      [name, variety, category, unit, is_active, notes,
       default_origin || null, box_type || null,
       box_net_kg || null, box_gross_kg || null, units_per_box || null, boxes_per_pallet || null,
       req.params.id]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Bulunamadı' })
    res.json(rows[0])
  } catch (e) { console.error(e); res.status(500).json({ error: 'Sunucu hatası' }) }
})

router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM products WHERE id=$1', [req.params.id])
    res.json({ ok: true })
  } catch (e) {
    console.error(e)
    if (e.code === '23503') return res.status(409).json({ error: 'Bu ürün siparişlerde kullanılıyor, silinemez' })
    res.status(500).json({ error: 'Sunucu hatası' })
  }
})

module.exports = router
