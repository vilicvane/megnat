import type {PendingRequestTypes} from '@walletconnect/types';
import type {ethers} from 'ethers';
import {formatEther, toBigInt} from 'ethers';
import * as Clipboard from 'expo-clipboard';
import {router} from 'expo-router';
import {openBrowserAsync} from 'expo-web-browser';
import type {ReactNode} from 'react';
import {Alert, ScrollView, View} from 'react-native';
import {Appbar, List} from 'react-native-paper';

import type {Wallet, WalletDerivation} from '../../core/index.js';
import {TangemSigner} from '../../core/index.js';
import {useEntrances} from '../../entrances.js';
import {useAsyncValueUpdate} from '../../hooks/index.js';
import {
  type ChainService,
  type WalletKitService,
  useChainDisplayName,
} from '../../services/index.js';
import {eip155ChainIdToBigInt} from '../../utils/index.js';
import {AsyncButton, ListItemWithDescriptionBlock} from '../ui/index.js';

export type SendTransactionProps = {
  request: PendingRequestTypes.Struct;
};

export function SendTransaction({request}: SendTransactionProps): ReactNode {
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

  const provider = chainService.getRPC(chainId);

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

  const gasLimit = toBigInt(gasLimitHex);
  const maxFeePerGas = feeData?.maxFeePerGas ?? feeData?.gasPrice;

  const maxGasText = maxFeePerGas ? formatEther(gasLimit * maxFeePerGas) : '-';
  const estimatedGasFeeText =
    feeData?.gasPrice && feeData.gasPrice !== maxFeePerGas
      ? formatEther(gasLimit * feeData.gasPrice)
      : undefined;

  const signDisabled = !wallet || !provider || !feeData;

  return (
    <>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Send transaction" />
      </Appbar.Header>
      <ScrollView contentContainerStyle={{flexGrow: 1}}>
        <List.Section>
          <List.Item title="Chain" description={chainName} />
          <List.Item title="From" description={from} />
          <List.Item title="To" description={to} />
          {data && (
            <ListItemWithDescriptionBlock title="Data" description={data} />
          )}
          <List.Item title="Gas limit" description={gasLimit.toString()} />
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
            mode="elevated"
            style={{flex: 1, flexBasis: 0}}
            handler={() => reject(walletKitService, request)}
          >
            Reject
          </AsyncButton>
          <AsyncButton
            mode="contained"
            style={{flex: 1, flexBasis: 0}}
            disabled={signDisabled}
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
    gasLimit: bigint;
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
            chainService.getExplorerURL(request.params.chainId, hash),
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
