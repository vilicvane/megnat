export const CHAIN_LIST_URL = 'https://chainid.network/chains.json';

export const CHAIN_EXPLORER_URL_FALLBACK = 'https://blockscan.com/tx/';

export const INFURA_SUBDOMAIN_DICT: Record<string, string | undefined> = {
  'eip155:1': 'mainnet',
  'eip155:42161': 'arbitrum-mainnet',
  'eip155:43114': 'avalanche-mainnet',
  'eip155:8453': 'base-mainnet',
  'eip155:56': 'bsc-mainnet',
  'eip155:42220': 'celo-mainnet',
  'eip155:59144': 'linea-mainnet',
  'eip155:5000': 'mantle-mainnet',
  'eip155:204': 'opbnb-mainnet',
  'eip155:10': 'optimism-mainnet',
  'eip155:137': 'polygon-mainnet',
  'eip155:534352': 'scroll-mainnet',
  'eip155:23294': 'swellchain-mainnet',
  'eip155:1984': 'unichain-mainnet',
  'eip155:324': 'zksync-mainnet',
};

export function INFURA_RPC_ENDPOINT(subdomain: string, key: string): string {
  return `https://${subdomain}.infura.io/v3/${key}`;
}
