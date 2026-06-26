#![no_std]
//! # Angpao Escrow
//!
//! A Soroban smart contract that escrows USDC (or any SAC asset) into
//! **hashlocked, time-locked, multi-slot red envelopes**.
//!
//! It is the trust-minimized, on-chain core of the Angpao gift-card app:
//! instead of the backend custodying funds or relying on Stellar classic
//! claimable balances, the sender locks USDC *in the contract*, and recipients
//! pull their share by revealing a secret — no intermediary can move the money.
//!
//! ## Advanced features
//! - **Token escrow via the Stellar Asset Contract (SAC)** — real USDC custody.
//! - **Hashlock (HTLC-style)** — claim requires `sha256(preimage) == secret_hash`.
//! - **Timelock + refund** — claims close at `expiry`; the sender can then
//!   reclaim the unclaimed remainder. Funds are never stuck.
//! - **Multi-slot "lucky money" split** — one envelope, N recipients, `Equal`
//!   or `Random` distribution, with a per-recipient double-claim guard.
//! - **Authorization** — `require_auth` on sender (create/refund) and recipient
//!   (claim); contract-as-custodian pays out from its own address.
//! - **Events** — `init`, `create`, `claim`, `refund`, `pause` for indexers.
//! - **Pausable admin + upgradeable Wasm** — operational safety for mainnet.
//! - **Storage TTL management** — instance and envelope entries are bumped so
//!   escrow never expires out from under a pending claim.

mod error;
mod storage;
mod types;

#[cfg(test)]
mod test;

use error::Error;
use storage::{
    DataKey, ENVELOPE_BUMP_AMOUNT, ENVELOPE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT,
    INSTANCE_LIFETIME_THRESHOLD,
};
use types::{Envelope, EnvelopeStatus, SplitMode};

use soroban_sdk::{
    contract, contractimpl, symbol_short, token, Address, Bytes, BytesN, Env,
};

#[contract]
pub struct AngpaoEscrow;

