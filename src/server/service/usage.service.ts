import { sql } from 'drizzle-orm';
import { soroban } from '@/server/config/soroban';
import { db } from '@/server/db/client';
import { AngpaoEscrowClient } from '@/server/soroban/escrow.client';

export interface UsageStats {
  uniqueWallets: number;
  logins: number;
  totalGifts: number;
  giftSenders: number;
  onchainEnvelopes: number | null;
  generatedAt: string;
}

async function rows(query: ReturnType<typeof sql>): Promise<Record<string, unknown>[]> {
  const res = (await db.execute(query)) as unknown as { rows: Record<string, unknown>[] };
  return res.rows ?? [];
}

function num(v: unknown): number {
  return typeof v === 'number' ? v : Number(v ?? 0);
}

export async function getUsageStats(): Promise<UsageStats> {
  const [wallets] = await rows(
    sql`select count(distinct public_key)::int c from sessions`,
  );
  const [logins] = await rows(sql`select count(*)::int c from sessions`);
  const [gifts] = await rows(sql`select count(*)::int c from gifts`);
  const [senders] = await rows(
    sql`select count(distinct sender_public_key)::int c from gifts`,
  );

  let onchainEnvelopes: number | null = null;
  if (soroban.contractId && soroban.assets.length > 0) {
    try {
      const client = new AngpaoEscrowClient({
        rpcUrl: soroban.rpcUrl,
        contractId: soroban.contractId,
        networkPassphrase: soroban.networkPassphrase,
      });
      onchainEnvelopes = await client.getTotalEnvelopes();
    } catch {
      onchainEnvelopes = null;
    }
  }

  return {
    uniqueWallets: num(wallets?.c),
    logins: num(logins?.c),
    totalGifts: num(gifts?.c),
    giftSenders: num(senders?.c),
    onchainEnvelopes,
    generatedAt: new Date().toISOString(),
  };
}
