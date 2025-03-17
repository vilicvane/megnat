import {ethers} from 'ethers';

import {
  CHAIN_EXPLORER_URL_FALLBACK,
  CHAIN_METADATA_DICT,
} from '../constants/index.js';
import type {Chain} from '../core/index.js';
import {eip155ChainIdToBigInt, eip155ChainIdToString} from '../utils/index.js';

import type {InfuraStorageData, StorageService} from './storage-service.js';

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
  private chainMap: Map<string, Chain>;

  private constructor(
    chains: Chain[],
    {infura}: {infura: InfuraStorageData | undefined},
  ) {
    chains = [
      ...(infura
        ? infura.chains.map(chain => {
            const id = eip155ChainIdToString(BigInt(chain.id));

            return {
              id,
              name: chain.name,
              rpc: INFURA_RPC_ENDPOINT(chain.subdomain, infura.key),
              explorer:
                CHAIN_METADATA_DICT[id]?.explorer ??
                CHAIN_EXPLORER_URL_FALLBACK,
            };
          })
        : []),
      ...chains,
    ];

    this.chainMap = new Map(chains.map(chain => [chain.id, chain]));
  }

  getRPC(chainId: string): ethers.JsonRpcProvider | undefined {
    const rpc = this.chainMap.get(chainId)?.rpc;

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

  getNetworkText(chainId: string): string {
    const name =
      this.chainMap.get(chainId)?.name ?? CHAIN_METADATA_DICT[chainId]?.name;

    if (name) {
      return `${name} (${chainId})`;
    } else {
      return chainId;
    }
  }

  getExplorerURL(chainId: string, txHash: string): string {
    const url =
      this.chainMap.get(chainId)?.explorer ??
      CHAIN_METADATA_DICT[chainId]?.explorer ??
      CHAIN_EXPLORER_URL_FALLBACK;

    return url + txHash;
  }

  static async create(storageService: StorageService): Promise<ChainService> {
    const chains = await storageService.get('chains');

    const infura = await storageService.get('infura');

    return new ChainService(chains ?? [], {infura});
  }
}

function INFURA_RPC_ENDPOINT(subdomain: string, key: string): string {
  return `https://${subdomain}.infura.io/v3/${key}`;
}
