export function eip155ChainIdToBigInt(chainId: string): bigint {
  const [, chain] = chainId.match(/^eip155:(\d+)$/) ?? [];

  if (!chain) {
    throw new Error(`Unexpected chain ID: ${chainId}`);
  }

  return BigInt(chain);
}

export function eip155ChainIdToString(chainId: bigint): string {
  return `eip155:${chainId.toString()}`;
}

export function getEIP155ChainIdPrefix(address: string): string {
  const [, chainId] = address.match(/^(eip155:\d+):/) ?? [];

  if (!chainId) {
    throw new Error(`Unexpected address: ${address}`);
  }

  return chainId;
}

export function removeEIP155ChainIdPrefix(address: string): string {
  return address.replace(/^eip155:\d+:/, '');
}
