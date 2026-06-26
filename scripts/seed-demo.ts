/**
 * Seed script for Angpao demo.
 * Run: npm run seed
 */
import { createHash, randomBytes } from 'node:crypto';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../src/server/db/schema';
import { gifts } from '../src/server/db/schema/gifts';
import { sessions } from '../src/server/db/schema/sessions';
import { wallets } from '../src/server/db/schema/wallets';

const DATABASE_URL =
  process.env.DRIZZLE_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/stellar_agent_b';

const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool, { schema });

const DEMO_PUBLIC_KEY = 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGPKU3KX6Q5IEBVZ4HRR4I';

function hash(s: string) {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

function rnd() {
  return randomBytes(16).toString('hex');
}

async function main() {
  console.log('Seeding Angpao demo data…');

  // Clear existing demo data
  await db.delete(gifts);
  await db.delete(wallets);
  await db.delete(sessions);

  // Seed demo wallet
  await db.insert(wallets).values({
    ownerPublicKey: DEMO_PUBLIC_KEY,
    publicKey: DEMO_PUBLIC_KEY,
    label: 'Nguyễn Thị Lan',
    network: 'testnet',
  });

  // Seed demo session
  await db.insert(sessions).values({
    publicKey: DEMO_PUBLIC_KEY,
    expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
  });

  // Seed demo gifts
  const demoGifts = [
    {
      senderPublicKey: DEMO_PUBLIC_KEY,
      recipientName: 'Cháu Minh Tuấn',
      amountMinor: '500000000', // 500 USDC (~₫12,000,000)
      message: 'Chúc cháu học giỏi, năm mới vui vẻ! 🧧',
      secretHash: hash(rnd()),
      status: 'funded' as const,
      expiresAt: new Date(Date.now() + 72 * 3600 * 1000),
    },
    {
      senderPublicKey: DEMO_PUBLIC_KEY,
      recipientName: 'Cháu Anh Thư',
      amountMinor: '200000000', // 200 USDC (~₫4,800,000)
      message: 'Lì xì Tết 2025 🎉 Chúc mừng năm mới!',
      secretHash: hash(rnd()),
      status: 'claimed' as const,
      expiresAt: new Date(Date.now() + 72 * 3600 * 1000),
      claimedAt: new Date(Date.now() - 2 * 3600 * 1000),
    },
    {
      senderPublicKey: DEMO_PUBLIC_KEY,
      recipientName: 'Bé Gia Bảo',
      amountMinor: '100000000', // 100 USDC (~₫2,400,000)
      message: 'Angpao Imlek 🧧 Xīnnián kuàilè!',
      secretHash: hash(rnd()),
      status: 'pending' as const,
      expiresAt: new Date(Date.now() + 48 * 3600 * 1000),
    },
    {
      senderPublicKey: DEMO_PUBLIC_KEY,
      recipientName: 'Bé Khải Huyền',
      amountMinor: '50000000', // 50 USDC (~₫1,200,000)
      message: 'Selamat Lebaran! 🌙 Maaf lahir batin.',
      secretHash: hash(rnd()),
      status: 'funded' as const,
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
    },
    {
      senderPublicKey: DEMO_PUBLIC_KEY,
      recipientName: 'Cô Thùy Linh',
      amountMinor: '20000000', // 20 USDC (~₫480,000)
      message: 'Chúc mừng sinh nhật! Happy Birthday 🎂',
      secretHash: hash(rnd()),
      status: 'expired' as const,
      expiresAt: new Date(Date.now() - 24 * 3600 * 1000),
    },
    {
      senderPublicKey: DEMO_PUBLIC_KEY,
      recipientName: 'Chú Văn Đức',
      amountMinor: '300000000', // 300 USDC (~₫7,200,000)
      message: '🧧 Xīnnián kuàilè! Gōngxǐ fācái!',
      secretHash: hash(rnd()),
      status: 'claimed' as const,
      expiresAt: new Date(Date.now() + 72 * 3600 * 1000),
      claimedAt: new Date(Date.now() - 5 * 3600 * 1000),
    },
  ];

  for (const g of demoGifts) {
    await db.insert(gifts).values({
      ...g,
      claimedAt: 'claimedAt' in g ? g.claimedAt : undefined,
    });
  }

  console.log(`Seeded ${demoGifts.length} gifts for ${DEMO_PUBLIC_KEY}`);
  console.log('Demo wallet:', DEMO_PUBLIC_KEY);
  await pool.end();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
