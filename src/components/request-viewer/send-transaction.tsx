import type {PendingRequestTypes, SessionTypes} from '@walletconnect/types';
import {ethers, formatEther, toBigInt} from 'ethers';
import * as Clipboard from 'expo-clipboard';
import {router} from 'expo-router';
import {openBrowserAsync} from 'expo-web-browser';
import {type ReactNode, useState} from 'react';
import {Alert, ScrollView, View} from 'react-native';
import {Appbar, IconButton, List, Text} from 'react-native-paper';

import {MEGNAT_API_URL} from '../../constants/index.js';
import type {Wallet, WalletDerivation} from '../../core/index.js';
import {TangemSigner} from '../../core/index.js';
import {useEntrances} from '../../entrances.js';
import {useAsyncValue, useAsyncValueUpdate} from '../../hooks/index.js';
import {
  type ChainService,
  type WalletKitService,
  useChainDisplayName,
} from '../../services/index.js';
import {useTheme} from '../../theme.js';
import {
  eip155ChainIdToBigInt,
  extractAddressesFromDecodedTransaction,
} from '../../utils/index.js';
import {AddressesListItem} from '../addresses-list-item.js';
import {SessionVerification} from '../session-verification.js';
import {AsyncButton, ListItemWithDescriptionBlock} from '../ui/index.js';

export type SendTransactionProps = {
  session: SessionTypes.Struct;
  request: PendingRequestTypes.Struct;
};

export function SendTransaction({
  session,
  request,
}: SendTransactionProps): ReactNode {
  const theme = useTheme();

  const {chainService, walletKitService, walletStorageService} = useEntrances();

  const {
    params: {
      chainId,
      request: {params},
    },
  } = request;

  const eip155ChainId = eip155ChainIdToBigInt(chainId);

  const [
    {from, to, data, value, nonce, gas: gasLimitHex, ...suggestedFeeData},
  ] = params as [
    {
      from: string;
      to: string;
      data: string;
      value?: string;
      nonce?: string;
      gas: string;
      gasPrice?: string;
      maxFeePerGas?: string;
      maxPriorityFeePerGas?: string;
    },
  ];

  const wallet = walletStorageService.getWalletByAddress(from);

  const chainName = useChainDisplayName(chainService, chainId);

  const [provider] = useState(() => chainService.getRPC(chainId));

  const [feeData, _updateFeeData] = useAsyncValueUpdate(async update => {
    if (!provider) {
      return undefined;
    }

    if (!update) {
      const {gasPrice, maxFeePerGas, maxPriorityFeePerGas} = suggestedFeeData;

      if (gasPrice) {
        return {
          gasPrice: toBigInt(gasPrice),
        };
      }

      if (maxFeePerGas && maxPriorityFeePerGas) {
        return {
          maxFeePerGas: toBigInt(maxFeePerGas),
          maxPriorityFeePerGas: toBigInt(maxPriorityFeePerGas),
        };
      }
    }

    return provider.getFeeData();
  });

  const gasLimit = gasLimitHex ? toBigInt(gasLimitHex) : undefined;
  const gasLimitText = gasLimit ? gasLimit.toString() : '-';

  const maxFeePerGas = feeData?.maxFeePerGas ?? feeData?.gasPrice;

  const maxGasText =
    maxFeePerGas && gasLimit ? formatEther(gasLimit * maxFeePerGas) : '-';
  const estimatedGasFeeText =
    gasLimit && feeData?.gasPrice && feeData.gasPrice !== maxFeePerGas
      ? formatEther(gasLimit * feeData.gasPrice)
      : undefined;

  const signDisabled = !wallet || !provider || !feeData;

  return (
    <>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Send transaction" />
      </Appbar.Header>
      <SessionVerification
        metadata={session.peer.metadata}
        context={request.verifyContext}
      />
      <ScrollView contentContainerStyle={{flexGrow: 1}}>
        <List.Section>
          <List.Item title="Chain" description={chainName} />
          <List.Item title="From" description={from} />
          <List.Item
            title="To"
            description={to}
            descriptionStyle={{textDecorationLine: 'underline'}}
            onPress={() =>
              openBrowserAsync(chainService.getAddressURL(chainId, to))
            }
          />
          {data && data !== '0x' && (
            <TransactionDataListItem
              chainId={chainId}
              address={to}
              data={data}
              provider={provider}
            />
          )}
          <List.Item title="Gas limit" description={gasLimitText} />
          <List.Item title="Max gas fee" description={maxGasText} />
          {estimatedGasFeeText && (
            <List.Item
              title="Estimated gas fee"
              description={estimatedGasFeeText}
            />
          )}
        </List.Section>
        <View
          style={{
            margin: 16,
            marginTop: 'auto',
            flexDirection: 'row',
            gap: 8,
          }}
        >
          <AsyncButton
            mode="contained"
            buttonColor={theme.colors.secondaryContainer}
            style={{flex: 1, flexBasis: 0}}
            handler={() => reject(walletKitService, request)}
          >
            Reject
          </AsyncButton>
          <AsyncButton
            mode="contained"
            disabled={signDisabled}
            buttonColor={theme.colors.primaryContainer}
            style={{flex: 1, flexBasis: 0}}
            handler={() =>
              sign(
                chainService,
                walletKitService,
                wallet!.wallet,
                wallet!.derivation,
                provider!,
                request,
                eip155ChainId,
                {
                  to,
                  data,
                  value: value ? toBigInt(value) : undefined,
                  nonce: nonce ? parseInt(nonce) : undefined,
                  gasLimit,
                  gasPrice: feeData?.gasPrice ?? undefined,
                  maxFeePerGas: feeData?.maxFeePerGas ?? undefined,
                  maxPriorityFeePerGas:
                    feeData?.maxPriorityFeePerGas ?? undefined,
                },
              )
            }
          >
            Sign
          </AsyncButton>
        </View>
      </ScrollView>
    </>
  );
}

