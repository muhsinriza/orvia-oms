const router = require('express').Router()
const db = require('../db')
const { requireAuth } = require('../middleware/auth')

router.get('/', requireAuth, async (req, res) => {
  try {
    const [stats, recentPO, recentSO, shipments] = await Promise.all([
      db.query(`
        SELECT
          (SELECT COUNT(*) FROM purchase_orders WHERE created_at >= date_trunc('month', now())) AS po_count,
          (SELECT COUNT(*) FROM sales_orders    WHERE created_at >= date_trunc('month', now())) AS so_count,
          (SELECT COUNT(*) FROM purchase_orders  WHERE status = 'in_transit') +
          (SELECT COUNT(*) FROM sales_orders     WHERE status = 'in_transit') AS in_transit,
          (SELECT COUNT(*) FROM purchase_orders  WHERE status = 'completed') +
          (SELECT COUNT(*) FROM sales_orders     WHERE status IN ('completed','delivered')) AS completed
      `),
      db.query(`
        SELECT po.id, po.party_no, po.status, po.created_at,
               s.name AS party_name, p.name AS product_name,
               'purchase' AS type
        FROM purchase_orders po
        LEFT JOIN suppliers s ON s.id = po.supplier_id
        LEFT JOIN products  p ON p.id = po.product_id
        ORDER BY po.created_at DESC LIMIT 5
      `),
      db.query(`
        SELECT so.id, so.party_no, so.status, so.created_at,
               c.name AS party_name, p.name AS product_name,
               'sales' AS type
        FROM sales_orders so
        LEFT JOIN customers c ON c.id = so.customer_id
        LEFT JOIN products  p ON p.id = so.product_id
        ORDER BY so.created_at DESC LIMIT 5
      `),
      // Aktif sevkiyatlar (in_transit + confirmed + eta olan tümü)
      db.query(`
        SELECT id, party_no, status, eta, etd,
               (SELECT name FROM suppliers WHERE id = supplier_id) AS party_name,
               (SELECT name FROM products  WHERE id = product_id)  AS product_name,
               'purchase' AS type
        FROM purchase_orders
        WHERE status NOT IN ('completed','cancelled') AND eta IS NOT NULL
        UNION ALL
        SELECT id, party_no, status, eta, etd,
               (SELECT name FROM customers WHERE id = customer_id) AS party_name,
               (SELECT name FROM products  WHERE id = product_id)  AS product_name,
               'sales' AS type
        FROM sales_orders
        WHERE status NOT IN ('completed','delivered','cancelled') AND eta IS NOT NULL
        ORDER BY eta ASC
      `),
    ])

    const recent = [...recentPO.rows, ...recentSO.rows]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10)

    res.json({ stats: stats.rows[0], recent, shipments: shipments.rows })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Sunucu hatası' })
  }
})

module.exports = router
