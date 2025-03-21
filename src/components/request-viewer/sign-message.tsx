import type {PendingRequestTypes} from '@walletconnect/types';
import {router} from 'expo-router';
import type {ReactNode} from 'react';
import React from 'react';
import {ScrollView, ToastAndroid, View} from 'react-native';
import {Appbar, List} from 'react-native-paper';

import {RPC_METHOD_DISPLAY_NAME} from '../../constants/index.js';
import type {Wallet, WalletDerivation} from '../../core/index.js';
import {TangemSigner} from '../../core/index.js';
import {useEntrances} from '../../entrances.js';
import {
  type WalletKitService,
  useChainDisplayName,
} from '../../services/index.js';
import {useTheme} from '../../theme.js';
import {isValidUTF8} from '../../utils/index.js';
import {AsyncButton, ListItemWithDescriptionBlock} from '../ui/index.js';

export type SignMessageProps = {
  request: PendingRequestTypes.Struct;
};

export function SignMessage({request}: SignMessageProps): ReactNode {
  const theme = useTheme();

  const {chainService, walletKitService, walletStorageService} = useEntrances();

  const {
    params: {
      chainId,
      request: {method, params},
    },
  } = request;

  const title = RPC_METHOD_DISPLAY_NAME(method);

  let address: string;
  let dataHex: string;

  if (method === 'personal_sign') {
    [dataHex, address] = params;
  } else {
    [address, dataHex] = params;
  }

  const data = Buffer.from(dataHex.slice(2), 'hex');

  const message = isValidUTF8(data) ? data.toString() : dataHex;

  const wallet = walletStorageService.getWalletByAddress(address);

  const chainName = useChainDisplayName(chainService, chainId);

  const signDisabled = !wallet;

  return (
    <>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={title} />
      </Appbar.Header>
      <ScrollView contentContainerStyle={{flexGrow: 1}}>
        <List.Section>
          <List.Item title="Chain" description={chainName} />
          <List.Item title="Signer" description={address} />
          <ListItemWithDescriptionBlock
            title="Message"
            description={message}
            dataToCopy={message}
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
  data: Buffer,
): Promise<void> {
  const signer = new TangemSigner(
    undefined,
    wallet.publicKey,
    walletDerivation,
  );

  const signature = await signer.signMessage(data);

  await walletKitService.completeSessionRequest(request, signature);

  ToastAndroid.show('Message signed', ToastAndroid.SHORT);

  router.back();
}
