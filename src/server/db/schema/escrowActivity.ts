import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * A lightweight feed of on-chain escrow actions, recorded after a successful
 * create / open / refund so the wallet can surface a user's on-chain activity.
 * `account` is the wallet the row belongs to (sender for create/refund,
 * recipient for open).
 */
export const escrowActivity = pgTable(
  'escrow_activity',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    account: text('account').notNull(),
    action: text('action').notNull(), // 'create' | 'open' | 'refund'
    envelopeId: text('envelope_id'),
    asset: text('asset').notNull().default('XLM'),
    amount: text('amount'), // human decimal string, e.g. "0.5"
    txHash: text('tx_hash'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    accountIdx: index('escrow_activity_account_idx').on(t.account),
  }),
);

export type EscrowActivity = typeof escrowActivity.$inferSelect;
export type NewEscrowActivity = typeof escrowActivity.$inferInsert;
