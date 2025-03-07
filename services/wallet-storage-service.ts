import {ethers} from 'ethers';

import {Wallet, WalletDerivation} from '@/core/wallet';

import {StorageService} from './storage-service';

export class WalletStorageService {
  constructor(private storage: StorageService, private wallets: Wallet[]) {}

  async addWallets(newWallets: Wallet[]) {
    const existingPublicKeySet = new Set(
      this.wallets.map(wallet => wallet.publicKey),
    );

    for (const wallet of newWallets) {
      if (existingPublicKeySet.has(wallet.publicKey)) {
        continue;
      }

      this.wallets.push(wallet);
    }

    await this.storage.set('wallets', this.wallets);
  }

  async addWallet(wallet: Wallet) {
    await this.addWallets([wallet]);
  }

  async removeWallet(publicKey: string) {
    const index = this.wallets.findIndex(
      wallet => wallet.publicKey === publicKey,
    );

    if (index < 0) {
      throw new Error('Wallet not found.');
    }

    this.wallets.splice(index, 1);

    await this.storage.set('wallets', this.wallets);
  }

  getWallets() {
    return [...this.wallets];
  }

  getWalletByWalletPublicKey(publicKey: string) {
    return this.wallets.find(wallet => wallet.publicKey === publicKey);
  }

  requireWalletByWalletPublicKey(publicKey: string) {
    const wallet = this.getWalletByWalletPublicKey(publicKey);

    if (!wallet) {
      throw new Error('Wallet not found.');
    }

    return wallet;
  }

  getWalletByAddress(address: string) {
    address = ethers.getAddress(address);

    for (const wallet of this.wallets) {
      for (const derivation of wallet.derivations) {
        if (derivation.address === address) {
          return {wallet, derivation};
        }
      }
    }

    return undefined;
  }

  async renameWallet(walletPublicKey: string, name: string) {
    const wallet = this.requireWalletByWalletPublicKey(walletPublicKey);

    wallet.name = name;

    await this.storage.set('wallets', this.wallets);
  }

  async addDerivation(
    walletPublicKey: string,
    path: string,
    publicKey: string,
  ): Promise<WalletDerivation> {
    const wallet = this.requireWalletByWalletPublicKey(walletPublicKey);

    if (wallet.derivations.some(derivation => derivation.path === path)) {
      throw new Error('Derivation already exists.');
    }

    const derivation = {
      path: path,
      address: ethers.computeAddress('0x' + publicKey),
      publicKey,
    };

    wallet.derivations.push(derivation);

    await this.storage.set('wallets', this.wallets);

    return derivation;
  }

  async removeDerivation(walletPublicKey: string, path: string) {
    const wallet = this.requireWalletByWalletPublicKey(walletPublicKey);

    const index = wallet.derivations.findIndex(
      derivation => derivation.path === path,
    );

    if (index < 0) {
      throw new Error('Derivation not found.');
    }

    wallet.derivations.splice(index, 1);

    await this.storage.set('wallets', this.wallets);
  }

  static async create(storage: StorageService) {
    const wallets = await storage.get('wallets');

    return new WalletStorageService(storage, wallets ?? []);
  }
}
