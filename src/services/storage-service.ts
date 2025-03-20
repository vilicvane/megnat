import AsyncStorage from '@react-native-async-storage/async-storage';

import type {CustomChain, ListedChain, Wallet} from '../core/index.js';

export class StorageService {
  async get<TKey extends keyof Mapping>(
    key: TKey,
  ): Promise<Mapping[TKey] | undefined> {
    const value = await AsyncStorage.getItem(key);
    return value ? JSON.parse(value) : undefined;
  }

  async set<TKey extends keyof Mapping>(
    key: TKey,
    value: Mapping[TKey],
  ): Promise<void> {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  }
}

type Mapping = {
  wallets: Wallet[];
  customChains: CustomChain[];
  listedChains: ListedChain[];
  infuraKey: string;
};
