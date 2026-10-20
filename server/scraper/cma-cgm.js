/**
 * CMA CGM Tracking Scraper
 * URL: https://www.cma-cgm.com/ebusiness/tracking/search?SearchBy=BillOfLading&Reference={BL}
 */

const puppeteer = require('puppeteer');

async function trackCmaCgm(blNumber) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
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

    const url = `https://www.cma-cgm.com/ebusiness/tracking/search?SearchBy=BillOfLading&Reference=${encodeURIComponent(blNumber)}`;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Cookie banner kapat
    try {
      await page.click('#onetrust-accept-btn-handler', { timeout: 3000 });
      await page.waitForTimeout(1000);
    } catch (_) {}

    // Tracking sonuçlarını bekle
    await page.waitForSelector('.tracking-result, .shipment-status, [class*="tracking"]', { timeout: 15000 });

    const result = await page.evaluate(() => {
      const getText = (sel) => {
        const el = document.querySelector(sel);
        return el ? el.innerText.trim() : null;
      };

      // Durum
      const status =
        getText('.shipment-status') ||
        getText('[class*="status"]') ||
        getText('[class*="Status"]');

      // Gemi adı
      const vessel =
        getText('[class*="vessel"]') ||
        getText('[class*="Vessel"]') ||
        getText('.vessel-name');

      // Mevcut port
      const currentPort =
        getText('[class*="current-port"]') ||
        getText('[class*="location"]') ||
        getText('[class*="port"]');

      // ETA
      const eta =
        getText('[class*="eta"]') ||
        getText('[class*="ETA"]') ||
        getText('[class*="arrival"]');

      // POL / POD
      const pol = getText('[class*="origin"]') || getText('[class*="pol"]');
      const pod = getText('[class*="destination"]') || getText('[class*="pod"]');

      return { status, vessel, currentPort, eta, pol, pod };
    });

    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err.message };
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = { trackCmaCgm };
