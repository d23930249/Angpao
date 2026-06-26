import { Pool } from 'pg';

const url = process.env.DRIZZLE_DATABASE_URL;
if (!url) {
  console.error('DRIZZLE_DATABASE_URL not set');
  process.exit(1);
}

const sql = `
DO $$ BEGIN
  CREATE TYPE "gift_status" AS ENUM ('pending', 'funded', 'claimed', 'expired', 'failed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "gifts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "sender_public_key" text NOT NULL,
  "recipient_name" text NOT NULL,
  "amount_minor" text NOT NULL,
  "message" text DEFAULT '' NOT NULL,
  "secret_hash" text NOT NULL,
  "claimable_balance_id" text,
  "destination_public_key" text,
  "status" "gift_status" DEFAULT 'pending' NOT NULL,
  "version" integer DEFAULT 0 NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "claimed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "gifts_sender_idx" ON "gifts" ("sender_public_key");
CREATE INDEX IF NOT EXISTS "gifts_status_idx" ON "gifts" ("status");
CREATE INDEX IF NOT EXISTS "gifts_secret_hash_idx" ON "gifts" ("secret_hash");

ALTER TABLE "wallets" ADD COLUMN IF NOT EXISTS "owner_public_key" text NOT NULL DEFAULT '';
ALTER TABLE "wallets" DROP CONSTRAINT IF EXISTS "wallets_public_key_unique";
CREATE INDEX IF NOT EXISTS "wallets_owner_idx" ON "wallets" ("owner_public_key");
CREATE UNIQUE INDEX IF NOT EXISTS "wallets_owner_public_key_uniq" ON "wallets" ("owner_public_key", "public_key");
`;

const pool = new Pool({ connectionString: url });
try {
  await pool.query(sql);
  const r = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name",
  );
  console.log('OK. Tables:', r.rows.map((x) => x.table_name).join(', '));
} catch (e) {
  console.error('FAILED:', e.message);
  process.exit(1);
} finally {
  await pool.end();
}
