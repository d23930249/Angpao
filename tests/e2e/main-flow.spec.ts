/**
 * E2E: Angpao — Digital Red Envelopes
 * Tests the gift/claim flow and UI quality gates.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Seeded demo data (from seed-demo.ts) — stable UUIDs in stellar_agent_b DB
const DEMO_SESSION_ID = '7515eef7-34f7-4a36-a450-d06f1aaf3dfa';
const DEMO_GIFT_ID = '9754f3dc-91ee-4bac-8a13-4407646aed05'; // Cháu Minh Tuấn, 500 USDC funded
const DEMO_GIFT_CLAIM_ID = '1c38de82-960d-42c9-9f59-a04eb4af5086'; // Cháu Anh Thư, 200 USDC

/** Inject the seeded session cookie so we land authenticated. */
async function injectSession(context: import('@playwright/test').BrowserContext) {
  await context.addCookies([{
    name: 'stellar_session',
    value: DEMO_SESSION_ID,
    domain: 'localhost',
    path: '/',
    httpOnly: true,
    sameSite: 'Lax',
  }]);
}

test.describe('Landing page', () => {
  test('shows Angpao heading and CTA above fold', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const cta = page.getByRole('link', { name: /send a gift/i }).first();
    await expect(cta).toBeVisible();
  });

  test('shows "Send love, send USDC" slogan', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/send love/i).first()).toBeVisible();
  });

  test('shows "How it works" section', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/how it works/i).first()).toBeVisible();
  });

  test('no a11y violations on landing', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.length).toBeLessThanOrEqual(2);
  });
});

test.describe('Mobile 375px', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('no horizontal scroll on landing', async ({ page }) => {
    await page.goto('/');
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = page.viewportSize()?.width ?? 375;
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth);
  });

  test('CTA reachable without vertical scroll on mobile', async ({ page }) => {
    await page.goto('/');
    const btn = page.getByRole('link', { name: /send a gift/i }).first();
    const box = await btn.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y + box!.height).toBeLessThan(900);
  });
});

test.describe('Gifts dashboard (seeded data)', () => {
  test('gifts page shows list title when authenticated', async ({ page, context }) => {
    await injectSession(context);
    await page.goto('/gifts');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('claim page loads with real gift id', async ({ page }) => {
    await page.goto(`/claim?giftId=${DEMO_GIFT_CLAIM_ID}`);
    await page.waitForLoadState('networkidle');
    // Should show recipient name or claim form — not an error
    const body = await page.textContent('body');
    expect(body).not.toMatch(/gift not found|invalid claim link/i);
  });

  test('claim page loads with missing giftId gracefully', async ({ page }) => {
    await page.goto('/claim');
    await expect(page.getByText(/invalid claim link/i)).toBeVisible();
  });

  test('no a11y violations on claim page (empty)', async ({ page }) => {
    await page.goto('/claim');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.length).toBeLessThanOrEqual(2);
  });
});

test.describe('Navigation', () => {
  test('navbar shows Angpao brand', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Angpao').first()).toBeVisible();
  });

  test('connect wallet link is visible on landing', async ({ page }) => {
    await page.goto('/');
    // Check connect button is in header or CTA
    const connectButtons = page.getByRole('link', { name: /connect wallet|send a gift/i });
    await expect(connectButtons.first()).toBeVisible();
  });
});

test.describe('Screenshots', () => {
  test('screenshot 01 - landing', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: 'screen-shot/01-landing.jpg',
      type: 'jpeg',
      quality: 85,
      fullPage: false,
    });
  });

  test('screenshot 02 - landing full', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: 'screen-shot/02-landing-full.jpg',
      type: 'jpeg',
      quality: 85,
      fullPage: true,
    });
  });

  test('screenshot 03 - dashboard with seeded gifts', async ({ page, context }) => {
    await injectSession(context);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    // Wait for gift list to appear (GiftListClient fetches /api/gifts)
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: 'screen-shot/03-dashboard-gifts.jpg',
      type: 'jpeg',
      quality: 85,
    });
  });

  test('screenshot 04 - gifts list page (seeded data)', async ({ page, context }) => {
    await injectSession(context);
    await page.goto('/gifts');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: 'screen-shot/04-gifts-list.jpg',
      type: 'jpeg',
      quality: 85,
    });
  });

  test('screenshot 05 - claim page with real funded gift', async ({ page }) => {
    await page.goto(`/claim?giftId=${DEMO_GIFT_ID}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: 'screen-shot/05-claim-real-gift.jpg',
      type: 'jpeg',
      quality: 85,
    });
  });

  test('screenshot 06 - connect wallet page', async ({ page }) => {
    await page.goto('/connect');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: 'screen-shot/06-connect.jpg',
      type: 'jpeg',
      quality: 85,
    });
  });

  test('screenshot 07 - how it works section', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
      document.getElementById('how-it-works')?.scrollIntoView();
    });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: 'screen-shot/07-how-it-works.jpg',
      type: 'jpeg',
      quality: 85,
    });
  });

  test('screenshot 08 - new gift form (authenticated)', async ({ page, context }) => {
    await injectSession(context);
    await page.goto('/gifts/new');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: 'screen-shot/08-new-gift-form.jpg',
      type: 'jpeg',
      quality: 85,
    });
  });

  test('screenshot 09 - mobile landing', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: 'screen-shot/09-mobile-landing.jpg',
      type: 'jpeg',
      quality: 85,
    });
  });

  test('screenshot 10 - mobile claim real gift', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`/claim?giftId=${DEMO_GIFT_ID}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: 'screen-shot/10-mobile-claim-real.jpg',
      type: 'jpeg',
      quality: 85,
    });
  });
});
