/**
 * Wan Hai Lines Tracking - Public API
 * https://www.wanhai.com/views/cargoTrack/CargoTrack.xhtml
 */

const https = require('https');

function httpPost(url, payload, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.wanhai.com/views/cargoTrack/CargoTrack.xhtml',
        ...headers,
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, body }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

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
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, body }); }
      });
    }).on('error', reject);
  });
}

async function trackWanHai(blNumber) {
  try {
    // Wan Hai tracking API endpoint
    const { status, body } = await httpPost(
      'https://www.wanhai.com/views/cargoTrack/CargoTrack.xhtml',
      { blNo: blNumber, type: 'BL' },
    );

    if (status !== 200 || !body || typeof body === 'string') {
      // Fallback: GET ile dene
      return await trackWanHaiGet(blNumber);
    }

    const s = body?.trackingInfo || body?.data || body?.[0] || body;

    return {
      success: true,
      data: {
        status: s?.status || s?.statusDesc || null,
        vessel: s?.vesselName || s?.vessel || null,
        currentPort: s?.currentPort || s?.location || null,
        eta: s?.eta || s?.estimatedArrival || null,
        pol: s?.pol || s?.portOfLoading || null,
        pod: s?.pod || s?.portOfDischarge || null,
      },
    };
  } catch (err) {
    return { success: false, error: 'Wan Hai API hatası: ' + err.message };
  }
}

async function trackWanHaiGet(blNumber) {
  try {
    const url = `https://www.wanhai.com/views/cargoTrack/CargoTrackBl.xhtml?blNo=${encodeURIComponent(blNumber)}`;
    const { status, body } = await httpGet(url);

    if (status === 200 && body && typeof body === 'object') {
      const s = body?.data || body?.[0] || body;
      return {
        success: true,
        data: {
          status: s?.status || null,
          vessel: s?.vesselName || null,
          currentPort: s?.currentPort || null,
          eta: s?.eta || null,
          pol: s?.pol || null,
          pod: s?.pod || null,
        },
      };
    }

    return {
      success: false,
      error: 'Wan Hai sitesi otomatik takibe izin vermiyor. BL numarasını https://www.wanhai.com adresinden manuel kontrol edin.',
    };
  } catch (err) {
    return { success: false, error: 'Wan Hai bağlantı hatası: ' + err.message };
  }
}

module.exports = { trackWanHai };
