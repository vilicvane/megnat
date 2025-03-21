import type {PendingRequestTypes, SessionTypes} from '@walletconnect/types';
import {ethers, formatEther, toBigInt} from 'ethers';
import * as Clipboard from 'expo-clipboard';
import {router} from 'expo-router';
import {openBrowserAsync} from 'expo-web-browser';
import {type ReactNode, useState} from 'react';
import {Alert, ScrollView, View} from 'react-native';
import {Appbar, List} from 'react-native-paper';

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
import {eip155ChainIdToBigInt} from '../../utils/index.js';
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
          {data && data !== '0x' && <TransactionDataListItem data={data} />}
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

export function TransactionDataListItem({data}: {data: string}): ReactNode {
  const decodedData = useAsyncValue(() => decodeTransactionData(data), [data]);

  return (
    <ListItemWithDescriptionBlock
      title="Data"
      description={decodedData ?? data}
      dataToCopy={data}
    />
  );
}

const SIGNATURE_HASH_BYTE_LIKE_LENGTH = 10;

async function decodeTransactionData(
  data: string,
): Promise<string | undefined> {
  if (data.length < SIGNATURE_HASH_BYTE_LIKE_LENGTH) {
    return undefined;
  }

  const signatureHash = data.slice(0, SIGNATURE_HASH_BYTE_LIKE_LENGTH);

  const {results: signatures} = await fetch(
    `https://www.4byte.directory/api/v1/signatures/?hex_signature=${signatureHash}&ordering=created_at`,
  ).then(response => response.json());

  const decoded = (() => {
    for (const signature of signatures) {
      const iface = new ethers.Interface([
        `function ${signature.text_signature}`,
      ]);
      try {
        return iface.parseTransaction({data});
      } catch {
        continue;
      }
    }

    return undefined;
  })();

  if (!decoded) {
    return undefined;
  }

  return (
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
      .replace(/\]$/, ')')
  );
}
