import { StrKey } from '@stellar/stellar-sdk';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { AppError, created, ok } from '@/server/lib/http';
import {
  claimGift,
  createGift,
  formatUsdcAmount,
  fundGift,
  generateSecret,
  getGift,
  listGiftsBySender,
  parseUsdcAmount,
} from '@/server/service/gift.service';

const publicKeySchema = z
  .string()
  .refine((v) => v.length === 56 && StrKey.isValidEd25519PublicKey(v), {
    message: 'INVALID_PUBLIC_KEY',
  });

const createGiftSchema = z.object({
  recipientName: z.string().min(1).max(80),
  amountUsdc: z.string().regex(/^\d+(\.\d{1,6})?$/, 'Invalid USDC amount'),
  message: z.string().max(280).default(''),
});

const fundGiftSchema = z.object({
  claimableBalanceId: z.string().min(1),
});

const claimGiftSchema = z.object({
  secret: z.string().min(1),
  destinationPublicKey: publicKeySchema,
});

export async function listGifts(
  _req: NextRequest,
  ctx: { publicKey: string },
): Promise<ReturnType<typeof ok>> {
  const giftList = await listGiftsBySender(ctx.publicKey);
  const formatted = giftList.map((g) => ({
    ...g,
    amountUsdc: formatUsdcAmount(g.amountMinor),
    expiresAt: g.expiresAt.toISOString(),
    claimedAt: g.claimedAt?.toISOString() ?? null,
    createdAt: g.createdAt.toISOString(),
    updatedAt: g.updatedAt.toISOString(),
  }));
  return ok({ gifts: formatted });
}

export async function createGiftHandler(
  req: NextRequest,
  ctx: { publicKey: string },
): Promise<ReturnType<typeof created>> {
  const body = createGiftSchema.parse(await req.json());
  const amountMinor = parseUsdcAmount(body.amountUsdc);

  const secret = generateSecret();
  const { gift } = await createGift({
    senderPublicKey: ctx.publicKey,
    recipientName: body.recipientName,
    amountMinor,
    message: body.message,
    secret,
  });

  return created({
    gift: {
      ...gift,
      amountUsdc: formatUsdcAmount(gift.amountMinor),
      expiresAt: gift.expiresAt.toISOString(),
      createdAt: gift.createdAt.toISOString(),
      updatedAt: gift.updatedAt.toISOString(),
    },
    secret, // One-time reveal — include in response for QR generation
  });
}

export async function getGiftHandler(
  _req: NextRequest,
  ctx: { giftId: string },
): Promise<ReturnType<typeof ok>> {
  const gift = await getGift(ctx.giftId);
  return ok({
    gift: {
      ...gift,
      amountUsdc: formatUsdcAmount(gift.amountMinor),
      expiresAt: gift.expiresAt.toISOString(),
      claimedAt: gift.claimedAt?.toISOString() ?? null,
      createdAt: gift.createdAt.toISOString(),
      updatedAt: gift.updatedAt.toISOString(),
    },
  });
}

export async function fundGiftHandler(
  req: NextRequest,
  ctx: { giftId: string },
): Promise<ReturnType<typeof ok>> {
  const body = fundGiftSchema.parse(await req.json());
  const gift = await fundGift(ctx.giftId, body.claimableBalanceId);
  return ok({
    gift: {
      ...gift,
      amountUsdc: formatUsdcAmount(gift.amountMinor),
      expiresAt: gift.expiresAt.toISOString(),
      createdAt: gift.createdAt.toISOString(),
      updatedAt: gift.updatedAt.toISOString(),
    },
  });
}

export async function claimGiftHandler(
  req: NextRequest,
  ctx: { giftId: string },
): Promise<ReturnType<typeof ok>> {
  const body = claimGiftSchema.parse(await req.json());
  const gift = await claimGift(ctx.giftId, body.secret, body.destinationPublicKey);
  return ok({
    gift: {
      ...gift,
      amountUsdc: formatUsdcAmount(gift.amountMinor),
      expiresAt: gift.expiresAt.toISOString(),
      claimedAt: gift.claimedAt?.toISOString() ?? null,
      createdAt: gift.createdAt.toISOString(),
      updatedAt: gift.updatedAt.toISOString(),
    },
    message: `Lì xì opened! ${formatUsdcAmount(gift.amountMinor)} USDC claimed!`,
  });
}
