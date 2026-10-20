/**
 * Wan Hai Lines Tracking Scraper
 * URL: https://www.wanhai.com/views/cargoTrack/CargoTrack.xhtml
 */

const puppeteer = require('puppeteer');

async function trackWanHai(blNumber) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium-browser',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    await page.setViewport({ width: 1280, height: 800 });

    const url = 'https://www.wanhai.com/views/cargoTrack/CargoTrack.xhtml';
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // BL seçeneğini seç
    try {
      await page.click('input[value="BL"], label[for*="BL"], #blRadio', { timeout: 3000 });
    } catch (_) {}

    // BL numarasını gir
    const inputSel = 'textarea#cargoTrackListBean\\.q, textarea[name*="q"], input[name*="BL"], #inputBL';
    await page.waitForSelector(inputSel, { timeout: 10000 });
    await page.click(inputSel);
    await page.type(inputSel, blNumber);

    // Ara
    await page.click('input[type="submit"], button[type="submit"], .btn-search', { timeout: 5000 });
    await page.waitForTimeout(5000);

    // Sonuçları bekle
    try {
      await page.waitForSelector('.ui-datatable, table[id*="track"], .trackResult', { timeout: 15000 });
    } catch (_) {}

    const result = await page.evaluate(() => {
      const getText = (sel) => {
        const el = document.querySelector(sel);
        return el ? el.innerText.trim() : null;
      };

      // Tablo satırları
      const tableRows = Array.from(document.querySelectorAll('table tr')).map((tr) =>
        Array.from(tr.querySelectorAll('td, th')).map((td) => td.innerText.trim())
      );

      // İlk anlamlı satırdan veri çek
      let status = null, vessel = null, currentPort = null, eta = null, pol = null, pod = null;

      for (const row of tableRows) {
        const rowText = row.join(' ').toLowerCase();
        if (rowText.includes('vessel') || rowText.includes('gemi')) {
          vessel = row[1] || row[2] || null;
        }
        if (rowText.includes('eta') || rowText.includes('arrival')) {
          eta = row[1] || row[2] || null;
        }
        if (rowText.includes('status') || rowText.includes('durum')) {
          status = row[1] || row[2] || null;
        }
        if (rowText.includes('pol') || rowText.includes('loading')) {
          pol = row[1] || row[2] || null;
        }
        if (rowText.includes('pod') || rowText.includes('discharge')) {
          pod = row[1] || row[2] || null;
        }
      }

      // Fallback: genel status alanı
      if (!status) {
        status = getText('[class*="status"], [class*="Status"]');
      }

      return { status, vessel, currentPort, eta, pol, pod, tableRows: tableRows.slice(0, 15) };
    });

    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err.message };
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = { trackWanHai };
