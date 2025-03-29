import {ethers} from 'ethers';
import {useEffect, useMemo, useState} from 'react';

import type {Wallet, WalletDerivation} from '../core/index.js';

import type {StorageService} from './storage-service.js';

export class WalletStorageService {
  constructor(
    private storage: StorageService,
    private wallets: Wallet[],
  ) {}

  async addWallets(newWallets: Wallet[]): Promise<void> {
    const existingPublicKeySet = new Set(
      this.wallets.map(wallet => wallet.publicKey),
    );

    for (const wallet of newWallets) {
      if (existingPublicKeySet.has(wallet.publicKey)) {
        continue;
      }

      this.wallets.push(wallet);
    }

    this.emitUpdate();

    await this.storage.set('wallets', this.wallets);
  }

  async addWallet(wallet: Wallet): Promise<void> {
    await this.addWallets([wallet]);
  }

  async removeWallet(publicKey: string): Promise<void> {
    const index = this.wallets.findIndex(
      wallet => wallet.publicKey === publicKey,
    );

    if (index < 0) {
      throw new Error('Wallet not found.');
    }

    this.wallets.splice(index, 1);

    this.emitUpdate();

    await this.storage.set('wallets', this.wallets);
  }

  getWallets(): Wallet[] {
    return [...this.wallets];
  }

  getWalletByWalletPublicKey(publicKey: string): Wallet | undefined {
    return this.wallets.find(wallet => wallet.publicKey === publicKey);
  }

  requireWalletByWalletPublicKey(publicKey: string): Wallet {
    const wallet = this.getWalletByWalletPublicKey(publicKey);

    if (!wallet) {
      throw new Error('Wallet not found.');
    }

    return wallet;
  }

  getWalletByAddress(
    address: string,
  ): {wallet: Wallet; derivation: WalletDerivation} | undefined {
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

  async renameWallet(walletPublicKey: string, name: string): Promise<void> {
    const wallet = this.requireWalletByWalletPublicKey(walletPublicKey);

    wallet.name = name;

    this.emitUpdate();

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
      path,
      address: ethers.computeAddress(`0x${publicKey}`),
      publicKey,
    };

    wallet.derivations.push(derivation);

    this.emitUpdate();

    await this.storage.set('wallets', this.wallets);

    return derivation;
  }

  async removeDerivation(walletPublicKey: string, path: string): Promise<void> {
    const wallet = this.requireWalletByWalletPublicKey(walletPublicKey);

    const index = wallet.derivations.findIndex(
      derivation => derivation.path === path,
    );

    if (index < 0) {
      throw new Error('Derivation not found.');
    }

    wallet.derivations.splice(index, 1);

    this.emitUpdate();

    await this.storage.set('wallets', this.wallets);
  }

  private updateCallbackSet = new Set<() => void>();

  onUpdate(callback: () => void): () => void {
    this.updateCallbackSet.add(callback);

    return () => {
      this.updateCallbackSet.delete(callback);
    };
  }

  emitUpdate(): void {
    this.updateCallbackSet.forEach(callback => callback());
  }

  static async create(storage: StorageService): Promise<WalletStorageService> {
    const wallets = await storage.get('wallets');

    return new WalletStorageService(storage, wallets ?? []);
  }
}

export function useWallets(service: WalletStorageService): Wallet[] {
  const [wallets, setWallets] = useState(() => service.getWallets());

  useEffect(
    () => service.onUpdate(() => setWallets(service.getWallets())),
    [service],
  );

  return wallets;
}

export function useWalletAddressSet(
  service: WalletStorageService,
): Set<string> {
  const wallets = useWallets(service);

  return useMemo(
    () =>
      new Set(
        wallets.flatMap(wallet =>
          wallet.derivations.map(derivation => derivation.address),
        ),
      ),
    [wallets],
  );
}
