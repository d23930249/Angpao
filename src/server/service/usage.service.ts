import { sql } from 'drizzle-orm';
import { soroban } from '@/server/config/soroban';
import { db } from '@/server/db/client';
import { AngpaoEscrowClient } from '@/server/soroban/escrow.client';

/**
 * The fake public key inserted by the demo seed (`scripts/seed-demo.ts`). It is
 * excluded from every count so the numbers reflect real wallet users only.
 */
const DEMO_KEY = 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGPKU3KX6Q5IEBVZ4HRR4I';

export interface UsageStats {
  uniqueWallets: number;
  totalLogins: number;
  totalGifts: number;
  giftSenders: number;
  onchainEnvelopes: number | null;
  perDay: Array<{ date: string; users: number; logins: number }>;
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
    sql`select count(distinct public_key)::int c from sessions where public_key <> ${DEMO_KEY}`,
  );
  const [logins] = await rows(
    sql`select count(*)::int c from sessions where public_key <> ${DEMO_KEY}`,
  );
  const [gifts] = await rows(
    sql`select count(*)::int c from gifts where sender_public_key <> ${DEMO_KEY}`,
  );
  const [senders] = await rows(
    sql`select count(distinct sender_public_key)::int c from gifts where sender_public_key <> ${DEMO_KEY}`,
  );
  const perDay = await rows(
    sql`select to_char(created_at,'YYYY-MM-DD') date, count(distinct public_key)::int users, count(*)::int logins
        from sessions where public_key <> ${DEMO_KEY}
        group by 1 order by 1 desc limit 14`,
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
    totalLogins: num(logins?.c),
    totalGifts: num(gifts?.c),
    giftSenders: num(senders?.c),
    onchainEnvelopes,
    perDay: perDay.map((r) => ({
      date: String(r.date),
      users: num(r.users),
      logins: num(r.logins),
    })),
    generatedAt: new Date().toISOString(),
  };
}
