import {ethers} from 'ethers';
import {NativeModules} from 'react-native';

import type {Wallet} from './core/index.js';

export const tangem = NativeModules.TangemModule as TangemModule;

export type TangemModule = {
  scan(): Promise<TangemCardResponse>;
  createWallet(options: {
    curve?: string;
    privateKey?: string;
    mnemonic?: string;
  }): Promise<TangemImportResponse>;
  deriveWallet(options: {
    walletPublicKey: string;
    derivationPath: string;
  }): Promise<TangemDeriveWalletResponse>;
  setAccessCode(options: {cardId: string; accessCode?: string}): Promise<{}>;
  purgeWallet(options: {cardId: string; walletPublicKey: string}): Promise<{}>;
  resetToFactorySettings(options: {cardId: string}): Promise<{}>;
  sign(options: {
    walletPublicKey: string;
    hashes: string[];
    derivationPath?: string;
  }): Promise<TangemSignResponse>;
  readPrimaryCardToBackup(options: {cardId: string}): Promise<{}>;
  addBackupCard(): Promise<TangemCardResponse>;
  setAccessCodeForBackup(options: {}): Promise<{}>;
  proceedBackup(): Promise<{}>;
  savePasskeyPublicKeys(options: {passkeyPublicKeys: string[]}): Promise<{}>;
};

export type TangemCardResponse = {
  cardId: string;
  wallets: TangemWallet[];
  backupStatus:
    | {
        status: 'active' | 'cardLinked';
        cardsCount: string;
      }
    | {
        status: 'noBackup';
      };
  firmwareVersion: {
    stringValue: string;
  };
  manufacturer: {
    manufactureDate: string;
  };
};

export type TangemImportResponse = {
  cardId: string;
  wallet: TangemWallet;
};

export type TangemDeriveWalletResponse = {
  chainCode: string;
  childNumber: number;
  depth: number;
  parentFingerprint: string;
  publicKey: string;
};

export type TangemSignResponse = {
  signatures: string[];
};

export type TangemResetBackupResponse = {
  isDefaultPasscode: boolean;
  settingsMask: string[];
  backupStatus: 'NoBackup' | 'CardLinked' | 'Active';
  isDefaultAccessCode: boolean;
  cardId: string;
};

export type TangemWallet = {
  isImported: boolean;
  derivedKeys: Record<
    string,
    {
      parentFingerprint: string;
      depth: number;
      childNumber: number;
      chainCode: string;
      publicKey: string;
    }
  >;
  hasBackup: boolean;
  index: number;
  totalSignedHashes: number;
  settings: {
    isPermanent: boolean;
  };
  publicKey: string;
  curve: string;
  chainCode: string;
};

export const DERIVATION_PATH_DEFAULT = "m/44'/60'/0'/0/0";

export const DERIVATION_PATH_PATTERN = /^m\/44'\/\d+'\/\d+'\/\d+\/\d+$/;

export function tangemWalletToWallet({
  curve,
  publicKey,
  chainCode: originalChainCode,
  derivedKeys,
}: TangemWallet): Wallet | undefined {
  if (curve !== 'secp256k1') {
    return undefined;
  }

  const chainCode = /^0+$/.test(originalChainCode)
    ? undefined
    : originalChainCode;

  const [derivationPath, addressPublicKey] = chainCode
    ? [DERIVATION_PATH_DEFAULT, derivedKeys[DERIVATION_PATH_DEFAULT].publicKey]
    : [undefined, publicKey];

  const address = ethers.computeAddress(`0x${addressPublicKey}`);

  return {
    name: address.slice(0, 8).toLowerCase(),
    publicKey,
    chainCode,
    derivations: [
      {
        path: derivationPath,
        address,
        publicKey: addressPublicKey,
      },
    ],
  };
}

export function tangemWalletsToWallets(wallets: TangemWallet[]): Wallet[] {
  return wallets
    .map(tangemWalletToWallet)
    .filter(wallet => wallet !== undefined);
}
