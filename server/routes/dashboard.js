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

      // Finansal özet — invoice ile aynı mantık: sell_by='box' → boxes×price, sell_by='kg' → kg×price
      db.query(`
        WITH so_line_values AS (
          -- Her satış_order_item satırı için invoice ile aynı hesap
          -- sell_by='box': boxes = ROUND(quantity_kg / box_weight_kg), değer = boxes × price_per_unit
          -- sell_by='kg' : değer = quantity_kg × price_per_unit
          SELECT
            so.id          AS so_id,
            so.created_at,
            so.status,
            so.currency,
            so.quantity_kg AS so_kg,
            CASE
              WHEN soi.sell_by = 'kg' THEN
                COALESCE(soi.quantity_kg, 0) * COALESCE(soi.price_per_unit, 0)
              ELSE
                -- boxes = kg / box_weight_kg (aynı invoice mantığı)
                CASE WHEN COALESCE(soi.box_weight_kg, 0) > 0
                  THEN ROUND(COALESCE(soi.quantity_kg, 0) / soi.box_weight_kg) * COALESCE(soi.price_per_unit, 0)
                  ELSE 0
                END
            END AS line_value,
            COALESCE(soi.quantity_kg, 0) AS line_kg
          FROM sales_orders so
          JOIN sales_order_items soi ON soi.sales_order_id = so.id
          WHERE so.status NOT IN ('cancelled','draft')
        ),
        so_totals AS (
          -- Sipariş bazında topla
          SELECT
            so_id,
            MAX(created_at) AS created_at,
            MAX(status)     AS status,
            MAX(currency)   AS currency,
            SUM(line_value) AS order_value,
            SUM(line_kg)    AS order_kg
          FROM so_line_values
          GROUP BY so_id
        ),
        -- items olmayan siparişler için fallback: so.quantity_kg × so.price_per_unit
        so_fallback AS (
          SELECT
            so.id          AS so_id,
            so.created_at,
            so.status,
            so.currency,
            COALESCE(so.quantity_kg, 0) * COALESCE(so.price_per_unit, 0) AS order_value,
            COALESCE(so.quantity_kg, 0) AS order_kg
          FROM sales_orders so
          WHERE so.status NOT IN ('cancelled','draft')
            AND so.price_per_unit IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM sales_order_items soi2 WHERE soi2.sales_order_id = so.id)
        ),
        so_combined AS (
          SELECT * FROM so_totals
          UNION ALL
          SELECT * FROM so_fallback
        ),
        po_totals AS (
          SELECT
            po.id,
            po.created_at,
            po.status,
            po.currency,
            COALESCE(po.quantity_kg, 0) * COALESCE(po.price_per_unit, 0) AS order_value,
            COALESCE(po.quantity_kg, 0) AS order_kg
          FROM purchase_orders po
          WHERE po.status NOT IN ('cancelled','draft')
            AND po.quantity_kg IS NOT NULL
            AND po.price_per_unit IS NOT NULL
        )
        SELECT
          -- Bu ay satış tutarı
          COALESCE((SELECT SUM(order_value) FROM so_combined
            WHERE created_at >= date_trunc('month', now())), 0) AS so_value_this_month,

          -- Geçen ay satış tutarı
          COALESCE((SELECT SUM(order_value) FROM so_combined
            WHERE created_at >= date_trunc('month', now()) - INTERVAL '1 month'
              AND created_at <  date_trunc('month', now())), 0) AS so_value_last_month,

          -- Bu ay alım tutarı
          COALESCE((SELECT SUM(order_value) FROM po_totals
            WHERE created_at >= date_trunc('month', now())), 0) AS po_value_this_month,

          -- Geçen ay alım tutarı
          COALESCE((SELECT SUM(order_value) FROM po_totals
            WHERE created_at >= date_trunc('month', now()) - INTERVAL '1 month'
              AND created_at <  date_trunc('month', now())), 0) AS po_value_last_month,

          -- Açık pipeline: tamamlanmamış satışlar
          COALESCE((SELECT SUM(order_value) FROM so_combined
            WHERE status NOT IN ('completed','delivered')), 0) AS so_pipeline_value,

          COALESCE((SELECT SUM(order_value) FROM po_totals
            WHERE status NOT IN ('completed')), 0) AS po_pipeline_value,

          -- Bu yılki toplam kg
          COALESCE((SELECT SUM(order_kg) FROM so_combined
            WHERE created_at >= date_trunc('year', now())), 0) AS so_kg_ytd,

          COALESCE((SELECT SUM(order_kg) FROM po_totals
            WHERE created_at >= date_trunc('year', now())), 0) AS po_kg_ytd,

          -- Ana para birimi: bu ayki en çok kullanılan
          COALESCE((SELECT currency FROM sales_orders
            WHERE created_at >= date_trunc('month', now())
              AND status NOT IN ('cancelled','draft')
              AND currency IS NOT NULL
            GROUP BY currency ORDER BY COUNT(*) DESC LIMIT 1), 'USD') AS so_currency,

          COALESCE((SELECT currency FROM purchase_orders
            WHERE created_at >= date_trunc('month', now())
              AND status NOT IN ('cancelled','draft')
              AND currency IS NOT NULL
            GROUP BY currency ORDER BY COUNT(*) DESC LIMIT 1), 'USD') AS po_currency
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
        WHERE status NOT IN ('completed','cancelled','draft') AND eta IS NOT NULL
        UNION ALL
        SELECT id, party_no, status, eta, etd, transport_mode,
               quantity_kg, price_per_unit, currency,
               (SELECT name FROM customers WHERE id = customer_id) AS party_name,
               (SELECT name FROM products  WHERE id = product_id)  AS product_name,
               'sales' AS type
        FROM sales_orders
        WHERE status NOT IN ('completed','delivered','cancelled','draft') AND eta IS NOT NULL
        ORDER BY eta ASC
      `),

      // Top ürünler bu ay — invoice ile aynı mantık (items tablosundan)
      db.query(`
        WITH item_values AS (
          SELECT
            COALESCE(p.name, po2.name, soi.product_id::text) AS product_name,
            soi.quantity_kg AS line_kg,
            CASE
              WHEN soi.sell_by = 'kg' THEN
                COALESCE(soi.quantity_kg, 0) * COALESCE(soi.price_per_unit, 0)
              ELSE
                CASE WHEN COALESCE(soi.box_weight_kg, 0) > 0
                  THEN ROUND(COALESCE(soi.quantity_kg, 0) / soi.box_weight_kg) * COALESCE(soi.price_per_unit, 0)
                  ELSE 0
                END
            END AS line_value
          FROM sales_orders so
          JOIN sales_order_items soi ON soi.sales_order_id = so.id
          LEFT JOIN products p  ON p.id::text  = soi.product_id::text
          LEFT JOIN products po2 ON po2.id = so.product_id
          WHERE so.created_at >= date_trunc('month', now())
            AND so.status NOT IN ('cancelled','draft')
        )
        SELECT
          product_name,
          COUNT(*) AS order_count,
          SUM(line_kg)    AS total_kg,
          SUM(line_value) AS total_value
        FROM item_values
        WHERE product_name IS NOT NULL
        GROUP BY product_name
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
