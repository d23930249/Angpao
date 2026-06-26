import { createHash, randomBytes } from 'node:crypto';
import { and, desc, eq, or, sql } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { type Gift, type NewGift, gifts } from '@/server/db/schema/gifts';
import { AppError } from '@/server/lib/http';
import { stellar } from '@/server/config/stellar';
import { Asset, Keypair, Claimant, Operation, TransactionBuilder, BASE_FEE } from '@stellar/stellar-sdk';
import { env } from '@/server/config/env';

const GIFT_TTL_SECONDS = 72 * 3600; // 72 hours

// Hash a secret (hex string or plain text) using SHA-256
export function hashSecret(secret: string): string {
  return createHash('sha256').update(secret, 'utf8').digest('hex');
}

// Generate a random secret phrase
export function generateSecret(): string {
  return randomBytes(16).toString('hex');
}

// Format minor USDC amount to display string (6 decimals)
export function formatUsdcAmount(amountMinor: string): string {
  const n = BigInt(amountMinor);
  const whole = n / 1_000_000n;
  const frac = n % 1_000_000n;
  const fracStr = frac.toString().padStart(6, '0').replace(/0+$/, '') || '00';
  return `${whole}.${fracStr}`;
}

// Convert USDC decimal amount string to minor units string
export function parseUsdcAmount(amount: string): string {
  const parts = amount.split('.');
  const whole = BigInt(parts[0] || '0');
  const fracStr = (parts[1] || '').padEnd(6, '0').slice(0, 6);
  const frac = BigInt(fracStr);
  return (whole * 1_000_000n + frac).toString();
}

// Build SEP-7 claim URI for the gift
export function buildClaimUri(giftId: string, secret: string, baseUrl: string): string {
  const params = new URLSearchParams({
    giftId,
    secret,
  });
  return `${baseUrl}/claim?${params.toString()}`;
}

// Generate QR data (web URL with claim link)
export async function generateQrData(
  giftId: string,
  secret: string,
  baseUrl: string,
): Promise<string> {
  return buildClaimUri(giftId, secret, baseUrl);
}

export interface CreateGiftParams {
  senderPublicKey: string;
  recipientName: string;
  amountMinor: string;
  message: string;
  secret: string; // the plain-text secret — caller generates this
}

export async function createGift(params: CreateGiftParams): Promise<{ gift: Gift; secret: string }> {
  const { senderPublicKey, recipientName, amountMinor, message, secret } = params;

  const amountN = BigInt(amountMinor);
  if (amountN <= 0n) {
    throw new AppError('INVALID_INPUT', 'Amount must be positive', 400);
  }
  if (amountN > 1_000_000_000_000n) {
    // > 1,000,000 USDC
    throw new AppError('INVALID_INPUT', 'Amount too large', 400);
  }

  const secretHash = hashSecret(secret);
  const expiresAt = new Date(Date.now() + GIFT_TTL_SECONDS * 1000);

  const [gift] = await db
    .insert(gifts)
    .values({
      senderPublicKey,
      recipientName,
      amountMinor,
      message,
      secretHash,
      status: 'pending',
      expiresAt,
    })
    .returning();

  if (!gift) throw new AppError('INTERNAL', 'Failed to create gift', 500);
  return { gift, secret };
}

export async function listGiftsBySender(senderPublicKey: string): Promise<Gift[]> {
  return db
    .select()
    .from(gifts)
    .where(eq(gifts.senderPublicKey, senderPublicKey))
    .orderBy(desc(gifts.createdAt))
    .limit(50);
}

export async function getGift(id: string): Promise<Gift> {
  const [gift] = await db.select().from(gifts).where(eq(gifts.id, id)).limit(1);
  if (!gift) throw new AppError('NOT_FOUND', 'Gift not found', 404);
  return gift;
}

export async function fundGift(
  id: string,
  claimableBalanceId: string,
  expectedVersion = 0,
): Promise<Gift> {
  const [existing] = await db.select().from(gifts).where(eq(gifts.id, id)).limit(1);
  if (!existing) throw new AppError('NOT_FOUND', 'Gift not found', 404);
  if (existing.status !== 'pending') {
    throw new AppError('CONFLICT', `Gift is already ${existing.status}`, 409);
  }

  const [updated] = await db
    .update(gifts)
    .set({
      status: 'funded',
      claimableBalanceId,
      version: sql`${gifts.version} + 1`,
      updatedAt: new Date(),
    })
    .where(and(eq(gifts.id, id), eq(gifts.version, expectedVersion)))
    .returning();

  if (!updated) throw new AppError('CONFLICT', 'Concurrent update detected', 409);
  return updated;
}

export async function claimGift(
  id: string,
  secret: string,
  destinationPublicKey: string,
): Promise<Gift> {
  const [gift] = await db.select().from(gifts).where(eq(gifts.id, id)).limit(1);
  if (!gift) throw new AppError('NOT_FOUND', 'Gift not found', 404);

  if (gift.status === 'claimed') {
    throw new AppError('CONFLICT', 'Gift already claimed', 409);
  }
  if (gift.status === 'expired' || (gift.expiresAt && gift.expiresAt < new Date())) {
    throw new AppError('CONFLICT', 'Gift has expired', 409);
  }
  if (gift.status !== 'funded' && gift.status !== 'pending') {
    throw new AppError('CONFLICT', `Gift is ${gift.status}`, 409);
  }

  // Verify the hashlock
  const providedHash = hashSecret(secret);
  if (providedHash !== gift.secretHash) {
    throw new AppError('FORBIDDEN', 'Invalid secret — lì xì locked', 403);
  }

  const now = new Date();
  const [updated] = await db
    .update(gifts)
    .set({
      status: 'claimed',
      destinationPublicKey,
      claimedAt: now,
      version: sql`${gifts.version} + 1`,
      updatedAt: now,
    })
    .where(and(eq(gifts.id, id), eq(gifts.version, gift.version)))
    .returning();

  if (!updated) throw new AppError('CONFLICT', 'Concurrent update detected', 409);
  return updated;
}

export async function expireOldGifts(): Promise<number> {
  const result = await db
    .update(gifts)
    .set({ status: 'expired', updatedAt: new Date() })
    .where(
      and(
        or(eq(gifts.status, 'pending'), eq(gifts.status, 'funded')),
        sql`${gifts.expiresAt} < NOW()`,
      ),
    );
  return result.rowCount ?? 0;
}
