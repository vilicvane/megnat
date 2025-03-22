import {ethers} from 'ethers';

export function extractAddressesFromDecodedTransaction(
  {fragment, args}: ethers.TransactionDescription,
  ignoreZeroAddress = true,
): string[] {
  const addresses: string[] = [];

  for (const [index, type] of fragment.inputs.entries()) {
    type.walk(args[index], (type, value) => {
      if (type === 'address') {
        if (ignoreZeroAddress && value === ethers.ZeroAddress) {
          return;
        }

        addresses.push(ethers.getAddress(value));
      }
    });
  }

  return addresses;
}
