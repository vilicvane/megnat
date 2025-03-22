import {ethers} from 'ethers';

export function extractAddressesFromDecodedTransaction(
  {fragment, args}: ethers.TransactionDescription,
  signerAddress: string,
  ignoreZeroAddress = true,
): string[] {
  signerAddress = ethers.getAddress(signerAddress);

  const addresses: string[] = [];

  for (const [index, type] of fragment.inputs.entries()) {
    type.walk(args[index], (type, value) => {
      if (type !== 'address') {
        return;
      }

      if (ignoreZeroAddress && value === ethers.ZeroAddress) {
        return;
      }

      if (value === signerAddress) {
        return;
      }

      addresses.push(value);
    });
  }

  return addresses;
}
