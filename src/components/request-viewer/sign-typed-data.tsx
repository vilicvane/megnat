import type {PendingRequestTypes} from '@walletconnect/types';
import {router} from 'expo-router';
import type {ReactNode} from 'react';
import {ScrollView, ToastAndroid, View} from 'react-native';
import {Appbar, List} from 'react-native-paper';

import type {Wallet, WalletDerivation} from '../../core/index.js';
import {TangemSigner} from '../../core/index.js';
import {useEntrances} from '../../entrances.js';
import {
  type WalletKitService,
  useChainDisplayName,
} from '../../services/index.js';
import {useTheme} from '../../theme.js';
import {AsyncButton, ListItemWithDescriptionBlock} from '../ui/index.js';

export type SignTypedDataProps = {
  request: PendingRequestTypes.Struct;
};

export function SignTypedData({request}: SignTypedDataProps): ReactNode {
  const theme = useTheme();

  const {chainService, walletKitService, walletStorageService} = useEntrances();

  const {
    params: {
      chainId,
      request: {params},
    },
  } = request;

  const [address, dataJSON] = params as [string, string];

  const data = JSON.parse(dataJSON) as TypedData;

  const wallet = walletStorageService.getWalletByAddress(address);

  const chainName = useChainDisplayName(chainService, chainId);

  const signDisabled = !wallet;

  return (
    <>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Sign typed data" />
      </Appbar.Header>
      <ScrollView contentContainerStyle={{flexGrow: 1}}>
        <List.Section>
          <List.Item title="Chain" description={chainName} />
          <List.Item title="Signer" description={address} />
          <List.Item title="Domain" description={data.domain.name} />
          <ListItemWithDescriptionBlock
            title="Message"
            description={JSON.stringify(data.message, null, 2)}
            dataToCopy={dataJSON}
          />
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
            buttonColor={theme.colors.secondary}
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
                walletKitService,
                wallet!.wallet,
                wallet!.derivation,
                request,
                data,
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
  walletKitService: WalletKitService,
  wallet: Wallet,
  walletDerivation: WalletDerivation,
  request: PendingRequestTypes.Struct,
  {domain, types, message}: TypedData,
): Promise<void> {
  const signer = new TangemSigner(
    undefined,
    wallet.publicKey,
    walletDerivation,
  );

  types = {
    ...types,
  };

  delete types.EIP712Domain;

  const signature = await signer.signTypedData(domain, types, message);

  await walletKitService.completeSessionRequest(request, signature);

  ToastAndroid.show('Typed data signed', ToastAndroid.SHORT);

  router.back();
}

type TypedData = {
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: string;
  };
  message: any;
  primaryType: string;
  types: Record<string, any>;
};