async function reject(
  walletKitService: WalletKitService,
  request: PendingRequestTypes.Struct,
): Promise<void> {
  await walletKitService.rejectSessionRequest(request);

  router.back();
}

async function sign(
  chainService: ChainService,
  walletKitService: WalletKitService,
  wallet: Wallet,
  walletDerivation: WalletDerivation,
  provider: ethers.JsonRpcProvider,
  request: PendingRequestTypes.Struct,
  chainId: bigint,
  {
    to,
    data,
    value,
    nonce,
    gasLimit,
    gasPrice,
    maxFeePerGas,
    maxPriorityFeePerGas,
  }: {
    to: string;
    data: string;
    value: bigint | undefined;
    nonce: number | undefined;
    gasLimit: bigint | undefined;
    gasPrice: bigint | undefined;
    maxFeePerGas: bigint | undefined;
    maxPriorityFeePerGas: bigint | undefined;
  },
): Promise<void> {
  const signer = new TangemSigner(provider, wallet.publicKey, walletDerivation);

  const {hash} = await signer.sendTransaction({
    chainId,
    to,
    data,
    value,
    nonce,
    gasLimit,
    gasPrice:
      maxFeePerGas === undefined && maxPriorityFeePerGas === undefined
        ? gasPrice
        : undefined,
    maxFeePerGas,
    maxPriorityFeePerGas,
  });

  await walletKitService.completeSessionRequest(request, hash);

  Alert.alert(
    'Transaction sent',
    'The transaction has been sent successfully, please proceed within the dApp.',
    [
      {
        text: 'View',
        onPress: () =>
          void openBrowserAsync(
            chainService.getTransactionURL(request.params.chainId, hash),
          ),
      },
      {
        text: 'Copy',
        onPress: () => void Clipboard.setStringAsync(hash),
      },
      {
        text: 'OK',
        onPress: () => {},
      },
    ],
  );

  router.back();
}

