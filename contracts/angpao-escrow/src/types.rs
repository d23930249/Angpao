use soroban_sdk::{contracttype, Address, BytesN};

/// How a multi-slot envelope distributes its balance across claimers.
#[contracttype]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum SplitMode {
    /// Every slot receives `total / slots`; the final claimer also sweeps any
    /// integer remainder so the envelope always settles to exactly zero.
    Equal = 0,
    /// Lucky-money mode — each claimer gets a random portion, bounded so every
    /// remaining slot is still guaranteed at least one unit.
    Random = 1,
}

/// Lifecycle of an envelope. An envelope is created `Active`; it becomes
/// `Completed` once every slot is claimed, or `Refunded` if the sender
/// reclaims the unclaimed remainder after expiry.
#[contracttype]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum EnvelopeStatus {
    Active = 0,
    Completed = 1,
    Refunded = 2,
}

/// A single escrowed red envelope. The contract custodies `remaining_amount`
/// of `token` until it is fully claimed or refunded.
#[contracttype]
#[derive(Clone)]
pub struct Envelope {
    /// Funder; the only address allowed to refund after expiry.
    pub sender: Address,
    /// Stellar Asset Contract (SAC) address of the escrowed asset, e.g. USDC.
    pub token: Address,
    /// Original deposit, in the token's minor units (USDC = 6 decimals).
    pub total_amount: i128,
    /// Balance still held in escrow (decremented on each claim / refund).
    pub remaining_amount: i128,
    /// Number of independent claim slots (1 = a classic single-recipient gift).
    pub total_slots: u32,
    /// Slots already claimed.
    pub claimed_slots: u32,
    /// sha256(preimage). A claimer must reveal a `preimage` that hashes to this.
    pub secret_hash: BytesN<32>,
    /// Unix timestamp (ledger time) after which claims stop and refund opens.
    pub expiry: u64,
    pub split: SplitMode,
    pub status: EnvelopeStatus,
}
