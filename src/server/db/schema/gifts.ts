import { index, integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const GIFT_STATUSES = ['pending', 'funded', 'claimed', 'expired', 'failed'] as const;
export type GiftStatus = (typeof GIFT_STATUSES)[number];
export const giftStatusEnum = pgEnum('gift_status', GIFT_STATUSES);

export const gifts = pgTable(
  'gifts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    senderPublicKey: text('sender_public_key').notNull(),
    recipientName: text('recipient_name').notNull(),
    amountMinor: text('amount_minor').notNull(), // USDC minor units (6 decimals)
    message: text('message').notNull().default(''),
    secretHash: text('secret_hash').notNull(), // sha256 of the secret, hex encoded
    claimableBalanceId: text('claimable_balance_id'), // Stellar claimable balance ID
    destinationPublicKey: text('destination_public_key'), // recipient's Stellar address
    status: giftStatusEnum('status').notNull().default('pending'),
    version: integer('version').notNull().default(0),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    claimedAt: timestamp('claimed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    senderIdx: index('gifts_sender_idx').on(t.senderPublicKey),
    statusIdx: index('gifts_status_idx').on(t.status),
    secretHashIdx: index('gifts_secret_hash_idx').on(t.secretHash),
  }),
);

export type Gift = typeof gifts.$inferSelect;
export type NewGift = typeof gifts.$inferInsert;
