import {ethers} from 'ethers';

export function extractAddressesFromDecodedTransaction(
  {fragment, args}: ethers.TransactionDescription,
  transactionAddresses: string[],
  ignoreZeroAddress = true,
): string[] {
  const transactionAddressSet = new Set(
    transactionAddresses.map(address => ethers.getAddress(address)),
  );

  const addressSet = new Set<string>();

  for (const [index, type] of fragment.inputs.entries()) {
    type.walk(args[index], (type, value) => {
      if (type !== 'address') {
        return;
      }

      if (ignoreZeroAddress && value === ethers.ZeroAddress) {
        return;
      }

      if (transactionAddressSet.has(value)) {
        return;
      }

      addressSet.add(value);
    });
  }

  return Array.from(addressSet);
}
