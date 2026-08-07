// Capture REAL screenshots from the live Angpao deploy as JPEG (quality 85).
// Public pages + the connected on-chain flow (Freighter bridge emulated, signing
// done in Node with the funded deployer key). All shots are from the live app.
import { chromium } from '@playwright/test';
import { Keypair, Transaction } from '@stellar/stellar-sdk';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'https://angpao-three.vercel.app';
const OUT = process.env.SHOT_OUT ?? join(process.cwd(), 'screen-shot');
mkdirSync(OUT, { recursive: true });

const PUB = 'GBL5RJKF4QNJ4ZPLJZ7PS7K5A4J44VEZJRV2CRTFFDRVSY2N76AIIE47';
const SECRET = 'SDL4SWRGFBZ5XBB5EORL3BHLUSETFBVVQ6OIESURFR7D4BFQQJKMJI3P';
const PASS = 'Test SDF Network ; September 2015';

const jpg = (name) => ({ path: join(OUT, name), type: 'jpeg', quality: 85 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch();
try {
  // ---------- Public desktop pages ----------
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await sleep(1200);
  await page.screenshot(jpg('01-landing.jpg'));
  await page.goto(`${BASE}/how-it-works`, { waitUntil: 'networkidle' });
  await sleep(900);
  await page.screenshot(jpg('07-how-it-works.jpg'));
  await page.goto(`${BASE}/stats`, { waitUntil: 'networkidle' });
  await sleep(1500);
  await page.screenshot(jpg('06-stats.jpg'));
  await ctx.close();

  // ---------- Mobile landing ----------
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const mp = await m.newPage();
  await mp.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await sleep(1200);
  await mp.screenshot(jpg('08-mobile.jpg'));
  await m.close();

  // ---------- Connected on-chain flow ----------
  const wctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const wp = await wctx.newPage();
  await wp.exposeFunction('__freighterSign', async (xdr) => {
    const tx = new Transaction(xdr, PASS);
    tx.sign(Keypair.fromSecret(SECRET));
    return tx.toXDR();
  });
  await wp.addInitScript(
    ({ pub, pass }) => {
      window.freighter = true;
      const netDetails = {
        network: 'TESTNET', networkName: 'TESTNET',
        networkUrl: 'https://horizon-testnet.stellar.org', networkPassphrase: pass,
        sorobanRpcUrl: 'https://soroban-testnet.stellar.org',
      };
      window.addEventListener('message', async (ev) => {
        const data = ev.data;
        if (!data || data.source !== 'FREIGHTER_EXTERNAL_MSG_REQUEST') return;
        const reply = (payload) => window.postMessage(
          { source: 'FREIGHTER_EXTERNAL_MSG_RESPONSE', messagedId: data.messageId, messageId: data.messageId, ...payload },
          window.location.origin);
        switch (data.type) {
          case 'REQUEST_ACCESS': case 'REQUEST_PUBLIC_KEY': reply({ publicKey: pub }); break;
          case 'REQUEST_ALLOWED_STATUS': case 'SET_ALLOWED_STATUS': reply({ isAllowed: true }); break;
          case 'REQUEST_CONNECTION_STATUS': reply({ isConnected: true }); break;
          case 'REQUEST_NETWORK': reply({ network: 'TESTNET', networkPassphrase: pass }); break;
          case 'REQUEST_NETWORK_DETAILS': reply({ networkDetails: netDetails }); break;
          case 'REQUEST_USER_INFO': reply({ userInfo: { publicKey: pub } }); break;
          case 'SUBMIT_TRANSACTION': {
            try { const signed = await window.__freighterSign(data.transactionXdr); reply({ signedTransaction: signed, signerAddress: pub }); }
            catch (e) { reply({ signedTransaction: '', signerAddress: '', apiError: { code: -1, message: String(e) } }); }
            break;
          }
          case 'SUBMIT_AUTH_ENTRY': reply({ signedAuthEntry: data.entryXdr ?? null, signerAddress: pub }); break;
          default: reply({});
        }
      });
    },
    { pub: PUB, pass: PASS },
  );

  await wp.goto(`${BASE}/connect`, { waitUntil: 'domcontentloaded' });
  await wp.waitForLoadState('networkidle').catch(() => {});
  await sleep(800);
  await wp.screenshot(jpg('02-connect.jpg'));

  const freighterBtn = wp.getByRole('button', { name: /freighter/i });
  await freighterBtn.isEnabled({ timeout: 20000 }).catch(() => {});
  await freighterBtn.click();
  await wp.waitForURL(/\/dashboard/, { timeout: 60000 }).catch(() => {});
  await wp.waitForLoadState('networkidle').catch(() => {});
  await sleep(1000);
  await wp.screenshot(jpg('03-dashboard-connected.jpg'));

  // Create an envelope (amount=1, XLM default)
  const amount = wp.locator('#oc-amount');
  if (await amount.count()) await amount.fill('1');
  await sleep(400);
  await wp.screenshot(jpg('04-create.jpg'));
  await wp.getByRole('button', { name: /lock & create/i }).click();
  const created = wp.getByText(/envelope created on-chain/i);
  let okCreate = false;
  try { await created.waitFor({ state: 'visible', timeout: 45000 }); okCreate = true; } catch {}
  await sleep(600);
  await wp.screenshot(jpg('05-created-tx.jpg'));

  if (okCreate) {
    const id = (await wp.locator('span.font-mono.font-bold').first().textContent())?.replace(/[^0-9]/g, '') ?? '';
    const secret = (await wp.locator('code').first().textContent())?.trim() ?? '';
    // Soroban testnet RPC is eventually consistent: poll the read-only lookup
    // (same RPC the claim build uses) until the new envelope is indexed, else
    // the claim simulation hits a lagging node → Contract Error #8.
    for (let i = 0; i < 30; i++) {
      const r = await wp.request.get(`${BASE}/api/escrow/${id}`).catch(() => null);
      if (r) { const j = await r.json().catch(() => null); if (j?.ok && j?.data?.envelope) break; }
      await sleep(2000);
    }
    await wp.getByRole('tab', { name: /open|claim/i }).first().click().catch(() => {});
    await wp.locator('#oc-claim-id').fill(id);
    await wp.locator('#oc-secret').fill(secret);
    const openBtn = wp.getByRole('button', { name: /open envelope/i });
    let okOpen = false;
    for (let attempt = 1; attempt <= 4 && !okOpen; attempt++) {
      await openBtn.click();
      try { await wp.getByText(/[\d.]+\s+(XLM|USDC)/i).waitFor({ state: 'visible', timeout: 45000 }); okOpen = true; }
      catch { if (attempt < 4) await sleep(5000); }
    }
    await sleep(600);
    await wp.screenshot(jpg('09-opened.jpg'));
  }
  await wctx.close();
  console.log('captured all shots to', OUT);
} finally {
  await browser.close();
}
