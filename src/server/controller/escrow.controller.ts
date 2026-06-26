import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { soroban } from '@/server/config/soroban';
import { ok } from '@/server/lib/http';
import { usdcCode, usdcIssuer } from '@/server/stellar/network';
import {
  buildClaimEnvelope,
  buildCreateEnvelope,
  buildRefundEnvelope,
  generateEscrowSecret,
  readEnvelope,
  submitSigned,
} from '@/server/service/escrow.service';
import {
  buildUsdcTrustline,
  hasUsdcTrustline,
  submitTrustline,
} from '@/server/service/trustline.service';
import { listActivity, recordActivity } from '@/server/service/escrowActivity.service';

const createSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,7})?$/, 'Invalid amount'),
  asset: z.string().max(12).optional(),
  totalSlots: z.number().int().min(1).max(100).default(1),
  split: z.enum(['Equal', 'Random']).default('Equal'),
  ttlSeconds: z.number().int().positive().max(2_592_000).optional(),
});

const claimSchema = z.object({
  envelopeId: z.number().int().nonnegative(),
  preimage: z.string().regex(/^[0-9a-fA-F]+$/, 'preimage must be hex'),
});

const refundSchema = z.object({
  envelopeId: z.number().int().nonnegative(),
});

const submitSchema = z.object({
  signedXdr: z.string().min(1),
});

/** GET — expose what the client needs to build/sign escrow flows. */
export function escrowConfigHandler(): ReturnType<typeof ok> {
  return ok({
    enabled: Boolean(soroban.contractId && soroban.assets.length > 0),
    contractId: soroban.contractId ?? null,
    assets: soroban.assets,
    rpcUrl: soroban.rpcUrl,
    networkPassphrase: soroban.networkPassphrase,
  });
}

/** POST — build an unsigned create_envelope XDR for the funder to sign. */
export async function createEnvelopeHandler(
  req: NextRequest,
  ctx: { publicKey: string },
): Promise<ReturnType<typeof ok>> {
  const body = createSchema.parse(await req.json());
  const { secret, secretHash } = generateEscrowSecret();

  const { xdr, expiry, asset } = await buildCreateEnvelope({
    sender: ctx.publicKey,
    amount: body.amount,
    asset: body.asset,
    totalSlots: body.totalSlots,
    split: body.split,
    ttlSeconds: body.ttlSeconds,
    secretHash,
  });

  // `secret` is the one-time reveal the funder shares with recipients; the
  // server does not persist it.
  return ok({ xdr, secret, secretHash, expiry, asset });
}

/** POST — build an unsigned claim XDR for the recipient to sign. */
export async function claimEnvelopeHandler(
  req: NextRequest,
  ctx: { publicKey: string },
): Promise<ReturnType<typeof ok>> {
  const body = claimSchema.parse(await req.json());
  const xdr = await buildClaimEnvelope(body.envelopeId, ctx.publicKey, body.preimage);
  return ok({ xdr });
}

/** POST — build an unsigned refund XDR for the original funder to sign. */
export async function refundEnvelopeHandler(
  req: NextRequest,
  ctx: { publicKey: string },
): Promise<ReturnType<typeof ok>> {
  const body = refundSchema.parse(await req.json());
  const xdr = await buildRefundEnvelope(ctx.publicKey, body.envelopeId);
  return ok({ xdr });
}

/** POST — submit a Freighter-signed XDR and return the contract result. */
export async function submitEnvelopeHandler(
  req: NextRequest,
  _ctx: { publicKey: string },
): Promise<ReturnType<typeof ok>> {
  const body = submitSchema.parse(await req.json());
  const { txHash, result } = await submitSigned(body.signedXdr);
  return ok({ txHash, result });
}

/** GET — whether the caller's wallet already trusts USDC. */
export async function trustlineStatusHandler(
  _req: NextRequest,
  ctx: { publicKey: string },
): Promise<ReturnType<typeof ok>> {
  return ok({
    hasTrustline: await hasUsdcTrustline(ctx.publicKey),
    assetCode: usdcCode(),
    issuer: usdcIssuer(),
  });
}

/** POST — build an unsigned ChangeTrust XDR adding a USDC trustline. */
export async function buildTrustlineHandler(
  _req: NextRequest,
  ctx: { publicKey: string },
): Promise<ReturnType<typeof ok>> {
  const { xdr } = await buildUsdcTrustline(ctx.publicKey);
  return ok({ xdr });
}

/** POST — submit a Freighter-signed ChangeTrust XDR to Horizon. */
export async function submitTrustlineHandler(
  req: NextRequest,
  _ctx: { publicKey: string },
): Promise<ReturnType<typeof ok>> {
  const body = submitSchema.parse(await req.json());
  const { hash } = await submitTrustline(body.signedXdr);
  return ok({ txHash: hash });
}

const recordSchema = z.object({
  action: z.enum(['create', 'open', 'refund']),
  envelopeId: z.string().max(40).optional(),
  asset: z.string().max(12),
  amount: z.string().max(40).optional(),
  txHash: z.string().max(80).optional(),
});

/** POST — record an on-chain escrow action for the caller's wallet. */
export async function recordActivityHandler(
  req: NextRequest,
  ctx: { publicKey: string },
): Promise<ReturnType<typeof ok>> {
  const body = recordSchema.parse(await req.json());
  await recordActivity({ account: ctx.publicKey, ...body });
  return ok({ recorded: true });
}

/** GET — the caller wallet's recent on-chain escrow activity. */
export async function listActivityHandler(
  _req: NextRequest,
  ctx: { publicKey: string },
): Promise<ReturnType<typeof ok>> {
  const rows = await listActivity(ctx.publicKey);
  return ok({
    activity: rows.map((r) => ({
      id: r.id,
      action: r.action,
      envelopeId: r.envelopeId,
      asset: r.asset,
      amount: r.amount,
      txHash: r.txHash,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}

/** GET — read a single envelope's on-chain state. */
export async function getEnvelopeHandler(
  _req: NextRequest,
  ctx: { envelopeId: string },
): Promise<ReturnType<typeof ok>> {
  const id = Number.parseInt(ctx.envelopeId, 10);
  const envelope = await readEnvelope(id);
  return ok({ envelope });
}
