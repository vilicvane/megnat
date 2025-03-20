/**
 * Basically copied from ethers.js BaseWallet.
 */

import type {TransactionLike} from 'ethers';
import {
  Signature,
  Transaction,
  TypedDataEncoder,
  assertArgument,
  copyRequest,
  ethers,
  hashMessage,
  resolveAddress,
  resolveProperties,
} from 'ethers';

import {tangem} from '../tangem.js';

import type {WalletDerivation} from './wallet.js';

export class TangemSigner extends ethers.AbstractSigner {
  constructor(
    provider: ethers.Provider | undefined,
    private walletPublicKey: string,
    private derivation: WalletDerivation,
  ) {
    super(provider);
  }

  async getAddress(): Promise<string> {
    return this.derivation.address;
  }

  connect(_provider: null | ethers.Provider): ethers.Signer {
    throw new Error('Method not implemented.');
  }

  async signTransaction(request: ethers.TransactionRequest): Promise<string> {
    request = copyRequest(request);

    const {to, from} = await resolveProperties({
      to: request.to ? resolveAddress(request.to, this.provider) : undefined,
      from: request.from
        ? resolveAddress(request.from, this.provider)
        : undefined,
    });

    if (to != null) {
      request.to = to;
    }
    if (from != null) {
      request.from = from;
    }

    if (request.from != null) {
      assertArgument(
        ethers.getAddress(<string>request.from) === this.derivation.address,
        'transaction from address mismatch',
        'tx.from',
        request.from,
      );
      delete request.from;
    }

    const tx = Transaction.from(<TransactionLike<string>>request);

    const {
      signatures: [signature],
    } = await tangem.sign({
      hashes: [tx.unsignedHash],
      walletPublicKey: this.walletPublicKey,
      derivationPath: this.derivation.path,
    });

    tx.signature = this.addRecoveryBitToSignature(signature, tx.unsignedHash);

    return tx.serialized;
  }

  async signMessage(message: string | Uint8Array): Promise<string> {
    const hash = hashMessage(message);

    const {
      signatures: [tangemSignature],
    } = await tangem.sign({
      hashes: [hash],
      walletPublicKey: this.walletPublicKey,
      derivationPath: this.derivation.path,
    });

    return this.addRecoveryBitToSignature(tangemSignature, hash);
  }

  async signTypedData(
    domain: ethers.TypedDataDomain,
    types: Record<string, Array<ethers.TypedDataField>>,
    value: Record<string, any>,
  ): Promise<string> {
    const hash = TypedDataEncoder.hash(domain, types, value);

    const {
      signatures: [tangemSignature],
    } = await tangem.sign({
      hashes: [hash],
      walletPublicKey: this.walletPublicKey,
      derivationPath: this.derivation.path,
    });

    return this.addRecoveryBitToSignature(tangemSignature, hash);
  }

  private addRecoveryBitToSignature(
    tangemSignature: string,
    hash: string,
  ): string {
    const signature = Signature.from(`0x${tangemSignature}`);

    for (const v of [27, 28]) {
      signature.v = v;

      if (ethers.recoverAddress(hash, signature) === this.derivation.address) {
        return signature.serialized;
      }
    }

    throw new Error('Failed to recover address from signature.');
  }
}
