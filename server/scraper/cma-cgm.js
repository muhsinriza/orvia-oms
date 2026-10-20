/**
 * CMA CGM Tracking - Public REST API
 * https://api.cma-cgm.net/booking/shipment/v2/shipments?searchParameter={BL}&searchCriteria=BillOfLading
 */

const https = require('https');

function httpGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ...headers,
      },
    };
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    }).on('error', reject);
  });
}

async function trackCmaCgm(blNumber) {
  try {
    // CMA CGM public tracking API
    const url = `https://www.cma-cgm.com/api/tracking/v2/shipments?searchParameter=${encodeURIComponent(blNumber)}&searchCriteria=BillOfLading`;
    const { status, body } = await httpGet(url);

    if (status !== 200) {
      // Fallback: eski web scraper yerine basit fetch dene
      return await trackCmaCgmWeb(blNumber);
    }

    // API yanıtını parse et
    const shipment = body?.shipments?.[0] || body?.[0] || body;
    if (!shipment) return { success: false, error: 'Sevkiyat bulunamadı' };

    const transport = shipment.transportations?.[0] || {};
    const places = shipment.places || {};

    return {
      success: true,
      data: {
        status: shipment.statusCode || shipment.status || null,
        vessel: transport.vesselName || shipment.vesselName || null,
        currentPort: shipment.currentLocation || places.currentPort || null,
        eta: shipment.estimatedTimeArrival || shipment.eta || null,
        pol: places.portOfLoading || shipment.pol || null,
        pod: places.portOfDischarge || shipment.pod || null,
      },
    };
  } catch (err) {
    return { success: false, error: 'CMA CGM API hatası: ' + err.message };
  }
}

// Alternatif: CMA CGM'in tracking sayfasından JSON veri çek (script tag içinde)
async function trackCmaCgmWeb(blNumber) {
  try {
    const url = `https://www.cma-cgm.com/ebusiness/tracking/search?SearchBy=BillOfLading&Reference=${encodeURIComponent(blNumber)}`;
    const { status, body } = await httpGet(url, {
      'Accept': 'text/html,application/xhtml+xml',
    });

    if (typeof body !== 'string') return { success: false, error: 'Geçersiz yanıt' };

    // JSON-LD veya window.__data__ gibi gömülü veriyi ara
    const jsonMatch = body.match(/window\.__(?:trackingData|data|state)__\s*=\s*({.+?});/s)
      || body.match(/<script type="application\/json"[^>]*>({.+?})<\/script>/s);

    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[1]);
        const s = data?.shipment || data?.tracking || data;
        return {
          success: true,
          data: {
            status: s?.status || s?.statusCode || null,
            vessel: s?.vesselName || null,
            currentPort: s?.currentPort || s?.location || null,
            eta: s?.eta || s?.estimatedArrival || null,
            pol: s?.pol || null,
            pod: s?.pod || null,
          },
        };
      } catch (_) {}
    }

    return { success: false, error: 'CMA CGM sayfa yapısı değişmiş, veri çekilemedi' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = { trackCmaCgm };
