import type {PendingRequestTypes, SessionTypes} from '@walletconnect/types';
import {ethers, formatEther, formatUnits, parseUnits, toBigInt} from 'ethers';
import * as Clipboard from 'expo-clipboard';
import {router} from 'expo-router';
import {openBrowserAsync} from 'expo-web-browser';
import {type ReactNode, useEffect, useMemo, useState} from 'react';
import {Alert, ScrollView, View} from 'react-native';
import type {ListItemProps} from 'react-native-paper';
import {Appbar, Button, IconButton, List, Text} from 'react-native-paper';
import useEvent from 'react-use-event-hook';

import {MEGNAT_API_URL} from '../../constants/index.js';
import {TangemSigner} from '../../core/index.js';
import {useEntrances} from '../../entrances.js';
import {asyncEffect, useAsyncValue} from '../../hooks/index.js';
import {
  type ChainService,
  type WalletKitService,
  useChainDisplayName,
  useWalletByAddress,
} from '../../services/index.js';
import {useTheme} from '../../theme.js';
import {
  bigintMin,
  eip155ChainIdToBigInt,
  extractAddressesFromDecodedTransaction,
  isReactNativeError,
  toMaxSignificant,
} from '../../utils/index.js';
import {AddressesListItem} from '../addresses-list-item.js';
import {SessionVerification} from '../session-verification.js';
import {
  AsyncButton,
  AsyncIconButton,
  InputModal,
  ListItemWithDescriptionBlock,
  useInputModalProps,
} from '../ui/index.js';

