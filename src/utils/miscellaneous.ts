import {ethers} from 'ethers';

export function extractAddressesFromMessage(
  message: string,
  signerAddress: string,
): string[] {
  signerAddress = signerAddress.toLowerCase();

  return Array.from(
    new Set(
      message
        .match(/\b0x[a-f\d]{40}\b/gi)
        ?.map(address => address.toLowerCase()) ?? [],
    ),
  )
    .filter(address => address !== signerAddress)
    .map(address => ethers.getAddress(address));
}
