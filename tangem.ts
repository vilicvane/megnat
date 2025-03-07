import {ethers} from 'ethers';
import {NativeModules} from 'react-native';
import {Wallet} from './core/wallet';

export const tangem = NativeModules.TangemModule as TangemModule;

export type TangemModule = {
  scan(): Promise<TangemScanResponse>;
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
  purgeAllWallets(options: {cardId: string}): Promise<{}>;
  sign(options: {
    walletPublicKey: string;
    hashes: string[];
    derivationPath?: string;
  }): Promise<TangemSignResponse>;
};

export type TangemScanResponse = {
  cardId: string;
  wallets: TangemWallet[];
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

export function tangemWalletToWallet({
  curve,
  publicKey,
  chainCode: originalChainCode,
  derivedKeys,
}: TangemWallet): Wallet | undefined {
  if (curve !== 'secp256k1') {
    return undefined;
  }

  let chainCode = /^0+$/.test(originalChainCode)
    ? undefined
    : originalChainCode;

  const [derivationPath, addressPublicKey] = chainCode
    ? [DERIVATION_PATH_DEFAULT, derivedKeys[DERIVATION_PATH_DEFAULT].publicKey]
    : [undefined, publicKey];

  const address = ethers.computeAddress('0x' + addressPublicKey);

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
