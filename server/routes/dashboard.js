const router = require('express').Router()
const db = require('../db')
const { requireAuth } = require('../middleware/auth')

router.use(requireAuth)

router.get('/', async (req, res) => {
  try {
    const [stats, financial, recentPO, recentSO, shipments, topProducts] = await Promise.all([

      // Operasyonel sayaçlar
      db.query(`
        SELECT
          (SELECT COUNT(*) FROM purchase_orders WHERE created_at >= date_trunc('month', now())) AS po_count,
          (SELECT COUNT(*) FROM sales_orders    WHERE created_at >= date_trunc('month', now())) AS so_count,
          (SELECT COUNT(*) FROM purchase_orders  WHERE status = 'in_transit') +
          (SELECT COUNT(*) FROM sales_orders     WHERE status = 'in_transit') AS in_transit,
          (SELECT COUNT(*) FROM purchase_orders  WHERE status = 'completed') +
          (SELECT COUNT(*) FROM sales_orders     WHERE status IN ('completed','delivered')) AS completed,
          (SELECT COUNT(*) FROM purchase_orders  WHERE status NOT IN ('completed','cancelled','draft')) AS po_active,
          (SELECT COUNT(*) FROM sales_orders     WHERE status NOT IN ('completed','delivered','cancelled','draft')) AS so_active,
          (SELECT COUNT(*) FROM purchase_orders  WHERE status = 'arrived') AS po_arrived,
          (SELECT COUNT(*) FROM sales_orders     WHERE status = 'arrived') AS so_arrived
      `),

      // Finansal özet
      db.query(`
        SELECT
          -- Bu ay satış tutarı
          COALESCE((SELECT SUM(quantity_kg * price_per_unit)
            FROM sales_orders
            WHERE created_at >= date_trunc('month', now())
              AND status NOT IN ('cancelled')
              AND quantity_kg IS NOT NULL AND price_per_unit IS NOT NULL), 0) AS so_value_this_month,

          -- Geçen ay satış tutarı
          COALESCE((SELECT SUM(quantity_kg * price_per_unit)
            FROM sales_orders
            WHERE created_at >= date_trunc('month', now()) - INTERVAL '1 month'
              AND created_at <  date_trunc('month', now())
              AND status NOT IN ('cancelled')
              AND quantity_kg IS NOT NULL AND price_per_unit IS NOT NULL), 0) AS so_value_last_month,

          -- Bu ay alım tutarı
          COALESCE((SELECT SUM(quantity_kg * price_per_unit)
            FROM purchase_orders
            WHERE created_at >= date_trunc('month', now())
              AND status NOT IN ('cancelled')
              AND quantity_kg IS NOT NULL AND price_per_unit IS NOT NULL), 0) AS po_value_this_month,

          -- Geçen ay alım tutarı
          COALESCE((SELECT SUM(quantity_kg * price_per_unit)
            FROM purchase_orders
            WHERE created_at >= date_trunc('month', now()) - INTERVAL '1 month'
              AND created_at <  date_trunc('month', now())
              AND status NOT IN ('cancelled')
              AND quantity_kg IS NOT NULL AND price_per_unit IS NOT NULL), 0) AS po_value_last_month,

          -- Toplam aktif sipariş değeri (devam eden işler)
          COALESCE((SELECT SUM(quantity_kg * price_per_unit)
            FROM sales_orders
            WHERE status NOT IN ('completed','delivered','cancelled')
              AND quantity_kg IS NOT NULL AND price_per_unit IS NOT NULL), 0) AS so_pipeline_value,

          COALESCE((SELECT SUM(quantity_kg * price_per_unit)
            FROM purchase_orders
            WHERE status NOT IN ('completed','cancelled')
              AND quantity_kg IS NOT NULL AND price_per_unit IS NOT NULL), 0) AS po_pipeline_value,

          -- Bu yılki toplam kg
          COALESCE((SELECT SUM(quantity_kg)
            FROM sales_orders
            WHERE created_at >= date_trunc('year', now())
              AND status NOT IN ('cancelled')
              AND quantity_kg IS NOT NULL), 0) AS so_kg_ytd,

          COALESCE((SELECT SUM(quantity_kg)
            FROM purchase_orders
            WHERE created_at >= date_trunc('year', now())
              AND status NOT IN ('cancelled')
              AND quantity_kg IS NOT NULL), 0) AS po_kg_ytd,

          -- Ortalama satış fiyatı (bu ay)
          COALESCE((SELECT AVG(price_per_unit)
            FROM sales_orders
            WHERE created_at >= date_trunc('month', now())
              AND status NOT IN ('cancelled')
              AND price_per_unit IS NOT NULL), 0) AS avg_so_price_this_month,

          (SELECT COALESCE(string_agg(DISTINCT currency, ','), 'USD')
            FROM sales_orders
            WHERE created_at >= date_trunc('month', now())
              AND status NOT IN ('cancelled')) AS currencies
      `),

      // Son satın almalar
      db.query(`
        SELECT po.id, po.party_no, po.status, po.created_at,
               po.quantity_kg, po.price_per_unit, po.currency,
               po.eta, po.etd, po.transport_mode,
               s.name AS party_name, p.name AS product_name,
               'purchase' AS type
        FROM purchase_orders po
        LEFT JOIN suppliers s ON s.id = po.supplier_id
        LEFT JOIN products  p ON p.id = po.product_id
        ORDER BY po.created_at DESC LIMIT 5
      `),

      // Son satışlar
      db.query(`
        SELECT so.id, so.party_no, so.lot_no, so.invoice_no, so.status, so.created_at,
               so.quantity_kg, so.price_per_unit, so.currency,
               so.eta, so.etd, so.transport_mode,
               c.name AS party_name, p.name AS product_name,
               'sales' AS type
        FROM sales_orders so
        LEFT JOIN customers c ON c.id = so.customer_id
        LEFT JOIN products  p ON p.id = so.product_id
        ORDER BY so.created_at DESC LIMIT 5
      `),

      // Aktif sevkiyatlar
      db.query(`
        SELECT id, party_no, status, eta, etd, transport_mode,
               quantity_kg, price_per_unit, currency,
               (SELECT name FROM suppliers WHERE id = supplier_id) AS party_name,
               (SELECT name FROM products  WHERE id = product_id)  AS product_name,
               'purchase' AS type
        FROM purchase_orders
        WHERE status NOT IN ('completed','cancelled') AND eta IS NOT NULL
        UNION ALL
        SELECT id, party_no, status, eta, etd, transport_mode,
               quantity_kg, price_per_unit, currency,
               (SELECT name FROM customers WHERE id = customer_id) AS party_name,
               (SELECT name FROM products  WHERE id = product_id)  AS product_name,
               'sales' AS type
        FROM sales_orders
        WHERE status NOT IN ('completed','delivered','cancelled') AND eta IS NOT NULL
        ORDER BY eta ASC
      `),

      // Top ürünler bu ay
      db.query(`
        SELECT p.name AS product_name,
               COUNT(*) AS order_count,
               SUM(so.quantity_kg) AS total_kg,
               SUM(so.quantity_kg * so.price_per_unit) AS total_value
        FROM sales_orders so
        LEFT JOIN products p ON p.id = so.product_id
        WHERE so.created_at >= date_trunc('month', now())
          AND so.status NOT IN ('cancelled')
          AND p.name IS NOT NULL
        GROUP BY p.name
        ORDER BY total_kg DESC NULLS LAST
        LIMIT 5
      `)
    ])

    const recent = [...recentPO.rows, ...recentSO.rows]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10)

    res.json({
      stats: stats.rows[0],
      financial: financial.rows[0],
      recent,
      shipments: shipments.rows,
      topProducts: topProducts.rows
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Sunucu hatası' })
  }
})

module.exports = router
