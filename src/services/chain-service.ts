import {ethers} from 'ethers';

import {
  CHAIN_EXPLORER_URL_FALLBACK,
  CHAIN_LIST_URL,
  INFURA_RPC_ENDPOINT,
  INFURA_SUBDOMAIN_DICT,
} from '../constants/index.js';
import type {CustomChain, ListedChain} from '../core/index.js';
import {useEventUpdateValue} from '../hooks/index.js';
import {
  Event,
  eip155ChainIdToBigInt,
  eip155ChainIdToString,
} from '../utils/index.js';

import type {StorageService} from './storage-service.js';

type CommunityJsonRpcProviderConstructor = new (
  network: ethers.Networkish,
) => ethers.JsonRpcProvider;

const COMMUNITY_PROVIDERS: CommunityJsonRpcProviderConstructor[] = [
  ethers.ChainstackProvider,
  ethers.InfuraProvider,

  // not working when testing
  // ethers.AlchemyProvider,
  // ethers.CloudflareProvider,
  // ethers.QuickNodeProvider,
  // ethers.PocketProvider,
];

export class ChainService {
  private customChainMap: Map<string, CustomChain>;
  private aggregatedCustomChainMap!: Map<string, CustomChain>;
  private listedChainMap: Map<string, ListedChain>;

  private infuraKey: string | undefined;

  private constructor(
    private storageService: StorageService,
    customChains: CustomChain[] = [],
    listedChains: ListedChain[] = [],
    {infuraKey}: {infuraKey: string | undefined},
  ) {
    this.infuraKey = infuraKey;

    this.customChainMap = new Map(customChains.map(chain => [chain.id, chain]));

    this.updateCustomChains();

    this.listedChainMap = new Map(listedChains.map(chain => [chain.id, chain]));

    void this.fetchChainList();
  }

  getRPC(chainId: string): ethers.JsonRpcProvider | undefined {
    const rpc = this.aggregatedCustomChainMap.get(chainId)?.rpc;

    if (rpc) {
      console.info('selected custom JSON RPC provider', rpc);
      return new ethers.JsonRpcProvider(rpc);
    }

    const eip155ChainId = eip155ChainIdToBigInt(chainId);

    const constructors = [...COMMUNITY_PROVIDERS];

    while (constructors.length > 0) {
      const [Constructor] = constructors.splice(
        Math.floor(Math.random() * constructors.length),
        1,
      );

      try {
        const provider = new Constructor(eip155ChainId);

        console.info('selected community JSON RPC provider', Constructor.name);

        return provider;
      } catch (error) {
        // ...
      }
    }

    return undefined;
  }

  getChainDisplayName(chainId: string): string | undefined {
    return (
      this.customChainMap.get(chainId)?.name ||
      this.listedChainMap.get(chainId)?.name ||
      undefined
    );
  }

  getTransactionURL(chainId: string, txHash: string): string {
    const url =
      this.listedChainMap.get(chainId)?.explorer ?? CHAIN_EXPLORER_URL_FALLBACK;

    return `${url}/tx/${txHash}`;
  }

  readonly keyUpdate = new Event<void>('key-update');

  getInfuraKey(): string | undefined {
    return this.infuraKey;
  }

  async setInfuraKey(key: string): Promise<void> {
    this.infuraKey = key || undefined;

    this.updateCustomChains();

    this.keyUpdate.emit();

    await this.storageService.set('infuraKey', key);
  }

  private updateCustomChains(): void {
    const infuraKey = this.infuraKey;

    const aggregatedCustomChains = [
      ...(infuraKey
        ? Object.entries(INFURA_SUBDOMAIN_DICT as Record<string, string>).map(
            ([chainId, subdomain]): CustomChain => {
              return {
                id: chainId,
                name: undefined,
                rpc: INFURA_RPC_ENDPOINT(subdomain, infuraKey),
              };
            },
          )
        : []),
      ...this.customChainMap.values(),
    ];

    console.info('aggregated custom chains', aggregatedCustomChains);

    this.aggregatedCustomChainMap = new Map(
      aggregatedCustomChains.map(chain => [chain.id, chain]),
    );

    this.customChainUpdate.emit();
  }

  readonly customChainUpdate = new Event<void>('custom-chain-update');

  getCustomChains(): CustomChain[] {
    return Array.from(this.customChainMap.values());
  }

  getCustomChain(id: string): CustomChain | undefined {
    return this.customChainMap.get(id);
  }

  async addCustomChain(chain: CustomChain): Promise<void> {
    this.customChainMap.set(chain.id, chain);

    this.updateCustomChains();

    this.customChainUpdate.emit();

    await this.storageService.set('customChains', this.getCustomChains());
  }

  async removeCustomChain(chainId: string): Promise<void> {
    this.customChainMap.delete(chainId);

    this.updateCustomChains();

    this.customChainUpdate.emit();

    await this.storageService.set('customChains', this.getCustomChains());
  }

  readonly chainListUpdate = new Event<void>('chain-list-update');

  private async fetchChainList(): Promise<void> {
    const response = await fetch(CHAIN_LIST_URL);

    const rawChains: {
      name: string;
      title?: string;
      chainId: number;
      explorers?: {
        name: string;
        url: string;
        standard: string;
      }[];
    }[] = await response.json();

    const chains = rawChains.map((rawChain): ListedChain => {
      const chainId = eip155ChainIdToString(BigInt(rawChain.chainId));
      const name = rawChain.title || rawChain.name;
      const explorer = rawChain.explorers?.find(
        explorer => explorer.standard === 'EIP3091',
      )?.url;

      return {
        id: chainId,
        name,
        explorer,
      };
    });

    this.listedChainMap = new Map(chains.map(chain => [chain.id, chain]));

    this.chainListUpdate.emit();

    void this.storageService.set('listedChains', chains);
  }

  static async create(storageService: StorageService): Promise<ChainService> {
    const customChains = await storageService.get('customChains');
    const listedChains = await storageService.get('listedChains');

    const infuraKey = await storageService.get('infuraKey');

    return new ChainService(storageService, customChains, listedChains, {
      infuraKey,
    });
  }
}

export function useCustomChains(service: ChainService): CustomChain[] {
  return useEventUpdateValue(service.customChainUpdate, () =>
    service.getCustomChains(),
  );
}

export function useChainDisplayName(
  chainService: ChainService,
  chainId: string,
): string | undefined {
  return useEventUpdateValue(
    [chainService.chainListUpdate, chainService.customChainUpdate],
    () => chainService.getChainDisplayName(chainId),
  );
}
