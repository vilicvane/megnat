import type {PendingRequestTypes, SessionTypes} from '@walletconnect/types';
import {ethers} from 'ethers';
import {router} from 'expo-router';
import {openBrowserAsync} from 'expo-web-browser';
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
import {extractAddressesFromMessage, isValidUTF8} from '../../utils/index.js';
import {AddressesListItem} from '../addresses-list-item.js';
import {SessionVerification} from '../session-verification.js';
import {AsyncButton, ListItemWithDescriptionBlock} from '../ui/index.js';

export type SignMessageProps = {
  session: SessionTypes.Struct;
  request: PendingRequestTypes.Struct;
};

export function SignMessage({session, request}: SignMessageProps): ReactNode {
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

  address = ethers.getAddress(address);

  const data = Buffer.from(dataHex.slice(2), 'hex');

  const message = isValidUTF8(data) ? data.toString() : dataHex;

  const otherAddresses = extractAddressesFromMessage(message, address);

  const wallet = walletStorageService.getWalletByAddress(address);

  const chainName = useChainDisplayName(chainService, chainId);

  const signDisabled = !wallet;

  return (
    <>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={title} />
      </Appbar.Header>
      <SessionVerification
        metadata={session.peer.metadata}
        context={request.verifyContext}
      />
      <ScrollView contentContainerStyle={{flexGrow: 1}}>
        <List.Section>
          <List.Item title="Chain" description={chainName} />
          <List.Item
            title="Signer"
            description={address}
            descriptionNumberOfLines={1}
            descriptionEllipsizeMode="middle"
          />
          <ListItemWithDescriptionBlock
            title="Message"
            description={message}
            dataToCopy={message}
          />
          {otherAddresses.length > 0 && (
            <AddressesListItem
              addresses={otherAddresses}
              titlePrefix="Other"
              titleSuffix="in message"
              onAddressPress={address =>
                openBrowserAsync(chainService.getAddressURL(chainId, address))
              }
            />
          )}
        </List.Section>
        <View
          style={{
            margin: 16,
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
          <AsyncButton
            mode="contained"
            disabled={signDisabled}
            buttonColor={theme.colors.primaryContainer}
            style={{flex: 1, flexBasis: 0}}
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
