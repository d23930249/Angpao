const { chromium } = require('@playwright/test');
const path = require('path');

const SCREENSHOT_DIR = '/home/thiha/workspace/apac/projects/013-gift-card-voucher-usdc/screen-shot';
const BASE_URL = 'http://localhost:3001';

async function takeScreenshots() {
  const browser = await chromium.launch({ headless: true });

  // Desktop context
  const desktop = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  // Mobile context
  const mobile = await browser.newContext({
    viewport: { width: 375, height: 812 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
  });

  const dPage = await desktop.newPage();
  const mPage = await mobile.newPage();

  // 01 - Landing page
  await dPage.goto(BASE_URL + '/en', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await dPage.waitForTimeout(3000);
  await dPage.screenshot({ path: path.join(SCREENSHOT_DIR, '01-landing.jpg'), type: 'jpeg', quality: 85 });
  console.log('01-landing.jpg done');

  // 02 - Gifts page (send gifts)
  await dPage.goto(BASE_URL + '/en/gifts', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await dPage.waitForTimeout(3000);
  await dPage.screenshot({ path: path.join(SCREENSHOT_DIR, '02-gifts.jpg'), type: 'jpeg', quality: 85 });
  console.log('02-gifts.jpg done');

  // 03 - Dashboard
  await dPage.goto(BASE_URL + '/en/dashboard', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await dPage.waitForTimeout(3000);
  await dPage.screenshot({ path: path.join(SCREENSHOT_DIR, '03-dashboard.jpg'), type: 'jpeg', quality: 85 });
  console.log('03-dashboard.jpg done');

  // 04 - Claim page
  await dPage.goto(BASE_URL + '/en/claim', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await dPage.waitForTimeout(3000);
  await dPage.screenshot({ path: path.join(SCREENSHOT_DIR, '04-claim.jpg'), type: 'jpeg', quality: 85 });
  console.log('04-claim.jpg done');

  // 05 - Connect/wallet
  await dPage.goto(BASE_URL + '/en/connect', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await dPage.waitForTimeout(3000);
  await dPage.screenshot({ path: path.join(SCREENSHOT_DIR, '05-connect.jpg'), type: 'jpeg', quality: 85 });
  console.log('05-connect.jpg done');

  // 06 - Mobile landing
  await mPage.goto(BASE_URL + '/en', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await mPage.waitForTimeout(3000);
  await mPage.screenshot({ path: path.join(SCREENSHOT_DIR, '06-mobile.jpg'), type: 'jpeg', quality: 85 });
  console.log('06-mobile.jpg done');

  await browser.close();
  console.log('All screenshots done!');
}

takeScreenshots().catch(err => {
  console.error('Screenshot error:', err);
  process.exit(1);
});
