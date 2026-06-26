import { createHash, randomBytes } from 'node:crypto';
import { resolveAsset, soroban } from '@/server/config/soroban';
import { AppError } from '@/server/lib/http';
import { AngpaoEscrowClient, type SplitMode } from '@/server/soroban/escrow.client';

/** Default time-to-live for an on-chain envelope, mirroring the gift TTL. */
const ESCROW_TTL_SECONDS = 72 * 3600;

function client(): AngpaoEscrowClient {
  if (!soroban.contractId || soroban.assets.length === 0) {
    throw new AppError(
      'INTERNAL',
      'Escrow contract is not configured (set SOROBAN_ESCROW_CONTRACT_ID and a token SAC)',
      503,
    );
  }
  return new AngpaoEscrowClient({
    rpcUrl: soroban.rpcUrl,
    contractId: soroban.contractId,
    networkPassphrase: soroban.networkPassphrase,
  });
}

/**
 * Convert a decimal amount string to the asset's minor units, using the
 * configured decimals (XLM = 7, USDC = 6). Avoids float rounding.
 */
function toMinorUnits(amount: string, decimals: number): string {
  const [whole, frac = ''] = amount.split('.');
  const fracPadded = (frac + '0'.repeat(decimals)).slice(0, decimals);
  const minor = BigInt(whole || '0') * 10n ** BigInt(decimals) + BigInt(fracPadded || '0');
  if (minor <= 0n) throw new AppError('INVALID_INPUT', 'Amount must be greater than zero', 400);
  return minor.toString();
}

/**
 * Soroban simulation traps (e.g. insufficient balance, missing trustline,
 * contract-error) surface as raw `HostError`s. Translate them into a clean,
 * user-facing AppError instead of a generic 500.
 */
function asAppError(err: unknown, assetCode = 'the asset'): never {
  if (err instanceof AppError) throw err;
  const raw = err instanceof Error ? err.message : String(err);
  let message = `On-chain simulation failed. Make sure your wallet holds enough ${assetCode} (and a trustline if required) and is on the correct Stellar network.`;
  if (/trustline|no trust|op_no_trust/i.test(raw)) {
    message = `Your wallet is missing a ${assetCode} trustline. Add it (or fund the asset) and try again.`;
  } else if (/underfunded|insufficient|balance/i.test(raw)) {
    message = `Insufficient ${assetCode} balance in your wallet for this amount.`;
  } else if (/AlreadyClaimed|already/i.test(raw)) {
    message = 'This envelope has already been claimed by you.';
  } else if (/InvalidPreimage|preimage/i.test(raw)) {
    message = 'Wrong secret — the envelope stays locked.';
  } else if (/Expired|expired/i.test(raw)) {
    message = 'This envelope has expired.';
  } else if (/getAccount|not found|NotFound/i.test(raw)) {
    message = 'Your wallet account was not found on Testnet. Fund it first (friendbot).';
  }
  throw new AppError('CONFLICT', message, 409, { raw });
}

/**
 * Generate a random 32-byte secret and its sha256 digest. The contract
 * hashlock is `sha256(preimage_bytes)`; the recipient later reveals exactly
 * these bytes to claim.
 */
export function generateEscrowSecret(): { secret: string; secretHash: string } {
  const secret = randomBytes(32).toString('hex');
  const secretHash = createHash('sha256').update(Buffer.from(secret, 'hex')).digest('hex');
  return { secret, secretHash };
}

export interface BuildCreateInput {
  sender: string;
  amount: string;
  /** Display code of the asset to escrow (e.g. XLM, USDC). */
  asset?: string;
  totalSlots: number;
  split: SplitMode;
  ttlSeconds?: number;
  secretHash: string;
}

export async function buildCreateEnvelope(input: BuildCreateInput): Promise<{
  xdr: string;
  expiry: number;
  asset: string;
}> {
  const asset = resolveAsset(input.asset);
  const amountMinor = toMinorUnits(input.amount, asset.decimals);
  const expiry = Math.floor(Date.now() / 1000) + (input.ttlSeconds ?? ESCROW_TTL_SECONDS);
  try {
    const xdr = await client().buildCreateEnvelope({
      sender: input.sender,
      token: asset.tokenId,
      totalAmount: amountMinor,
      totalSlots: input.totalSlots,
      secretHash: input.secretHash,
      expiry,
      split: input.split,
    });
    return { xdr, expiry, asset: asset.code };
  } catch (err) {
    return asAppError(err, asset.code);
  }
}

export async function buildClaimEnvelope(
  envelopeId: number,
  recipient: string,
  preimage: string,
): Promise<string> {
  try {
    return await client().buildClaim({ envelopeId, recipient, preimage });
  } catch (err) {
    return asAppError(err);
  }
}

export async function buildRefundEnvelope(sender: string, envelopeId: number): Promise<string> {
  try {
    return await client().buildRefund(sender, envelopeId);
  } catch (err) {
    return asAppError(err);
  }
}

export async function submitSigned(
  signedXdr: string,
): Promise<{ txHash: string; result: unknown }> {
  try {
    return await client().submit(signedXdr);
  } catch (err) {
    return asAppError(err);
  }
}

export function readEnvelope(envelopeId: number): Promise<unknown> {
  return client().getEnvelope(envelopeId);
}
