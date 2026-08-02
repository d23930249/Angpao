#![cfg(test)]

use crate::error::Error;
use crate::types::{EnvelopeStatus, SplitMode};
use crate::{AngpaoEscrow, AngpaoEscrowClient};

use soroban_sdk::testutils::{Address as _, Ledger as _};
use soroban_sdk::token::{Client as TokenClient, StellarAssetClient};
use soroban_sdk::{Address, Bytes, BytesN, Env};

struct Setup<'a> {
    env: Env,
    client: AngpaoEscrowClient<'a>,
    token: Address,
    token_client: TokenClient<'a>,
    sender: Address,
}

fn setup<'a>(initial_mint: i128) -> Setup<'a> {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let sender = Address::generate(&env);

    // Deploy a Stellar Asset Contract to stand in for USDC.
    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    let token = sac.address();
    StellarAssetClient::new(&env, &token).mint(&sender, &initial_mint);

    let contract_id = env.register(AngpaoEscrow, ());
    let client = AngpaoEscrowClient::new(&env, &contract_id);
    client.initialize(&admin);

    Setup {
        token_client: TokenClient::new(&env, &token),
        env,
        client,
        token,
        sender,
    }
}

/// Returns (preimage, sha256(preimage)) for a fixed byte pattern.
fn secret(env: &Env, tag: u8) -> (Bytes, BytesN<32>) {
    let preimage = Bytes::from_array(env, &[tag; 32]);
    let hash = env.crypto().sha256(&preimage).to_bytes();
    (preimage, hash)
}

#[test]
fn single_recipient_claims_full_amount() {
    let s = setup(1_000);
    let (preimage, hash) = secret(&s.env, 1);
    let expiry = s.env.ledger().timestamp() + 1_000;

    let id = s.client.create_envelope(
        &s.sender,
        &s.token,
        &500,
        &1,
        &hash,
        &expiry,
        &SplitMode::Equal,
    );

    // Escrow holds the funds; sender debited.
    assert_eq!(s.token_client.balance(&s.sender), 500);

    let recipient = Address::generate(&s.env);
    let amount = s.client.claim(&id, &recipient, &preimage);

    assert_eq!(amount, 500);
    assert_eq!(s.token_client.balance(&recipient), 500);

    let env = s.client.get_envelope(&id);
    assert_eq!(env.status, EnvelopeStatus::Completed);
    assert_eq!(env.remaining_amount, 0);
    assert_eq!(s.client.total_envelopes(), 1);
}

#[test]
fn equal_split_pays_each_slot_evenly() {
    let s = setup(10_000);
    let (preimage, hash) = secret(&s.env, 2);
    let expiry = s.env.ledger().timestamp() + 1_000;

    let id = s.client.create_envelope(
        &s.sender,
        &s.token,
        &300,
        &3,
        &hash,
        &expiry,
        &SplitMode::Equal,
    );

    let mut total_paid = 0i128;
    for _ in 0..3 {
        let r = Address::generate(&s.env);
        total_paid += s.client.claim(&id, &r, &preimage);
    }

    assert_eq!(total_paid, 300);
    let env = s.client.get_envelope(&id);
    assert_eq!(env.remaining_amount, 0);
    assert_eq!(env.status, EnvelopeStatus::Completed);
}

#[test]
fn random_split_sums_to_total_and_each_positive() {
    let s = setup(1_000_000);
    let (preimage, hash) = secret(&s.env, 3);
    let expiry = s.env.ledger().timestamp() + 1_000;
    let slots = 5u32;
    let total = 1_000i128;

    let id = s.client.create_envelope(
        &s.sender,
        &s.token,
        &total,
        &slots,
        &hash,
        &expiry,
        &SplitMode::Random,
    );

    let mut sum = 0i128;
    for _ in 0..slots {
        let r = Address::generate(&s.env);
        let amt = s.client.claim(&id, &r, &preimage);
        assert!(amt >= 1, "every slot must receive at least one unit");
        sum += amt;
    }

    assert_eq!(sum, total, "random split must distribute exactly the total");
    assert_eq!(s.client.get_envelope(&id).remaining_amount, 0);
}

