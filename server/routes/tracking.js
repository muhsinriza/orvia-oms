/**
 * Tracking API Routes
 * POST /api/tracking/refresh/:orderType/:orderId  — Manuel güncelleme
 * GET  /api/tracking/status/:orderType/:orderId   — Mevcut tracking durumu
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { trackSingle } = require('../scraper/index');

// Middleware: giriş kontrolü
function requireAuth(req, res, next) {
  if (!req.session?.userId) return res.status(401).json({ error: 'Giriş yapılmamış' });
  next();
}

// Manuel tracking güncelleme
router.post('/refresh/:orderType/:orderId', requireAuth, async (req, res) => {
  const { orderType, orderId } = req.params;

  if (!['purchase', 'sales'].includes(orderType)) {
    return res.status(400).json({ error: 'Geçersiz sipariş tipi' });
  }

  try {
    const result = await trackSingle(orderType, parseInt(orderId));

    if (result.success) {
      res.json({ success: true, data: result.data, message: 'Tracking güncellendi' });
    } else {
      res.json({ success: false, error: result.error });
    }
  } catch (err) {
    console.error('[Tracking API] Hata:', err);
    res.status(500).json({ error: 'Tracking güncellenemedi: ' + err.message });
  }
});

// Mevcut tracking durumu
router.get('/status/:orderType/:orderId', requireAuth, async (req, res) => {
  const { orderType, orderId } = req.params;
  const table = orderType === 'purchase' ? 'purchase_orders' : 'sales_orders';

  try {
    const row = await db.query(
      `SELECT
        shipping_line, seawaybill_number, container_number,
        vessel_name, tracking_status, current_port,
        pol, pod, eta, ata, last_tracked_at, tracking_error
       FROM ${table} WHERE id = $1`,
      [parseInt(orderId)]
    );

    if (!row.rows.length) return res.status(404).json({ error: 'Sipariş bulunamadı' });

    // Son tracking eventleri
    const events = await db.query(
      `SELECT event_date, event_type, title, description, location
       FROM shipment_events
       WHERE order_type = $1 AND order_id = $2
       ORDER BY event_date DESC
       LIMIT 10`,
      [orderType, parseInt(orderId)]
    );

    res.json({
      tracking: row.rows[0],
      events: events.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
