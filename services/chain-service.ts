import {ethers} from 'ethers';

import type {Chain} from '../core/index.js';

import type {StorageService} from './storage-service.js';

const EXPLORER_URL_FALLBACK = 'https://blockscan.com/tx/';

function BUILTIN_RPC_ENDPOINT(chain: string): string {
  return `https://${chain}.infura.io/v3/a7eb273f0619465ab088062876f728d6`;
}

const BUILTIN_CHAINS: Chain[] = [
  {
    id: 'eip155:1',
    name: 'Ethereum',
    rpc: BUILTIN_RPC_ENDPOINT('mainnet'),
    explorer: 'https://etherscan.io/tx/',
  },
  {
    id: 'eip155:10',
    name: 'Optimism',
    rpc: BUILTIN_RPC_ENDPOINT('optimism-mainnet'),
    explorer: 'https://optimistic.etherscan.io/tx/',
  },
  {
    id: 'eip155:56',
    name: 'BNB Smart Chain',
    rpc: BUILTIN_RPC_ENDPOINT('bsc-mainnet'),
    explorer: 'https://bscscan.com/tx/',
  },
  {
    id: 'eip155:137',
    name: 'Polygon',
    rpc: BUILTIN_RPC_ENDPOINT('polygon-mainnet'),
    explorer: 'https://polygonscan.com/tx/',
  },
  {
    id: 'eip155:8453',
    name: 'Base',
    rpc: BUILTIN_RPC_ENDPOINT('base-mainnet'),
    explorer: 'https://basescan.org/tx/',
  },
  {
    id: 'eip155:42161',
    name: 'Arbitrum',
    rpc: BUILTIN_RPC_ENDPOINT('arbitrum-mainnet'),
    explorer: 'https://arbiscan.io/tx/',
  },
];

export class ChainService {
  private chainMap: Map<string, Chain>;

  private constructor(chains: Chain[]) {
    this.chainMap = new Map(
      [...BUILTIN_CHAINS, ...chains].map(chain => [chain.id, chain]),
    );
  }

  getRPC(chainId: string): ethers.JsonRpcProvider | undefined {
    const rpc = this.chainMap.get(chainId)?.rpc;

    return rpc ? new ethers.JsonRpcProvider(rpc) : undefined;
  }

  getName(chainId: string): string {
    return this.chainMap.get(chainId)?.name ?? chainId;
  }

  getExplorerURL(chainId: string, txHash: string): string {
    const url = this.chainMap.get(chainId)?.explorer ?? EXPLORER_URL_FALLBACK;
    return url + txHash;
  }

  static async create(storageService: StorageService): Promise<ChainService> {
    const chains = await storageService.get('chains');

    return new ChainService(chains ?? []);
  }
}
