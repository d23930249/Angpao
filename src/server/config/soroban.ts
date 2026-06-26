import { env } from './env';
import { stellar } from './stellar';

export interface EscrowAsset {
  /** Display code, e.g. XLM or USDC. */
  code: string;
  /** Stellar Asset Contract (SAC) id holding the asset. */
  tokenId: string;
  /** Decimal places — Stellar SACs use 7 (XLM and classic-asset USDC alike). */
  decimals: number;
}

/**
 * The assets a user can escrow. Built from env: the explicit escrow token
 * (default native XLM) plus the USDC SAC when configured. De-duplicated by SAC.
 */
function buildAssets(): EscrowAsset[] {
  const list: EscrowAsset[] = [];
  if (env.ESCROW_TOKEN_CONTRACT_ID) {
    list.push({
      code: env.ESCROW_ASSET_CODE,
      tokenId: env.ESCROW_TOKEN_CONTRACT_ID,
      decimals: env.ESCROW_ASSET_DECIMALS,
    });
  }
  if (env.USDC_SAC_CONTRACT_ID && !list.some((a) => a.tokenId === env.USDC_SAC_CONTRACT_ID)) {
    // On Stellar, the SAC for a classic asset (incl. USDC) uses 7 decimals —
    // not the 6-decimal convention USDC uses on Ethereum. Verified on-chain via
    // the SAC's decimals() == 7.
    list.push({ code: 'USDC', tokenId: env.USDC_SAC_CONTRACT_ID, decimals: 7 });
  }
  return list;
}

const assets = buildAssets();

/**
 * Resolved configuration for the on-chain AngpaoEscrow contract.
 */
export const soroban = {
  rpcUrl: env.SOROBAN_RPC_URL,
  contractId: env.SOROBAN_ESCROW_CONTRACT_ID,
  assets,
  networkPassphrase: stellar.passphrase as string,
} as const;

/** Look up an escrow asset by its display code (case-insensitive). */
export function resolveAsset(code?: string): EscrowAsset {
  if (!assets.length) {
    throw new Error('No escrow assets configured');
  }
  if (!code) return assets[0];
  const match = assets.find((a) => a.code.toLowerCase() === code.toLowerCase());
  return match ?? assets[0];
}

export function isEscrowEnabled(): boolean {
  return Boolean(soroban.contractId && assets.length > 0);
}
