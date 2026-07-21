import { AppError } from '@/server/lib/http';
import { getHorizonUrl, getNetworkPassphrase, usdcAsset, usdcCode, usdcIssuer } from '@/server/stellar/network';
import { getAccountBalances } from '@/server/stellar/tx';
import { submitTransaction } from '@/server/stellar/xdr';

/** True if `publicKey` already trusts the configured USDC asset. */
export async function hasUsdcTrustline(publicKey: string): Promise<boolean> {
  try {
    const balances = await getAccountBalances(publicKey);
    return balances.some((b) => b.asset_code === usdcCode() && b.asset_issuer === usdcIssuer());
  } catch {
    return false;
  }
}

/**
 * Build an unsigned `ChangeTrust` transaction that adds a USDC trustline to the
 * user's account. This is a Stellar-classic operation (not Soroban): the SAC
 * escrow can only move USDC once the holder trusts the classic asset.
 */
export async function buildUsdcTrustline(publicKey: string): Promise<{ xdr: string }> {
  const { Account, BASE_FEE, Operation, TransactionBuilder } = await import('@stellar/stellar-sdk');
  const horizonUrl = getHorizonUrl().replace(/\/$/, '');
  const res = await fetch(`${horizonUrl}/accounts/${publicKey}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  });
  if (res.status === 404) {
    throw new AppError(
      'NOT_FOUND',
      'Your account is not funded on Testnet yet. Fund it with friendbot first.',
      404,
    );
  }
  if (!res.ok) {
    throw new AppError('INTERNAL', `Horizon returned ${res.status}`, 502);
  }
  const acct = (await res.json()) as { sequence: string };
  const account = new Account(publicKey, acct.sequence);
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: getNetworkPassphrase(),
  })
    .addOperation(Operation.changeTrust({ asset: usdcAsset() }))
    .setTimeout(300)
    .build();
  return { xdr: tx.toXDR() };
}

export function submitTrustline(signedXdr: string): Promise<{ hash: string; ledger: number }> {
  return submitTransaction(signedXdr);
}
