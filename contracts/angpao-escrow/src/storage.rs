use soroban_sdk::{contracttype, Address};

/// Storage keys. `Envelope` and `Claimed` live in *persistent* storage (they
/// must outlive the contract instance); `Admin`/`Paused`/`Counter` live in
/// *instance* storage so they share the instance's TTL.
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Paused,
    Counter,
    /// envelope id -> Envelope
    Envelope(u64),
    /// (envelope id, claimer) -> () ; presence means "already claimed once"
    Claimed(u64, Address),
}

// Soroban ledgers close ~every 5s → 17,280 ledgers/day.
pub const DAY_IN_LEDGERS: u32 = 17_280;

// Keep the contract instance (admin/config) alive for ~30 days, re-bumped on
// every state-changing call.
pub const INSTANCE_BUMP_AMOUNT: u32 = 30 * DAY_IN_LEDGERS;
pub const INSTANCE_LIFETIME_THRESHOLD: u32 = INSTANCE_BUMP_AMOUNT - DAY_IN_LEDGERS;

// Envelopes (and their claim markers) are bumped to ~60 days so funds can never
// be stranded by entry expiry before a recipient claims or a sender refunds.
pub const ENVELOPE_BUMP_AMOUNT: u32 = 60 * DAY_IN_LEDGERS;
pub const ENVELOPE_LIFETIME_THRESHOLD: u32 = ENVELOPE_BUMP_AMOUNT - DAY_IN_LEDGERS;
