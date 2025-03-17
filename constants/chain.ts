export const CHAIN_EXPLORER_URL_FALLBACK = 'https://blockscan.com/tx/';

export type ChainMetadata = {
  name: string;
  explorer?: string;
};

export const CHAIN_METADATA_DICT: Record<string, ChainMetadata | undefined> = {
  'eip155:1': {
    name: 'Ethereum',
    explorer: 'https://etherscan.io/tx/',
  },
  'eip155:61': {
    name: 'Ethereum Classic',
    explorer: 'https://etc.blockscout.com/tx/',
  },
  'eip155:42161': {
    name: 'Arbitrum',
    explorer: 'https://arbiscan.io/tx/',
  },
  'eip155:8453': {
    name: 'Base',
    explorer: 'https://basescan.org/tx/',
  },
  'eip155:56': {
    name: 'BNB Chain',
    explorer: 'https://bscscan.com/tx/',
  },
  'eip155:59144': {
    name: 'Linea',
    explorer: 'https://lineascan.build/tx/',
  },
  'eip155:137': {
    name: 'Polygon',
    explorer: 'https://polygonscan.com/tx/',
  },
  'eip155:10': {
    name: 'Optimism',
    explorer: 'https://optimistic.etherscan.io/tx/',
  },
  'eip155:100': {
    name: 'Gnosis Chain',
    explorer: 'https://gnosisscan.io/tx/',
  },
};