export function TransactionDataListItem({
  chainId,
  address,
  data,
  provider,
}: {
  chainId: string;
  address: string;
  data: string;
  provider: ethers.JsonRpcProvider | undefined;
}): ReactNode {
  const theme = useTheme();

  const {chainService} = useEntrances();

  const [decoded, addresses, verified] = useAsyncValue(
    () => decodeTransactionData(address, data, provider),
    [data, provider],
  ) ?? [data, [], undefined];

  const verifiedIcon = (() => {
    switch (verified) {
      case true:
        return {
          icon: 'check-decagram',
          color: theme.colors.primary,
          message: 'The signature is verified against contract source code.',
        };
      case false:
        return {
          icon: 'alert-circle',
          color: theme.colors.warning,
          message:
            'The data is decoded but could be disguised, make sure the contract is trusted.',
        };
      default:
        return undefined;
    }
  })();

  return (
    <>
      <ListItemWithDescriptionBlock
        title={
          <View
            style={{
              width: '100%',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text style={{fontSize: 16}}>Data</Text>
            {verifiedIcon && (
              <IconButton
                icon={verifiedIcon.icon}
                iconColor={verifiedIcon.color}
                size={20}
                style={{
                  margin: 0,
                  marginRight: -8,
                  height: 20,
                }}
                onPress={() =>
                  Alert.alert('Signature verification', verifiedIcon.message)
                }
              />
            )}
          </View>
        }
        description={decoded}
        dataToCopy={data}
      />
      {addresses.length > 0 && (
        <AddressesListItem
          addresses={addresses}
          titleSuffix=" in data"
          onAddressPress={address =>
            openBrowserAsync(chainService.getAddressURL(chainId, address))
          }
        />
      )}
    </>
  );
}

const SIGNATURE_HASH_BYTE_LIKE_LENGTH = 10;

async function decodeTransactionData(
  address: string,
  data: string,
  provider: ethers.JsonRpcProvider | undefined,
): Promise<
  [decoded: string, addresses: string[], verified: boolean] | undefined
> {
  if (data.length < SIGNATURE_HASH_BYTE_LIKE_LENGTH) {
    return undefined;
  }

  let decoded = await decodeBySourceCode(address, data);
  let verified = true;

  if (decoded === null) {
    // Could be a proxy.

    const implAddress = await getImplementationAddress(address);

    if (implAddress) {
      decoded = await decodeBySourceCode(implAddress, data);
    }
  }

  if (!decoded) {
    decoded = await decodeByFunctionSignature(data);
    verified = false;
  }

  if (!decoded) {
    return undefined;
  }

  const decodedData =
    decoded.name +
    JSON.stringify(
      decoded.args,
      (_key, value) => {
        if (typeof value === 'bigint') {
          return `${value.toString()}n`;
        }

        return value;
      },
      2,
    )
      .replace(/^\[/, '(')
      .replace(/\]$/, ')');

  const addresses = extractAddressesFromDecodedTransaction(decoded);

  return [decodedData, addresses, verified];

  async function decodeBySourceCode(
    address: string,
    data: string,
  ): Promise<ethers.TransactionDescription | null | undefined> {
    const iface = await fetch(
      `${MEGNAT_API_URL}/etherscan?module=contract&action=getabi&address=${address}`,
    ).then(async response => {
      if (!response.ok) {
        console.error(
          response.status,
          response.statusText,
          await response.text(),
        );

        return undefined;
      }

      const {status, result} = await response.json();

      if (status === '0') {
        return undefined;
      }

      return new ethers.Interface(JSON.parse(result));
    });

    if (!iface) {
      return undefined;
    }

    return iface.parseTransaction({data});
  }

  async function decodeByFunctionSignature(
    data: string,
  ): Promise<ethers.TransactionDescription | undefined> {
    const signatureHash = data.slice(0, SIGNATURE_HASH_BYTE_LIKE_LENGTH);

    const {results: signatures} = await fetch(
      `https://www.4byte.directory/api/v1/signatures/?hex_signature=${signatureHash}&ordering=created_at`,
    ).then(response => {
      if (!response.ok) {
        throw new Error('Failed to fetch signatures.');
      }

      return response.json();
    });

    for (const signature of signatures) {
      const iface = new ethers.Interface([
        `function ${signature.text_signature}`,
      ]);
      try {
        return iface.parseTransaction({data}) ?? undefined;
      } catch {
        continue;
      }
    }

    return undefined;
  }

  async function getImplementationAddress(
    address: string,
  ): Promise<string | undefined> {
    if (!provider) {
      return undefined;
    }

    // EIP-1967 implementation slot (keccak256("eip1967.proxy.implementation") - 1)
    const implSlot =
      '0x360894A13BA1A3210667C828492DB98DCA3E2076CC3735A920A3CA505D382BBC';

    const impl = await provider.getStorage(address, implSlot);

    const implAddress = `0x${impl.slice(-40)}`;

    if (implAddress === ethers.ZeroAddress) {
      return undefined;
    }

    return implAddress;
  }
}
