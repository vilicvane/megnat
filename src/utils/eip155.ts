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
