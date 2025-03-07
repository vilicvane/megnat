import {createContext, useContext} from 'react';

import {ChainService} from './services/chain-service';
import {StorageService} from './services/storage-service';
import {WalletKitService} from './services/wallet-kit-service';
import {WalletStorageService} from './services/wallet-storage-service';
import {UIService} from './services/ui-service';

export type EntrancesOptions = {
  walletKit: {
    projectId: string;
  };
};

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

export const EntrancesContext = createContext<
  Awaited<ReturnType<typeof createEntrances>>
>(undefined!);

export function useEntrances() {
  const entrances = useContext(EntrancesContext);

  if (!entrances) {
    throw new Error('Entrances not provided.');
  }

  return entrances;
}
