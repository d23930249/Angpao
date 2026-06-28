import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { type BrowserContext, chromium, expect, type Page, test } from '@playwright/test';
import {
  approveOnce,
  cleanup,
  getExtensionId,
  launchWithFreighter,
  onboardFreighter,
} from '../../../../../shared/freighter/freighter-fixture';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'https://angpao-three.vercel.app';
const DEPLOYER_HEAD = 'GBL5';
const DEPLOYER_TAIL = 'IE47';
const CREATE_RETRIES = 4;

const SHOTS = path.resolve(__dirname, '../../../screen-shot');
mkdirSync(SHOTS, { recursive: true });

const shot = (page: Page, name: string) =>
  page.screenshot({ path: path.join(SHOTS, name), type: 'jpeg', quality: 85 });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const captured = new Set<string>();

test.describe.configure({ mode: 'serial' });

let context: BrowserContext;
let userDataDir: string;

async function isOnboarded(): Promise<boolean> {
  const id = getExtensionId(context);
  const probe = await context.newPage();
  try {
    await probe.goto(`chrome-extension://${id}/index.html#/`, { waitUntil: 'domcontentloaded' });
    await probe.waitForTimeout(2500);
    const welcome = await probe
      .getByRole('button', { name: /I already have a wallet/i })
      .isVisible()
      .catch(() => false);
    const netSelector = await probe
      .locator('[data-testid=network-selector-open]')
      .isVisible()
      .catch(() => false);
    return !welcome && netSelector;
  } finally {
    await probe.close().catch(() => {});
  }
}

async function closeStrayExtensionPages(): Promise<void> {
  const id = getExtensionId(context);
  const prefix = `chrome-extension://${id}`;
  for (const p of context.pages()) {
    if (!p.isClosed() && p.url().startsWith(prefix)) await p.close().catch(() => {});
  }
}

async function ensureOnboarded(): Promise<void> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    await onboardFreighter(context);
    if (await isOnboarded()) {
      await closeStrayExtensionPages();
      return;
    }
  }
  throw new Error('Freighter onboarding did not complete after 3 attempts');
}

test.beforeAll(async () => {
  const launched = await launchWithFreighter(chromium);
  context = launched.context;
  userDataDir = launched.userDataDir;
  await ensureOnboarded();
});

test.afterAll(async () => {
  if (context) await cleanup(context, userDataDir);
});

const APPROVAL_ROUTES = ['grant-access', 'sign-transaction', 'sign-auth-entry', 'sign-message'];

function findApprovalPopup(): Page | null {
  const prefix = `chrome-extension://${getExtensionId(context)}`;
  for (const p of context.pages()) {
    if (p.isClosed() || !p.url().startsWith(prefix)) continue;
    if (APPROVAL_ROUTES.some((route) => p.url().includes(route))) return p;
  }
  return null;
}

const APPROVE_SELECTOR =
  '[data-testid=grant-access-connect-button], [data-testid=sign-transaction-sign], [data-testid=sign-auth-entry-approve-button], [data-testid=sign-message-approve-button]';

async function snapPopup(popup: Page, grantName: string, signName: string): Promise<void> {
  const url = popup.url();
  const want = url.includes('grant-access')
    ? grantName
    : /sign-transaction|sign-auth/.test(url)
      ? signName
      : null;
  if (!want || captured.has(want)) return;
  await popup
    .locator(APPROVE_SELECTOR)
    .first()
    .waitFor({ state: 'visible', timeout: 4_000 })
    .catch(() => {});
  await popup.waitForTimeout(400);
  const ok = await popup
    .screenshot({ path: path.join(SHOTS, want), type: 'jpeg', quality: 85 })
    .then(() => true)
    .catch(() => false);
  if (ok) captured.add(want);
}

async function waitForPopup(ms: number): Promise<Page | null> {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    const popup = findApprovalPopup();
    if (popup) return popup;
    await sleep(100);
  }
  return null;
}

async function rapidApproveUntil(
  done: () => Promise<boolean>,
  ms: number,
  grantName: string,
  signName: string,
): Promise<boolean> {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (await done()) return true;
    const popup = await waitForPopup(8_000);
    if (popup) await snapPopup(popup, grantName, signName);
    await approveOnce(context, { timeout: 3500 }).catch(() => {});
    await sleep(200);
  }
  return done();
}

function isConnected(page: Page): Promise<boolean> {
  return page
    .getByTestId('account-chip')
    .isVisible()
    .catch(() => false);
}

async function clickFreighter(page: Page): Promise<void> {
  const row = page.getByRole('button', { name: /freighter/i });
  await expect(row).toBeEnabled({ timeout: 30_000 });
  await row.click();
}

