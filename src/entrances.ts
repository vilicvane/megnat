import {createContext, useContext} from 'react';

import {
  ChainService,
  StorageService,
  UIService,
  WalletKitService,
  WalletStorageService,
} from './services/index.js';

export type EntrancesOptions = {
  walletKit: {
    projectId: string;
  };
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function createEntrances({
  walletKit: walletKitOptions,
}: EntrancesOptions) {
  const uiService = new UIService();
  const storageService = new StorageService();

  return {
    uiService,
    chainService: await ChainService.create(storageService),
    walletKitService: await WalletKitService.create(walletKitOptions.projectId),
    walletStorageService: await WalletStorageService.create(storageService),
  };
}

export const entrancesPromise = createEntrances({
  walletKit: {
    projectId: '00ce63cc0e5e65fcc7a50c8bd80c6403',
  },
});

export const EntrancesContext = createContext<
  Awaited<ReturnType<typeof createEntrances>>
>(undefined!);

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useEntrances() {
  const entrances = useContext(EntrancesContext);

  if (!entrances) {
    throw new Error('Entrances not provided.');
  }

  return entrances;
}
