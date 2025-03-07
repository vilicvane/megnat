import AsyncStorage from '@react-native-async-storage/async-storage';

import {Chain} from '@/core/chain';
import {Wallet} from '@/core/wallet';

export class StorageService {
  async get<TKey extends keyof Mapping>(
    key: TKey,
  ): Promise<Mapping[TKey] | undefined> {
    const value = await AsyncStorage.getItem(key);
    return value ? JSON.parse(value) : undefined;
  }

  async set<TKey extends keyof Mapping>(key: TKey, value: Mapping[TKey]) {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  }
}

type Mapping = {
  wallets: Wallet[];
  chains: Chain[];
};