async function connectWallet(page: Page): Promise<void> {
  const done = () => isConnected(page);
  for (let attempt = 0; attempt < 6; attempt++) {
    if (await done()) break;
    if (attempt > 0)
      await page.goto(`${BASE_URL}/connect`, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await clickFreighter(page).catch(() => {});
    if (
      await rapidApproveUntil(done, 40_000, '02-connect-popup.jpg', '03-sign-challenge-popup.jpg')
    )
      break;
  }
  await expect(page.getByTestId('account-chip')).toBeVisible({ timeout: 20_000 });
}

async function assertConnected(page: Page): Promise<void> {
  const chip = page.getByTestId('account-chip');
  await expect(chip).toBeVisible({ timeout: 30_000 });
  const chipText = (await chip.textContent())?.trim() ?? '';
  expect(chipText).toContain(DEPLOYER_HEAD);
  expect(chipText).toContain(DEPLOYER_TAIL);
}

async function submitOnce(page: Page): Promise<string | null> {
  let txHash: string | null = null;
  let signPopupSeen = false;
  const onResp = async (resp: { url(): string; json(): Promise<unknown> }) => {
    if (!resp.url().includes('/api/escrow/submit')) return;
    const json = (await resp.json().catch(() => null)) as {
      ok?: boolean;
      data?: { txHash?: string };
    } | null;
    if (json?.ok && json.data?.txHash) txHash = json.data.txHash;
  };
  page.on('response', onResp as never);
  const createButton = page.getByRole('button', { name: /lock & create/i });
  await createButton.click();

  const settled = async (): Promise<boolean> => {
    if (txHash != null) return true;
    if (findApprovalPopup()) {
      signPopupSeen = true;
      return false;
    }
    const idle = await createButton.isEnabled().catch(() => false);
    return signPopupSeen && idle;
  };
  await rapidApproveUntil(settled, 70_000, '05-sign-create-popup.jpg', '05-sign-create-popup.jpg');

  page.off('response', onResp as never);
  return txHash;
}

async function createVoucherOnChain(page: Page): Promise<string> {
  const createButton = page.getByRole('button', { name: /lock & create/i });
  await expect(createButton).toBeVisible({ timeout: 30_000 });

  let txHash: string | null = null;
  for (let attempt = 1; attempt <= CREATE_RETRIES && !txHash; attempt++) {
    txHash = await submitOnce(page);
    if (!txHash && attempt < CREATE_RETRIES) await page.waitForTimeout(4_000);
  }

  expect(txHash, 'on-chain escrow create must return a real tx hash').toBeTruthy();
  return txHash as string;
}

async function assertOnChainTx(page: Page, txHash: string): Promise<void> {
  expect(txHash).toMatch(/^[0-9a-f]{64}$/);
  const horizon = await page.request
    .get(`https://horizon-testnet.stellar.org/transactions/${txHash}`)
    .catch(() => null);
  expect(horizon?.ok(), 'tx must be confirmed on Stellar testnet Horizon').toBeTruthy();
  const expertUrl = `https://stellar.expert/explorer/testnet/tx/${txHash}`;
  const expert = await page.request.get(expertUrl).catch(() => null);
  expect(
    (expert?.status() ?? 500) < 500,
    'stellar.expert testnet tx link must resolve',
  ).toBeTruthy();
}

test('real Freighter: connect grant + SEP-10 sign + on-chain voucher escrow -> real tx hash', async () => {
  test.setTimeout(540_000);
  const page = await context.newPage();

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('h1').first()).toBeVisible({ timeout: 30_000 });
  await shot(page, '01-landing.jpg');

  await page.goto(`${BASE_URL}/connect`, { waitUntil: 'domcontentloaded' });
  await connectWallet(page);
  await assertConnected(page);

  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('tab', { name: /create/i })).toBeVisible({ timeout: 30_000 });
  await page.locator('#oc-amount').fill('0.5');
  await shot(page, '04-dashboard-connected.jpg');

  const txHash = await createVoucherOnChain(page);

  await expect(page.getByText(/envelope created on-chain/i)).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('code').first()).toBeVisible({ timeout: 15_000 });
  await shot(page, '06-created-tx.jpg');

  await assertOnChainTx(page, txHash);

  await page.goto(`https://stellar.expert/explorer/testnet/tx/${txHash}`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForTimeout(3_000);
  await shot(page, '07-stellar-expert.jpg');

  await page.goto(`${BASE_URL}/stats`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /usage metrics/i })).toBeVisible({
    timeout: 30_000,
  });
  await shot(page, '08-stats.jpg');

  // biome-ignore lint/suspicious/noConsole: surface the real tx hash for the run report
  console.log('CORE_FLOW_TX=' + txHash);
});

test('mobile landing renders', async () => {
  const page = await context.newPage();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('h1').first()).toBeVisible({ timeout: 30_000 });
  await shot(page, '09-mobile.jpg');
});
