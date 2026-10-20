/**
 * Shipping Tracking Service
 * Her 6 saatte bir tüm aktif sevkiyatları günceller
 */

const { trackCmaCgm } = require('./cma-cgm');
const { trackArkas } = require('./arkas');
const { trackWanHai } = require('./wan-hai');
const db = require('../db');

// Shipping line bazında scraper seç
async function trackShipment(shippingLine, blNumber) {
  if (!blNumber) return { success: false, error: 'BL numarası yok' };

  switch (shippingLine) {
    case 'cma-cgm':
      return await trackCmaCgm(blNumber);
    case 'arkas':
      return await trackArkas(blNumber);
    case 'wan-hai':
      return await trackWanHai(blNumber);
    default:
      return { success: false, error: `Bilinmeyen shipping line: ${shippingLine}` };
  }
}

// DB'yi güncelle
async function updateOrderTracking(orderType, orderId, trackResult) {
  const table = orderType === 'purchase' ? 'purchase_orders' : 'sales_orders';

  if (!trackResult.success) {
    await db.query(
      `UPDATE ${table} SET tracking_error = $1, last_tracked_at = NOW() WHERE id = $2`,
      [trackResult.error, orderId]
    );
    return;
  }

  const d = trackResult.data;

  // ETA parse et (çeşitli format dene)
  let eta = null;
  if (d.eta) {
    const parsed = new Date(d.eta);
    if (!isNaN(parsed)) eta = parsed;
  }

  await db.query(
    `UPDATE ${table} SET
      tracking_status  = COALESCE($1, tracking_status),
      current_port     = COALESCE($2, current_port),
      vessel_name      = COALESCE($3, vessel_name),
      pol              = COALESCE($4, pol),
      pod              = COALESCE($5, pod),
      eta              = COALESCE($6, eta),
      last_tracked_at  = NOW(),
      tracking_error   = NULL
    WHERE id = $7`,
    [d.status, d.currentPort, d.vessel, d.pol, d.pod, eta, orderId]
  );

  // Durum değişikliğini event log'a ekle
  if (d.status) {
    await db.query(
      `INSERT INTO shipment_events (order_type, order_id, event_type, title, description, location)
       VALUES ($1, $2, 'status_change', $3, $4, $5)
       ON CONFLICT DO NOTHING`,
      [
        orderType,
        orderId,
        d.status,
        `Otomatik güncelleme: ${d.status}`,
        d.currentPort || null,
      ]
    );
  }
}

// Tüm aktif sevkiyatları tara
async function runTrackingCycle() {
  console.log('[Tracking] Tarama başladı:', new Date().toISOString());

  // Aktif purchase orders
  const poRows = await db.query(
    `SELECT id, shipping_line, seawaybill_number, tracking_number
     FROM purchase_orders
     WHERE shipping_line IS NOT NULL
       AND (seawaybill_number IS NOT NULL OR tracking_number IS NOT NULL)
       AND status NOT IN ('delivered', 'cancelled')
       AND (last_tracked_at IS NULL OR last_tracked_at < NOW() - INTERVAL '6 hours')`
  );

  // Aktif sales orders
  const soRows = await db.query(
    `SELECT id, shipping_line, seawaybill_number, tracking_number
     FROM sales_orders
     WHERE shipping_line IS NOT NULL
       AND (seawaybill_number IS NOT NULL OR tracking_number IS NOT NULL)
       AND status NOT IN ('delivered', 'cancelled')
       AND (last_tracked_at IS NULL OR last_tracked_at < NOW() - INTERVAL '6 hours')`
  );

  const orders = [
    ...poRows.rows.map((r) => ({ ...r, orderType: 'purchase' })),
    ...soRows.rows.map((r) => ({ ...r, orderType: 'sales' })),
  ];

  console.log(`[Tracking] ${orders.length} sipariş taranacak`);

  for (const order of orders) {
    const blNumber = order.seawaybill_number || order.tracking_number;
    console.log(`[Tracking] ${order.orderType} #${order.id} - ${order.shipping_line} - ${blNumber}`);

    try {
      const result = await trackShipment(order.shipping_line, blNumber);
      await updateOrderTracking(order.orderType, order.id, result);

      if (result.success) {
        console.log(`[Tracking] ✓ #${order.id}: ${result.data.status || 'güncellendi'}`);
      } else {
        console.log(`[Tracking] ✗ #${order.id}: ${result.error}`);
      }
    } catch (err) {
      console.error(`[Tracking] Hata #${order.id}:`, err.message);
      await updateOrderTracking(order.orderType, order.id, { success: false, error: err.message });
    }

    // Scraper'lar arasında bekleme (rate limiting)
    await new Promise((r) => setTimeout(r, 5000));
  }

  console.log('[Tracking] Tarama tamamlandı:', new Date().toISOString());
}

// Manuel tetikleme (tek sipariş)
async function trackSingle(orderType, orderId) {
  const table = orderType === 'purchase' ? 'purchase_orders' : 'sales_orders';
  const row = await db.query(
    `SELECT id, shipping_line, seawaybill_number, tracking_number FROM ${table} WHERE id = $1`,
    [orderId]
  );

  if (!row.rows.length) return { success: false, error: 'Sipariş bulunamadı' };

  const order = row.rows[0];
  const blNumber = order.seawaybill_number || order.tracking_number;

  if (!order.shipping_line) return { success: false, error: 'Gemi firması seçilmemiş — Commercial Invoice\'dan seçin' };
  if (!blNumber) return { success: false, error: 'BL/Seawaybill numarası girilmemiş' };

  const result = await trackShipment(order.shipping_line, blNumber);
  await updateOrderTracking(orderType, orderId, result);

  return result;
}

// Cron: her 6 saatte bir
function startCron() {
  const SIX_HOURS = 6 * 60 * 60 * 1000;

  // İlk çalıştırma 1 dakika sonra (startup bittikten sonra)
  setTimeout(() => {
    runTrackingCycle().catch((err) => console.error('[Tracking] Cron hatası:', err));
    setInterval(() => {
      runTrackingCycle().catch((err) => console.error('[Tracking] Cron hatası:', err));
    }, SIX_HOURS);
  }, 60 * 1000);

  console.log('[Tracking] Cron başlatıldı (her 6 saatte bir)');
}

module.exports = { runTrackingCycle, trackSingle, startCron };