#[contractimpl]
impl AngpaoEscrow {
    /// One-time setup. Records the admin and unpauses the contract.
    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Paused, &false);
        env.storage().instance().set(&DataKey::Counter, &0u64);
        bump_instance(&env);
        env.events().publish((symbol_short!("init"),), admin);
        Ok(())
    }

    /// Lock `total_amount` of `token` into a new envelope and return its id.
    ///
    /// Auth: requires the sender's signature. The same authorization covers the
    /// inner SAC `transfer(sender -> contract)`.
    pub fn create_envelope(
        env: Env,
        sender: Address,
        token: Address,
        total_amount: i128,
        total_slots: u32,
        secret_hash: BytesN<32>,
        expiry: u64,
        split: SplitMode,
    ) -> Result<u64, Error> {
        sender.require_auth();
        require_not_paused(&env)?;

        if total_amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        if total_slots == 0 || (total_slots as i128) > total_amount {
            // Each slot must be fundable with at least one minor unit.
            return Err(Error::InvalidSlots);
        }
        if expiry <= env.ledger().timestamp() {
            return Err(Error::InvalidExpiry);
        }

        // Pull the deposit into the contract's custody.
        token::Client::new(&env, &token).transfer(
            &sender,
            &env.current_contract_address(),
            &total_amount,
        );

        let id = next_id(&env);
        let envelope = Envelope {
            sender: sender.clone(),
            token,
            total_amount,
            remaining_amount: total_amount,
            total_slots,
            claimed_slots: 0,
            secret_hash,
            expiry,
            split,
            status: EnvelopeStatus::Active,
        };
        save_envelope(&env, id, &envelope);
        bump_instance(&env);

        env.events()
            .publish((symbol_short!("create"), id), (sender, total_amount, total_slots));
        Ok(id)
    }

    /// Claim one slot of an envelope by revealing the secret `preimage`.
    /// Returns the amount transferred to `recipient` (minor units).
    ///
    /// Auth: requires the recipient's signature (binds the payout to them).
    pub fn claim(
        env: Env,
        envelope_id: u64,
        recipient: Address,
        preimage: Bytes,
    ) -> Result<i128, Error> {
        recipient.require_auth();

        let mut envelope = load_envelope(&env, envelope_id)?;

        if envelope.status != EnvelopeStatus::Active {
            return Err(Error::EnvelopeNotActive);
        }
        if env.ledger().timestamp() >= envelope.expiry {
            return Err(Error::Expired);
        }
        if envelope.claimed_slots >= envelope.total_slots {
            return Err(Error::AllSlotsClaimed);
        }

        // One claim per recipient per envelope.
        let claimed_key = DataKey::Claimed(envelope_id, recipient.clone());
        if env.storage().persistent().has(&claimed_key) {
            return Err(Error::AlreadyClaimed);
        }

        // Hashlock: the revealed preimage must hash to the committed digest.
        let computed: BytesN<32> = env.crypto().sha256(&preimage).to_bytes();
        if computed != envelope.secret_hash {
            return Err(Error::InvalidPreimage);
        }

        let amount = compute_payout(&env, &envelope);

        // Pay out from the contract's own balance.
        token::Client::new(&env, &envelope.token).transfer(
            &env.current_contract_address(),
            &recipient,
            &amount,
        );

        envelope.remaining_amount -= amount;
        envelope.claimed_slots += 1;
        if envelope.claimed_slots == envelope.total_slots {
            envelope.status = EnvelopeStatus::Completed;
        }
        save_envelope(&env, envelope_id, &envelope);

        env.storage().persistent().set(&claimed_key, &true);
        env.storage().persistent().extend_ttl(
            &claimed_key,
            ENVELOPE_LIFETIME_THRESHOLD,
            ENVELOPE_BUMP_AMOUNT,
        );
        bump_instance(&env);

        env.events()
            .publish((symbol_short!("claim"), envelope_id), (recipient, amount));
        Ok(amount)
    }

    /// After `expiry`, the sender reclaims the unclaimed remainder.
    pub fn refund(env: Env, envelope_id: u64) -> Result<i128, Error> {
        let mut envelope = load_envelope(&env, envelope_id)?;
        envelope.sender.require_auth();

        if envelope.status != EnvelopeStatus::Active {
            return Err(Error::EnvelopeNotActive);
        }
        if env.ledger().timestamp() < envelope.expiry {
            return Err(Error::NotYetExpired);
        }
        if envelope.remaining_amount <= 0 {
            return Err(Error::NothingToRefund);
        }

        let amount = envelope.remaining_amount;
        token::Client::new(&env, &envelope.token).transfer(
            &env.current_contract_address(),
            &envelope.sender,
            &amount,
        );

        envelope.remaining_amount = 0;
        envelope.status = EnvelopeStatus::Refunded;
        save_envelope(&env, envelope_id, &envelope);
        bump_instance(&env);

        env.events()
            .publish((symbol_short!("refund"), envelope_id), (envelope.sender, amount));
        Ok(amount)
    }

    // --- Views -------------------------------------------------------------

    pub fn get_envelope(env: Env, envelope_id: u64) -> Result<Envelope, Error> {
        load_envelope(&env, envelope_id)
    }

    pub fn has_claimed(env: Env, envelope_id: u64, recipient: Address) -> bool {
        env.storage()
            .persistent()
            .has(&DataKey::Claimed(envelope_id, recipient))
    }

    pub fn total_envelopes(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::Counter)
            .unwrap_or(0u64)
    }

    pub fn is_paused(env: Env) -> bool {
        env.storage()
            .instance()
            .get(&DataKey::Paused)
            .unwrap_or(false)
    }

    pub fn get_admin(env: Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)
    }

    // --- Admin -------------------------------------------------------------

    pub fn pause(env: Env) -> Result<(), Error> {
        admin(&env)?.require_auth();
        env.storage().instance().set(&DataKey::Paused, &true);
        bump_instance(&env);
        env.events().publish((symbol_short!("pause"),), true);
        Ok(())
    }

    pub fn unpause(env: Env) -> Result<(), Error> {
        admin(&env)?.require_auth();
        env.storage().instance().set(&DataKey::Paused, &false);
        bump_instance(&env);
        env.events().publish((symbol_short!("pause"),), false);
        Ok(())
    }

    pub fn set_admin(env: Env, new_admin: Address) -> Result<(), Error> {
        admin(&env)?.require_auth();
        env.storage().instance().set(&DataKey::Admin, &new_admin);
        bump_instance(&env);
        Ok(())
    }

    /// Replace the contract's own code (admin-gated). Enables shipping fixes
    /// without migrating escrow state — important for a mainnet (L6) deploy.
    pub fn upgrade(env: Env, new_wasm_hash: BytesN<32>) -> Result<(), Error> {
        admin(&env)?.require_auth();
        env.deployer().update_current_contract_wasm(new_wasm_hash);
        Ok(())
    }
}

