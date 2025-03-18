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
  private listedChainMap: Map<string, ListedChain>;

  private constructor(
    private storageService: StorageService,
    customChains: CustomChain[] = [],
    listedChains: ListedChain[] = [],
    {infuraKey}: {infuraKey: string | undefined},
  ) {
    customChains = [
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
      ...customChains,
    ];

    this.customChainMap = new Map(customChains.map(chain => [chain.id, chain]));
    this.listedChainMap = new Map(listedChains.map(chain => [chain.id, chain]));

    void this.fetchChainList();
  }

  getRPC(chainId: string): ethers.JsonRpcProvider | undefined {
    const rpc = this.customChainMap.get(chainId)?.rpc;

    if (rpc) {
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

  getExplorerURL(chainId: string, txHash: string): string {
    const url =
      this.listedChainMap.get(chainId)?.explorer ?? CHAIN_EXPLORER_URL_FALLBACK;

    return url + txHash;
  }

  readonly chainListUpdate = new Event<void>('chainListUpdate');

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

    const chains = rawChains.map((chain): ListedChain => {
      const chainId = eip155ChainIdToString(BigInt(chain.chainId));
      const name = chain.title || chain.name;
      const explorer = chain.explorers?.find(
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

export function useChainDisplayName(
  chainService: ChainService,
  chainId: string,
): string | undefined {
  return useEventUpdateValue(chainService.chainListUpdate, () =>
    chainService.getChainDisplayName(chainId),
  );
}
