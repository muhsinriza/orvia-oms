/**
 * Arkas Line Tracking Scraper
 * URL: https://www.arkas.com.tr/tr/Kargo/Kargo-Sorgula?type=bl&value={BL}
 */

const puppeteer = require('puppeteer');

async function trackArkas(blNumber) {
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

    // Arkas tracking formu
    const url = `https://www.arkas.com.tr/tr/Kargo/Kargo-Sorgula`;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // BL numarasını forma gir
    try {
      // BL seçeneğini seç
      await page.click('input[value="bl"], label[for*="bl"], [id*="radiobl"]', { timeout: 3000 });
    } catch (_) {}

    // Input alanı bul ve doldur
    const inputSel = 'input[name*="search"], input[placeholder*="BL"], input[id*="searchTerm"], input[id*="query"]';
    await page.waitForSelector(inputSel, { timeout: 10000 });
    await page.click(inputSel);
    await page.type(inputSel, blNumber);

    // Ara butonuna bas
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {}),
      page.click('button[type="submit"], input[type="submit"], .search-btn, [class*="ara"]'),
    ]);

    await page.waitForTimeout(3000);

    const result = await page.evaluate(() => {
      const getText = (sel) => {
        const el = document.querySelector(sel);
        return el ? el.innerText.trim() : null;
      };

      const getAll = (sel) =>
        Array.from(document.querySelectorAll(sel)).map((el) => el.innerText.trim());

      // Tablo satırlarından veri çek
      const rows = getAll('table tr, .tracking-row, .cargo-row');

      // Durum bilgisi
      const status =
        getText('.cargo-status, .shipment-status, [class*="durum"]') ||
        getText('[class*="status"]');

      // Gemi
      const vessel = getText('[class*="gemi"], [class*="vessel"]');

      // Tarihler
      const eta = getText('[class*="eta"], [class*="tahmini"]');

      // Port bilgisi
      const currentPort = getText('[class*="port"], [class*="liman"], [class*="konum"]');

      return { status, vessel, currentPort, eta, rows: rows.slice(0, 10) };
    });

    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err.message };
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = { trackArkas };