// --- Internal helpers ------------------------------------------------------

fn admin(env: &Env) -> Result<Address, Error> {
    env.storage()
        .instance()
        .get(&DataKey::Admin)
        .ok_or(Error::NotInitialized)
}

fn require_not_paused(env: &Env) -> Result<(), Error> {
    let paused: bool = env
        .storage()
        .instance()
        .get(&DataKey::Paused)
        .ok_or(Error::NotInitialized)?;
    if paused {
        return Err(Error::Paused);
    }
    Ok(())
}

fn next_id(env: &Env) -> u64 {
    let current: u64 = env
        .storage()
        .instance()
        .get(&DataKey::Counter)
        .unwrap_or(0u64);
    let id = current + 1;
    env.storage().instance().set(&DataKey::Counter, &id);
    id
}

fn load_envelope(env: &Env, id: u64) -> Result<Envelope, Error> {
    env.storage()
        .persistent()
        .get(&DataKey::Envelope(id))
        .ok_or(Error::EnvelopeNotFound)
}

fn save_envelope(env: &Env, id: u64, envelope: &Envelope) {
    let key = DataKey::Envelope(id);
    env.storage().persistent().set(&key, envelope);
    env.storage()
        .persistent()
        .extend_ttl(&key, ENVELOPE_LIFETIME_THRESHOLD, ENVELOPE_BUMP_AMOUNT);
}

fn bump_instance(env: &Env) {
    env.storage()
        .instance()
        .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);
}

/// Decide how much the current claimer receives.
///
/// The last remaining slot always sweeps `remaining_amount`, so the envelope
/// settles to exactly zero with no dust left in escrow. Otherwise:
/// - `Equal`  → `total_amount / total_slots`.
/// - `Random` → a uniform draw in `1..=upper`, where `upper` is the smaller of
///   twice the running average and `remaining - (slots_left - 1)`. The second
///   bound guarantees every *other* remaining slot can still get ≥ 1 unit.
fn compute_payout(env: &Env, envelope: &Envelope) -> i128 {
    let slots_left = (envelope.total_slots - envelope.claimed_slots) as i128;
    if slots_left <= 1 {
        return envelope.remaining_amount;
    }
    match envelope.split {
        SplitMode::Equal => envelope.total_amount / (envelope.total_slots as i128),
        SplitMode::Random => {
            let avg = envelope.remaining_amount / slots_left;
            let reserve_floor = envelope.remaining_amount - (slots_left - 1);
            let mut upper = if avg * 2 < reserve_floor { avg * 2 } else { reserve_floor };
            if upper < 1 {
                upper = 1;
            }
            let draw: u64 = env.prng().gen_range(1..=(upper as u64));
            draw as i128
        }
    }
}
