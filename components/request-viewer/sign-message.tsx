import React from 'react';
import {Alert, ScrollView, View} from 'react-native';
import {Appbar, List} from 'react-native-paper';
import {router} from 'expo-router';
import {PendingRequestTypes} from '@walletconnect/types';

import {useEntrances} from '@/entrances';
import {WalletKitService} from '@/services/wallet-kit-service';
import {TangemSigner} from '@/core/tangem-signer';
import {Wallet, WalletDerivation} from '@/core/wallet';
import {AsyncButton} from '@/components/ui/async-buttons';
import {ListItemWithDescriptionBlock} from '@/components/ui/list-item-with-description-block';
import {isValidUTF8} from '@/utils/utf8';
import {RPC_METHOD_DISPLAY_NAME} from '@/core/chain';

export type SignMessageProps = {
  request: PendingRequestTypes.Struct;
};

export function SignMessage({request}: SignMessageProps) {
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

  const chainName = chainService.getName(chainId);

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
          <ListItemWithDescriptionBlock title="Message" description={message} />
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
) {
  await walletKitService.rejectSessionRequest(request);

  router.back();
}

async function sign(
  walletKitService: WalletKitService,
  wallet: Wallet,
  walletDerivation: WalletDerivation,
  request: PendingRequestTypes.Struct,
  data: Buffer,
) {
  const signer = new TangemSigner(
    undefined,
    wallet.publicKey,
    walletDerivation,
  );

  const signature = await signer.signMessage(data);

  await walletKitService.completeSessionRequest(request, signature);

  Alert.alert(
    'Message signed',
    'The message has been signed successfully, please proceed within the dApp.',
  );

  router.back();
}
