const router = require('express').Router()
const db = require('../db')
const { requireAuth } = require('../middleware/auth')

router.use(requireAuth)

router.get('/', async (req, res) => {
  try {
    const [stats, financial, recentPO, recentSO, shipments, topProducts,
           etaAlerts, topCustomers, topSuppliers, monthlyTrend] = await Promise.all([

      // ─── Operasyonel sayaçlar ───────────────────────────────────────────────
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

      // ─── Finansal özet (invoice mantığı) ────────────────────────────────────
      db.query(`
        WITH so_line_values AS (
          SELECT
            so.id          AS so_id,
            so.created_at,
            so.status,
            so.currency,
            so.payment_term,
            so.quantity_kg AS so_kg,
            so.eta,
            CASE
              WHEN soi.sell_by = 'kg' THEN
                COALESCE(soi.quantity_kg, 0) * COALESCE(soi.price_per_unit, 0)
              ELSE
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
          SELECT
            so_id,
            MAX(created_at)   AS created_at,
            MAX(status)       AS status,
            MAX(currency)     AS currency,
            MAX(payment_term) AS payment_term,
            MAX(eta)          AS eta,
            SUM(line_value)   AS order_value,
            SUM(line_kg)      AS order_kg
          FROM so_line_values
          GROUP BY so_id
        ),
        so_fallback AS (
          SELECT
            so.id          AS so_id,
            so.created_at,
            so.status,
            so.currency,
            so.payment_term,
            so.eta,
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
            po.payment_term,
            po.eta,
            COALESCE(po.quantity_kg, 0) * COALESCE(po.price_per_unit, 0) AS order_value,
            COALESCE(po.quantity_kg, 0) AS order_kg
          FROM purchase_orders po
          WHERE po.status NOT IN ('cancelled','draft')
            AND po.quantity_kg IS NOT NULL
            AND po.price_per_unit IS NOT NULL
        )
        SELECT
          COALESCE((SELECT SUM(order_value) FROM so_combined
            WHERE created_at >= date_trunc('month', now())), 0) AS so_value_this_month,
          COALESCE((SELECT SUM(order_value) FROM so_combined
            WHERE created_at >= date_trunc('month', now()) - INTERVAL '1 month'
              AND created_at <  date_trunc('month', now())), 0) AS so_value_last_month,
          COALESCE((SELECT SUM(order_value) FROM po_totals
            WHERE created_at >= date_trunc('month', now())), 0) AS po_value_this_month,
          COALESCE((SELECT SUM(order_value) FROM po_totals
            WHERE created_at >= date_trunc('month', now()) - INTERVAL '1 month'
              AND created_at <  date_trunc('month', now())), 0) AS po_value_last_month,
          COALESCE((SELECT SUM(order_value) FROM so_combined
            WHERE status NOT IN ('completed','delivered')), 0) AS so_pipeline_value,
          COALESCE((SELECT SUM(order_value) FROM po_totals
            WHERE status NOT IN ('completed')), 0) AS po_pipeline_value,
          COALESCE((SELECT SUM(order_kg) FROM so_combined
            WHERE created_at >= date_trunc('year', now())), 0) AS so_kg_ytd,
          COALESCE((SELECT SUM(order_kg) FROM po_totals
            WHERE created_at >= date_trunc('year', now())), 0) AS po_kg_ytd,
          COALESCE((SELECT currency FROM sales_orders
            WHERE created_at >= date_trunc('month', now())
              AND status NOT IN ('cancelled','draft')
              AND currency IS NOT NULL
            GROUP BY currency ORDER BY COUNT(*) DESC LIMIT 1), 'USD') AS so_currency,
          COALESCE((SELECT currency FROM purchase_orders
            WHERE created_at >= date_trunc('month', now())
              AND status NOT IN ('cancelled','draft')
              AND currency IS NOT NULL
            GROUP BY currency ORDER BY COUNT(*) DESC LIMIT 1), 'USD') AS po_currency,

          -- Ortalama sipariş değeri bu ay (satış)
          COALESCE((SELECT AVG(order_value) FROM so_combined
            WHERE created_at >= date_trunc('month', now())), 0) AS so_avg_order_this_month,

          -- Açık alacak: completed/delivered ama ödeme durumu bilinmiyor → pipeline olarak kabul
          -- Daha iyi yaklaşım: status='completed' olan son 90 gün siparişleri (tahsilat bekleniyor olabilir)
          COALESCE((SELECT SUM(order_value) FROM so_combined
            WHERE status IN ('completed','delivered')
              AND created_at >= now() - INTERVAL '90 days'), 0) AS so_receivable_90d,

          COALESCE((SELECT COUNT(*) FROM so_combined
            WHERE status IN ('completed','delivered')
              AND created_at >= now() - INTERVAL '90 days'), 0) AS so_receivable_count
      `),

      // ─── Son satın almalar ──────────────────────────────────────────────────
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

      // ─── Son satışlar ───────────────────────────────────────────────────────
      db.query(`
        SELECT so.id, so.party_no, so.lot_no, so.invoice_no, so.status, so.created_at,
               so.quantity_kg, so.price_per_unit, so.currency,
               so.eta, so.etd, so.transport_mode,
               c.name AS party_name, p.name AS product_name,
               'sales' AS type,
               COALESCE((
                 SELECT SUM(
                   CASE
                     WHEN soi.sell_by = 'kg' THEN
                       COALESCE(soi.quantity_kg, 0) * COALESCE(soi.price_per_unit, 0)
                     ELSE
                       CASE WHEN COALESCE(soi.box_weight_kg, 0) > 0
                         THEN ROUND(COALESCE(soi.quantity_kg, 0) / soi.box_weight_kg) * COALESCE(soi.price_per_unit, 0)
                         ELSE 0
                       END
                   END
                 )
                 FROM sales_order_items soi
                 WHERE soi.sales_order_id = so.id
               ), so.quantity_kg * so.price_per_unit, 0) AS order_value
        FROM sales_orders so
        LEFT JOIN customers c ON c.id = so.customer_id
        LEFT JOIN products  p ON p.id = so.product_id
        ORDER BY so.created_at DESC LIMIT 5
      `),

      // ─── Aktif sevkiyatlar (timeline için daha fazla bilgi) ─────────────────
      db.query(`
        SELECT id, party_no, status, eta, etd, transport_mode,
               quantity_kg, price_per_unit, currency,
               container_number, vessel_name,
               (SELECT name FROM suppliers WHERE id = supplier_id) AS party_name,
               (SELECT name FROM products  WHERE id = product_id)  AS product_name,
               'purchase' AS type
        FROM purchase_orders
        WHERE status NOT IN ('completed','cancelled','draft') AND eta IS NOT NULL
        UNION ALL
        SELECT id, party_no, status, eta, etd, transport_mode,
               quantity_kg, price_per_unit, currency,
               container_number, vessel_name,
               (SELECT name FROM customers WHERE id = customer_id) AS party_name,
               (SELECT name FROM products  WHERE id = product_id)  AS product_name,
               'sales' AS type
        FROM sales_orders
        WHERE status NOT IN ('completed','delivered','cancelled','draft') AND eta IS NOT NULL
        ORDER BY eta ASC
      `),

      // ─── Top ürünler bu ay ──────────────────────────────────────────────────
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
          LEFT JOIN products p  ON p.id::text = soi.product_id::text
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
      `),

      // ─── ETA Uyarıları (7 gün içinde, aktif siparişler) ────────────────────
      db.query(`
        SELECT
          id, party_no, status, eta, etd, transport_mode,
          quantity_kg, price_per_unit, currency,
          container_number, vessel_name,
          (eta::date - CURRENT_DATE) AS days_until_eta,
          (SELECT name FROM suppliers WHERE id = supplier_id) AS party_name,
          (SELECT name FROM products  WHERE id = product_id)  AS product_name,
          'purchase' AS type
        FROM purchase_orders
        WHERE status NOT IN ('completed','cancelled','draft')
          AND eta IS NOT NULL
          AND eta::date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
        UNION ALL
        SELECT
          id, party_no, status, eta, etd, transport_mode,
          quantity_kg, price_per_unit, currency,
          container_number, vessel_name,
          (eta::date - CURRENT_DATE) AS days_until_eta,
          (SELECT name FROM customers WHERE id = customer_id) AS party_name,
          (SELECT name FROM products  WHERE id = product_id)  AS product_name,
          'sales' AS type
        FROM sales_orders
        WHERE status NOT IN ('completed','delivered','cancelled','draft')
          AND eta IS NOT NULL
          AND eta::date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
        ORDER BY eta ASC
      `),

      // ─── Top müşteriler bu ay ───────────────────────────────────────────────
      db.query(`
        WITH so_values AS (
          SELECT
            so.customer_id,
            so.id AS so_id,
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
          WHERE so.created_at >= date_trunc('month', now())
            AND so.status NOT IN ('cancelled','draft')
            AND so.customer_id IS NOT NULL
        ),
        so_fb AS (
          SELECT so.customer_id, so.id AS so_id,
                 COALESCE(so.quantity_kg,0)*COALESCE(so.price_per_unit,0) AS line_value
          FROM sales_orders so
          WHERE so.created_at >= date_trunc('month', now())
            AND so.status NOT IN ('cancelled','draft')
            AND so.price_per_unit IS NOT NULL
            AND so.customer_id IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM sales_order_items s2 WHERE s2.sales_order_id = so.id)
        ),
        combined AS (SELECT * FROM so_values UNION ALL SELECT * FROM so_fb)
        SELECT
          c.name AS customer_name,
          COUNT(DISTINCT combined.so_id) AS order_count,
          SUM(combined.line_value) AS total_value
        FROM combined
        JOIN customers c ON c.id = combined.customer_id
        GROUP BY c.id, c.name
        ORDER BY total_value DESC NULLS LAST
        LIMIT 5
      `),

      // ─── Top tedarikçiler bu ay ─────────────────────────────────────────────
      db.query(`
        SELECT
          s.name AS supplier_name,
          COUNT(po.id) AS order_count,
          SUM(COALESCE(po.quantity_kg,0)*COALESCE(po.price_per_unit,0)) AS total_value,
          -- Ortalama ETA gecikme: planlanan ETD vs gerçek ETA (transit_days proxy)
          AVG(CASE WHEN po.eta IS NOT NULL AND po.etd IS NOT NULL
                   THEN (po.eta::date - po.etd::date)
                   ELSE NULL END) AS avg_transit_days
        FROM purchase_orders po
        JOIN suppliers s ON s.id = po.supplier_id
        WHERE po.created_at >= date_trunc('month', now())
          AND po.status NOT IN ('cancelled','draft')
          AND po.supplier_id IS NOT NULL
        GROUP BY s.id, s.name
        ORDER BY total_value DESC NULLS LAST
        LIMIT 5
      `),

      // ─── Aylık trend — son 6 ay ─────────────────────────────────────────────
      db.query(`
        WITH months AS (
          SELECT generate_series(
            date_trunc('month', now()) - INTERVAL '5 months',
            date_trunc('month', now()),
            '1 month'
          ) AS month_start
        ),
        so_monthly AS (
          SELECT
            date_trunc('month', so.created_at) AS month_start,
            SUM(CASE
              WHEN soi.sell_by = 'kg' THEN
                COALESCE(soi.quantity_kg,0) * COALESCE(soi.price_per_unit,0)
              ELSE
                CASE WHEN COALESCE(soi.box_weight_kg,0) > 0
                  THEN ROUND(COALESCE(soi.quantity_kg,0) / soi.box_weight_kg) * COALESCE(soi.price_per_unit,0)
                  ELSE 0
                END
            END) AS so_value
          FROM sales_orders so
          JOIN sales_order_items soi ON soi.sales_order_id = so.id
          WHERE so.created_at >= date_trunc('month', now()) - INTERVAL '5 months'
            AND so.status NOT IN ('cancelled','draft')
          GROUP BY 1
        ),
        so_fb_monthly AS (
          SELECT
            date_trunc('month', so.created_at) AS month_start,
            SUM(COALESCE(so.quantity_kg,0)*COALESCE(so.price_per_unit,0)) AS so_value
          FROM sales_orders so
          WHERE so.created_at >= date_trunc('month', now()) - INTERVAL '5 months'
            AND so.status NOT IN ('cancelled','draft')
            AND so.price_per_unit IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM sales_order_items s2 WHERE s2.sales_order_id = so.id)
          GROUP BY 1
        ),
        po_monthly AS (
          SELECT
            date_trunc('month', created_at) AS month_start,
            SUM(COALESCE(quantity_kg,0)*COALESCE(price_per_unit,0)) AS po_value
          FROM purchase_orders
          WHERE created_at >= date_trunc('month', now()) - INTERVAL '5 months'
            AND status NOT IN ('cancelled','draft')
            AND quantity_kg IS NOT NULL AND price_per_unit IS NOT NULL
          GROUP BY 1
        )
        SELECT
          TO_CHAR(m.month_start, 'Mon YY') AS month_label,
          m.month_start,
          COALESCE(s1.so_value, 0) + COALESCE(s2.so_value, 0)  AS so_value,
          COALESCE(p.po_value, 0)                               AS po_value,
          (COALESCE(s1.so_value,0) + COALESCE(s2.so_value,0))
            - COALESCE(p.po_value, 0)                           AS margin_value
        FROM months m
        LEFT JOIN so_monthly   s1 ON s1.month_start = m.month_start
        LEFT JOIN so_fb_monthly s2 ON s2.month_start = m.month_start
        LEFT JOIN po_monthly    p  ON p.month_start  = m.month_start
        ORDER BY m.month_start ASC
      `)
    ])

    const recent = [...recentPO.rows, ...recentSO.rows]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10)

    res.json({
      stats:          stats.rows[0],
      financial:      financial.rows[0],
      recent,
      shipments:      shipments.rows,
      topProducts:    topProducts.rows,
      etaAlerts:      etaAlerts.rows,
      topCustomers:   topCustomers.rows,
      topSuppliers:   topSuppliers.rows,
      monthlyTrend:   monthlyTrend.rows
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Sunucu hatası' })
  }
})

module.exports = router
