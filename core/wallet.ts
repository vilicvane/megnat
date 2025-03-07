export type Wallet = {
  name: string;
  publicKey: string;
  chainCode: string | undefined;
  derivations: WalletDerivation[];
};

export type WalletDerivation = {
  path: string | undefined;
  address: string;
  publicKey: string;
};