#[test]
fn double_claim_by_same_recipient_is_rejected() {
    let s = setup(10_000);
    let (preimage, hash) = secret(&s.env, 4);
    let expiry = s.env.ledger().timestamp() + 1_000;

    let id = s.client.create_envelope(
        &s.sender, &s.token, &300, &3, &hash, &expiry, &SplitMode::Equal,
    );

    let r = Address::generate(&s.env);
    s.client.claim(&id, &r, &preimage);

    let res = s.client.try_claim(&id, &r, &preimage);
    assert_eq!(res, Err(Ok(Error::AlreadyClaimed)));
}

#[test]
fn wrong_preimage_is_rejected() {
    let s = setup(10_000);
    let (_preimage, hash) = secret(&s.env, 5);
    let expiry = s.env.ledger().timestamp() + 1_000;

    let id = s.client.create_envelope(
        &s.sender, &s.token, &100, &1, &hash, &expiry, &SplitMode::Equal,
    );

    let r = Address::generate(&s.env);
    let wrong = Bytes::from_array(&s.env, &[0xAB; 32]);
    let res = s.client.try_claim(&id, &r, &wrong);
    assert_eq!(res, Err(Ok(Error::InvalidPreimage)));
}

#[test]
fn claim_after_expiry_is_rejected_then_sender_refunds() {
    let s = setup(10_000);
    let (preimage, hash) = secret(&s.env, 6);
    let expiry = s.env.ledger().timestamp() + 1_000;

    let id = s.client.create_envelope(
        &s.sender, &s.token, &400, &2, &hash, &expiry, &SplitMode::Equal,
    );

    // One slot claimed before expiry.
    let r = Address::generate(&s.env);
    assert_eq!(s.client.claim(&id, &r, &preimage), 200);

    // Fast-forward past expiry.
    s.env.ledger().with_mut(|li| li.timestamp = expiry + 1);

    let late = Address::generate(&s.env);
    assert_eq!(s.client.try_claim(&id, &late, &preimage), Err(Ok(Error::Expired)));

    let sender_before = s.token_client.balance(&s.sender);
    let refunded = s.client.refund(&id);
    assert_eq!(refunded, 200, "unclaimed remainder returns to sender");
    assert_eq!(s.token_client.balance(&s.sender), sender_before + 200);
    assert_eq!(s.client.get_envelope(&id).status, EnvelopeStatus::Refunded);
}

#[test]
fn refund_before_expiry_is_rejected() {
    let s = setup(10_000);
    let (_preimage, hash) = secret(&s.env, 7);
    let expiry = s.env.ledger().timestamp() + 1_000;

    let id = s.client.create_envelope(
        &s.sender, &s.token, &100, &1, &hash, &expiry, &SplitMode::Equal,
    );

    assert_eq!(s.client.try_refund(&id), Err(Ok(Error::NotYetExpired)));
}

#[test]
fn create_is_blocked_while_paused() {
    let s = setup(10_000);
    let (_preimage, hash) = secret(&s.env, 8);
    let expiry = s.env.ledger().timestamp() + 1_000;

    s.client.pause();
    assert!(s.client.is_paused());

    let res = s.client.try_create_envelope(
        &s.sender, &s.token, &100, &1, &hash, &expiry, &SplitMode::Equal,
    );
    assert_eq!(res, Err(Ok(Error::Paused)));

    s.client.unpause();
    // Works again after unpause.
    let id = s.client.create_envelope(
        &s.sender, &s.token, &100, &1, &hash, &expiry, &SplitMode::Equal,
    );
    assert_eq!(id, 1);
}

#[test]
fn invalid_create_parameters_are_rejected() {
    let s = setup(10_000);
    let (_preimage, hash) = secret(&s.env, 9);
    let now = s.env.ledger().timestamp();
    let expiry = now + 1_000;

    // amount <= 0
    assert_eq!(
        s.client.try_create_envelope(&s.sender, &s.token, &0, &1, &hash, &expiry, &SplitMode::Equal),
        Err(Ok(Error::InvalidAmount))
    );
    // more slots than units
    assert_eq!(
        s.client.try_create_envelope(&s.sender, &s.token, &5, &10, &hash, &expiry, &SplitMode::Equal),
        Err(Ok(Error::InvalidSlots))
    );
    // expiry in the past
    assert_eq!(
        s.client.try_create_envelope(&s.sender, &s.token, &100, &1, &hash, &now, &SplitMode::Equal),
        Err(Ok(Error::InvalidExpiry))
    );
}