const MAX_GAS_SIGNIFICANT_DIGITS = 4;

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

  let [{from, to, data, value, nonce, gas: gasLimitHex, ...suggestedFeeData}] =
    params as [
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

  from = ethers.getAddress(from);
  to = ethers.getAddress(to);

  const wallet = useWalletByAddress(walletStorageService, from);

  const chainName = useChainDisplayName(chainService, chainId);

  const [provider] = useState(() => chainService.getRPC(chainId));

  const signer = useMemo(() => {
    if (!wallet) {
      return undefined;
    }

    return new TangemSigner(
      provider,
      wallet.wallet.publicKey,
      wallet.derivation,
    );
  }, [provider, wallet]);

  const [transaction, setTransaction] = useState(
    (): ethers.TransactionRequest & {
      gasLimit?: bigint;
      maxFeePerGas?: bigint;
      maxPriorityFeePerGas?: bigint;
      gasPrice?: bigint;
    } => {
      const {gasPrice, maxFeePerGas, maxPriorityFeePerGas} = suggestedFeeData;

      const eip1559 =
        maxFeePerGas !== undefined && maxPriorityFeePerGas !== undefined;

      return {
        chainId: eip155ChainId,
        to,
        data,
        value,
        nonce: nonce ? parseInt(nonce) : undefined,
        gasLimit: gasLimitHex ? toBigInt(gasLimitHex) : undefined,
        ...(eip1559
          ? {
              maxFeePerGas: toBigInt(maxFeePerGas),
              maxPriorityFeePerGas: toBigInt(maxPriorityFeePerGas),
              gasPrice: undefined,
            }
          : {
              maxFeePerGas: undefined,
              maxPriorityFeePerGas: undefined,
              gasPrice: gasPrice ? toBigInt(gasPrice) : undefined,
            }),
      };
    },
  );

  const [latestBaseFeePerGas, setLatestBaseFeePerGas] = useState<bigint>();

  const [ready, setReady] = useState(false);

  const updateFeeData = useEvent(async () => {
    if (!signer) {
      return;
    }

    const feeData = await signer.provider!.getFeeData();

    const eip1559 =
      feeData.maxFeePerGas != null && feeData.maxPriorityFeePerGas != null;

    const filteredFeeData = eip1559
      ? {
          maxFeePerGas: feeData.maxFeePerGas,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
          gasPrice: undefined,
        }
      : {
          maxFeePerGas: undefined,
          maxPriorityFeePerGas: undefined,
          gasPrice: feeData.gasPrice ?? undefined,
        };

    setTransaction(transaction => {
      return {
        ...transaction,
        ...filteredFeeData,
      };
    });
  });

  const updateLatestBaseFeePerGas = useEvent(async () => {
    if (!signer) {
      return;
    }

    const block = await signer.provider!.getBlock('latest');

    if (block) {
      setLatestBaseFeePerGas(block.baseFeePerGas ?? undefined);
    }
  });

  useEffect(
    () =>
      asyncEffect(async ({signal}) => {
        if (!signer) {
          return;
        }

        if (transaction.gasLimit === undefined) {
          const gasLimit = await signer.estimateGas(transaction);

          if (signal.aborted) {
            return;
          }

          setTransaction(transaction => {
            return {
              ...transaction,
              gasLimit,
            };
          });
        }

        await Promise.all([
          transaction.maxFeePerGas === undefined &&
            transaction.gasPrice === undefined &&
            updateFeeData(),
          transaction.gasPrice === undefined && updateLatestBaseFeePerGas(),
        ]);

        setReady(true);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const gasLimit = transaction.gasLimit ?? undefined;
  const gasLimitText = gasLimit?.toString();

  const maxFeePerGasText =
    transaction.maxFeePerGas !== undefined
      ? `${formatUnits(toMaxSignificant(transaction.maxFeePerGas, MAX_GAS_SIGNIFICANT_DIGITS), 'gwei')} gwei`
      : undefined;

  const maxGasFeeText =
    transaction.maxFeePerGas !== undefined
      ? gasLimit
        ? `${formatEther(toMaxSignificant(gasLimit * transaction.maxFeePerGas, MAX_GAS_SIGNIFICANT_DIGITS))} (${maxFeePerGasText})`
        : `Unknown (${maxFeePerGasText})`
      : undefined;

  const estimatedFeePerGas =
    transaction.maxFeePerGas !== undefined &&
    transaction.maxPriorityFeePerGas !== undefined &&
    latestBaseFeePerGas !== undefined
      ? bigintMin(
          transaction.maxFeePerGas,
          latestBaseFeePerGas + transaction.maxPriorityFeePerGas,
        )
      : undefined;

  const estimatedGasFeeText =
    estimatedFeePerGas !== undefined
      ? gasLimit
        ? `${formatEther(toMaxSignificant(gasLimit * estimatedFeePerGas, MAX_GAS_SIGNIFICANT_DIGITS))} (${formatUnits(toMaxSignificant(estimatedFeePerGas, MAX_GAS_SIGNIFICANT_DIGITS), 'gwei')} gwei)`
        : `Unknown (${formatUnits(toMaxSignificant(estimatedFeePerGas, MAX_GAS_SIGNIFICANT_DIGITS), 'gwei')} gwei)`
      : undefined;

  const legacyGasPriceText =
    transaction.gasPrice !== undefined
      ? `${formatUnits(toMaxSignificant(transaction.gasPrice, MAX_GAS_SIGNIFICANT_DIGITS), 'gwei')} gwei`
      : undefined;

  const legacyGasFeeText =
    transaction.gasPrice !== undefined
      ? gasLimit
        ? `${formatEther(toMaxSignificant(gasLimit * transaction.gasPrice, MAX_GAS_SIGNIFICANT_DIGITS))} (${legacyGasPriceText})`
        : `Unknown (${legacyGasPriceText})`
      : undefined;

  const signDisabled = !signer || !ready;

  const [inputModalProps, openInputModal] = useInputModalProps();

  const editFeeListItemRight: ListItemProps['right'] = ({style}) => (
    <View
      style={[
        style,
        {
          marginRight: -8,
          flexDirection: 'row',
          alignItems: 'center',
        },
      ]}
    >
      <AsyncIconButton
        icon="pencil"
        style={{margin: 0}}
        handler={() =>
          openInputModal().then(value => {
            if (!value) {
              return;
            }

            const gasPrice = parseUnits(value, 'gwei');

            setTransaction(transaction => {
              return {
                ...transaction,
                maxFeePerGas: gasPrice,
                maxPriorityFeePerGas: gasPrice,
              };
            });
          })
        }
      />
      <AsyncIconButton
        icon="refresh"
        style={{margin: 0}}
        handler={async () => {
          await Promise.all([updateFeeData(), updateLatestBaseFeePerGas()]);
        }}
      />
    </View>
  );

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
          <List.Item
            title="From"
            description={from}
            descriptionNumberOfLines={1}
            descriptionEllipsizeMode="middle"
          />
          <AddressesListItem
            addresses={[to]}
            title="To"
            onAddressPress={address =>
              openBrowserAsync(chainService.getAddressURL(chainId, address))
            }
          />
          {value && (
            <List.Item title="Value" description={formatEther(value)} />
          )}
          {data && data !== '0x' && (
            <TransactionDataListItem
              chainId={chainId}
              from={from}
              to={to}
              data={data}
              provider={provider}
            />
          )}
          {gasLimitText && (
            <List.Item title="Gas limit" description={gasLimitText} />
          )}
          {maxGasFeeText && (
            <List.Item
              title="Max gas fee"
              description={maxGasFeeText}
              right={editFeeListItemRight}
            />
          )}
          {estimatedGasFeeText && (
            <List.Item
              title="Estimated gas fee"
              description={estimatedGasFeeText}
            />
          )}
          {legacyGasFeeText && (
            <List.Item
              title="Gas fee"
              description={legacyGasFeeText}
              right={editFeeListItemRight}
            />
          )}
        </List.Section>
        <View
          style={{
            padding: 16,
            marginTop: 'auto',
            flexDirection: 'row',
            gap: 10,
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
          {provider ? (
            <AsyncButton
              mode="contained"
              disabled={signDisabled}
              buttonColor={theme.colors.primaryContainer}
              style={{flex: 1, flexBasis: 0}}
              handler={() =>
                sign(
                  chainService,
                  walletKitService,
                  signer!,
                  request,
                  transaction,
                )
              }
            >
              Sign
            </AsyncButton>
          ) : (
            <Button
              mode="contained"
              buttonColor={theme.colors.primaryContainer}
              style={{flex: 1, flexBasis: 0}}
              onPress={() => {
                router.push({
                  pathname: '/edit-custom-chain',
                  params: {
                    addingChainId: chainId,
                  },
                });
              }}
            >
              Add chain
            </Button>
          )}
        </View>
      </ScrollView>
      <InputModal
        placeholder={maxFeePerGasText ?? legacyGasPriceText}
        {...inputModalProps}
      />
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
  signer: TangemSigner,
  request: PendingRequestTypes.Struct,
  transaction: ethers.TransactionRequest,
): Promise<void> {
  const {hash} = await signer
    .sendTransaction(transaction)
    .catch(tapTransactionError);

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

function tapTransactionError(error: any): never {
  let message: string | undefined;

  if ('error' in error) {
    message = error.error.message;
  } else if ('shortMessage' in error) {
    message = error.shortMessage;
  } else if (!isReactNativeError(error)) {
    message = error.message ?? String(error);
  }

  if (message) {
    Alert.alert('Transaction error', message);
  }

  throw error;
}

export function TransactionDataListItem({
  chainId,
  from,
  to,
  data,
  provider,
}: {
  chainId: string;
  from: string;
  to: string;
  data: string;
  provider: ethers.JsonRpcProvider | undefined;
}): ReactNode {
  const theme = useTheme();

  const {chainService} = useEntrances();

  const [decoded, addresses, verified] = useAsyncValue(
    () => decodeTransactionData(from, to, data, provider),
    [data, provider],
  ) ?? [data, [], undefined];

  const verifiedIcon = (() => {
    switch (verified) {
      case true:
        return {
          icon: 'check-decagram',
          color: theme.colors.primary,
          message: 'The signature is verified against contract source code.',
          loading: false,
        };
      case false:
        return {
          icon: 'alert-circle',
          color: theme.colors.warning,
          message:
            'The data is decoded but could be disguised, make sure the contract is trusted.',
          loading: false,
        };
      default:
        return {
          icon: 'check-decagram',
          color: theme.colors.onSurfaceVariant,
          message: undefined,
          loading: true,
        };
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
            <IconButton
              icon={verifiedIcon.icon}
              iconColor={verifiedIcon.color}
              size={20}
              style={{
                margin: 0,
                marginRight: -8,
                height: 20,
              }}
              loading={verifiedIcon.loading}
              onPress={
                verifiedIcon.message
                  ? () =>
                      Alert.alert(
                        'Signature verification',
                        verifiedIcon.message,
                      )
                  : undefined
              }
            />
          </View>
        }
        description={decoded}
        dataToCopy={data}
      />
      {addresses.length > 0 && (
        <AddressesListItem
          addresses={addresses}
          titlePrefix="Other"
          titleSuffix="in data"
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
  from: string,
  to: string,
  data: string,
  provider: ethers.JsonRpcProvider | undefined,
): Promise<[decoded: string, addresses: string[], verified: boolean]> {
  if (data.length < SIGNATURE_HASH_BYTE_LIKE_LENGTH) {
    return [data, [], false];
  }

  let decoded = await decodeBySourceCode(to, data);
  let verified = true;

  if (decoded === null) {
    // Could be a proxy.

    const implAddress = await getImplementationAddress(to);

    if (implAddress) {
      decoded = await decodeBySourceCode(implAddress, data);
    }
  }

  if (!decoded) {
    decoded = await decodeByFunctionSignature(data);
    verified = false;
  }

  if (!decoded) {
    return [data, [], false];
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

  const addresses = extractAddressesFromDecodedTransaction(decoded, [from, to]);

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
    contractAddress: string,
  ): Promise<string | undefined> {
    if (!provider) {
      return undefined;
    }

    // EIP-1967 implementation slot (keccak256("eip1967.proxy.implementation") - 1)
    const implSlot =
      '0x360894A13BA1A3210667C828492DB98DCA3E2076CC3735A920A3CA505D382BBC';

    const impl = await provider.getStorage(contractAddress, implSlot);

    const implAddress = `0x${impl.slice(-40)}`;

    if (implAddress === ethers.ZeroAddress) {
      return undefined;
    }

    return implAddress;
  }
}
