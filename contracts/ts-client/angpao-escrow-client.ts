/**
 * Reference TypeScript client for the AngpaoEscrow Soroban contract.
 *
 * It mirrors the app's existing pattern (see `src/server/service/*`): the server
 * *builds and prepares* an invoke transaction and returns the XDR; the browser
 * signs it with Freighter; the server submits the signed XDR. No secret keys
 * ever touch the server.
 *
 * Wire-up (drop into `src/server/soroban/` and import from a route handler):
 *   const client = new AngpaoEscrowClient({
 *     rpcUrl: process.env.SOROBAN_RPC_URL!,
 *     contractId: process.env.SOROBAN_ESCROW_CONTRACT_ID!,
 *     networkPassphrase: process.env.STELLAR_NETWORK_PASSPHRASE!,
 *   });
 *   const xdr = await client.buildCreateEnvelope({ ... });   // → Freighter signs
 *   const res = await client.submit(signedXdr);
 *
 * Depends only on `@stellar/stellar-sdk`, already a dependency of the app.
 */
import {
  Account,
  Address,
  BASE_FEE,
  Contract,
  Keypair,
  nativeToScVal,
  rpc,
  scValToNative,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk';

export type SplitMode = 'Equal' | 'Random';

export interface AngpaoEscrowConfig {
  rpcUrl: string;
  contractId: string;
  networkPassphrase: string;
}

export interface CreateEnvelopeArgs {
  /** Public key (G...) of the funder; must sign the returned XDR. */
  sender: string;
  /** USDC Stellar Asset Contract (SAC) id (C...). */
  token: string;
  /** Amount in minor units (USDC = 6 decimals), as bigint or decimal string. */
  totalAmount: bigint | string;
  /** Number of claim slots (1 = single-recipient gift). */
  totalSlots: number;
  /** sha256(preimage) as a 32-byte buffer or 64-char hex string. */
  secretHash: Uint8Array | string;
  /** Unix seconds after which claims close and refund opens. */
  expiry: number | bigint;
  split: SplitMode;
}

export interface ClaimArgs {
  envelopeId: bigint | number;
  /** Recipient public key; must sign the returned XDR. */
  recipient: string;
  /** The secret preimage as bytes or hex string. */
  preimage: Uint8Array | string;
}

/**
 * `SplitMode` is a `#[contracttype]` enum with explicit integer discriminants
 * (`Equal = 0`, `Random = 1`), so Soroban serializes it as a plain `u32` — not
 * the `Vec[Symbol]` form used by data-carrying enums.
 */
function splitToScVal(split: SplitMode): xdr.ScVal {
  return nativeToScVal(split === 'Random' ? 1 : 0, { type: 'u32' });
}

function toBytes(input: Uint8Array | string): Buffer {
  if (typeof input === 'string') return Buffer.from(input, 'hex');
  return Buffer.from(input);
}

export class AngpaoEscrowClient {
  private readonly server: rpc.Server;
  private readonly contract: Contract;
  private readonly networkPassphrase: string;

  constructor(config: AngpaoEscrowConfig) {
    this.server = new rpc.Server(config.rpcUrl, {
      allowHttp: config.rpcUrl.startsWith('http://'),
    });
    this.contract = new Contract(config.contractId);
    this.networkPassphrase = config.networkPassphrase;
  }

  /** Build + simulate + assemble an invoke tx, returning unsigned XDR. */
  private async buildInvoke(
    source: string,
    method: string,
    args: xdr.ScVal[],
  ): Promise<string> {
    const account: Account = await this.server.getAccount(source);
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(this.contract.call(method, ...args))
      // Generous bound: the user signs in Freighter between build and submit.
      .setTimeout(600)
      .build();

    // prepareTransaction simulates, then attaches the Soroban footprint,
    // resource fees, and auth entries required to submit.
    const prepared = await this.server.prepareTransaction(tx);
    return prepared.toXDR();
  }

  buildCreateEnvelope(args: CreateEnvelopeArgs): Promise<string> {
    const scArgs: xdr.ScVal[] = [
      new Address(args.sender).toScVal(),
      new Address(args.token).toScVal(),
      nativeToScVal(BigInt(args.totalAmount), { type: 'i128' }),
      nativeToScVal(args.totalSlots, { type: 'u32' }),
      xdr.ScVal.scvBytes(toBytes(args.secretHash)),
      nativeToScVal(BigInt(args.expiry), { type: 'u64' }),
      splitToScVal(args.split),
    ];
    return this.buildInvoke(args.sender, 'create_envelope', scArgs);
  }

  buildClaim(args: ClaimArgs): Promise<string> {
    const scArgs: xdr.ScVal[] = [
      nativeToScVal(BigInt(args.envelopeId), { type: 'u64' }),
      new Address(args.recipient).toScVal(),
      xdr.ScVal.scvBytes(toBytes(args.preimage)),
    ];
    return this.buildInvoke(args.recipient, 'claim', scArgs);
  }

  buildRefund(sender: string, envelopeId: bigint | number): Promise<string> {
    const scArgs: xdr.ScVal[] = [nativeToScVal(BigInt(envelopeId), { type: 'u64' })];
    return this.buildInvoke(sender, 'refund', scArgs);
  }

  /** Submit a Freighter-signed XDR and poll until the tx is applied. */
  async submit(signedXdr: string): Promise<rpc.Api.GetTransactionResponse> {
    const tx = TransactionBuilder.fromXDR(signedXdr, this.networkPassphrase);
    const sent = await this.server.sendTransaction(tx);
    if (sent.status === 'ERROR') {
      throw new Error(`Soroban submit failed: ${JSON.stringify(sent.errorResult)}`);
    }
    let got = await this.server.getTransaction(sent.hash);
    while (got.status === 'NOT_FOUND') {
      await new Promise((r) => setTimeout(r, 1000));
      got = await this.server.getTransaction(sent.hash);
    }
    return got;
  }

  /** Read an envelope via simulation (no fees, no signature). */
  async getEnvelope(envelopeId: bigint | number): Promise<unknown> {
    // Read-only stand-in source: a throwaway valid key that never signs/pays.
    const account = new Account(Keypair.random().publicKey(), '0');
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(
        this.contract.call('get_envelope', nativeToScVal(BigInt(envelopeId), { type: 'u64' })),
      )
      .setTimeout(60)
      .build();

    const sim = await this.server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(sim)) {
      throw new Error(`simulate get_envelope failed: ${sim.error}`);
    }
    const retval = sim.result?.retval;
    return retval ? scValToNative(retval) : null;
  }
}
