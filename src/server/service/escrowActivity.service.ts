import { desc, eq } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { type EscrowActivity, escrowActivity } from '@/server/db/schema';

export interface RecordActivityInput {
  account: string;
  action: string; // 'create' | 'open' | 'refund'
  envelopeId?: string | null;
  asset: string;
  amount?: string | null;
  txHash?: string | null;
}

export async function recordActivity(input: RecordActivityInput): Promise<void> {
  await db.insert(escrowActivity).values({
    account: input.account,
    action: input.action,
    envelopeId: input.envelopeId ?? null,
    asset: input.asset,
    amount: input.amount ?? null,
    txHash: input.txHash ?? null,
  });
}

export async function listActivity(account: string): Promise<EscrowActivity[]> {
  return db
    .select()
    .from(escrowActivity)
    .where(eq(escrowActivity.account, account))
    .orderBy(desc(escrowActivity.createdAt))
    .limit(30);
}
