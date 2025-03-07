import {router, useLocalSearchParams} from 'expo-router';
import React from 'react';
import {ScrollView, ToastAndroid, View} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {Appbar, List, useTheme} from 'react-native-paper';

import {useEntrances} from '@/entrances';
import {
  useWalletKitPendingSessionRequests,
  useWalletKitSessions,
  WalletKitService,
} from '@/services/wallet-kit-service';
import {RPC_METHOD_DISPLAY_NAME} from '@/core/chain';
import {
  QRCodeInputModal,
  useQRCodeInputModalProps,
} from '@/components/qrcode-input-modal';
import {AsyncButton, AsyncIconButton} from '@/components/ui/async-buttons';
import {UIService} from '@/services/ui-service';

export default function WalletAccountScreen() {
  const {address} = useLocalSearchParams<{address: string}>();

  const {walletKitService, uiService, walletStorageService} = useEntrances();

  const pendingSessionRequests = useWalletKitPendingSessionRequests(
    walletKitService,
    address,
  );

  const sessions = useWalletKitSessions(walletKitService, address);

  const derivationPath =
    walletStorageService.getWalletByAddress(address)?.derivation.path;

  const theme = useTheme();

  const [qrCodeInputModalProps, openQrCodeInputModal] =
    useQRCodeInputModalProps();

  return (
    <>
      <QRCodeInputModal {...qrCodeInputModalProps} />
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Wallet account" />
      </Appbar.Header>
      <ScrollView contentContainerStyle={{flexGrow: 1}}>
        <List.Section title="Account">
          <List.Item
            title="Address"
            description={address}
            titleNumberOfLines={0}
            onPress={() => void copy(address).catch(console.error)}
          />
          {derivationPath && (
            <List.Item
              title="Derivation path"
              description={derivationPath}
              onPress={() => void copy(derivationPath).catch(console.error)}
            />
          )}
        </List.Section>
        {pendingSessionRequests.length > 0 && (
          <List.Section title="Pending requests">
            {pendingSessionRequests.map(({request}) => (
              <List.Item
                key={request.id}
                title={RPC_METHOD_DISPLAY_NAME(request.params.request.method)}
                description={request.id}
                onPress={() => {
                  router.push({
                    pathname: '/view-request',
                    params: {requestId: request.id},
                  });
                }}
                left={({style}) => (
                  <List.Icon
                    icon="clock"
                    color={theme.colors.primary}
                    style={style}
                  />
                )}
              />
            ))}
          </List.Section>
        )}
        {sessions.length > 0 && (
          <List.Section title="Sessions">
            {sessions.map(session => (
              <List.Item
                key={session.topic}
                title={
                  session.peer.metadata.name ||
                  new URL(session.peer.metadata.url).hostname
                }
                description={session.peer.metadata.url}
                left={({style}) => (
                  <List.Icon
                    icon="web"
                    color={theme.colors.primary}
                    style={style}
                  />
                )}
                right={({style}) => (
                  <AsyncIconButton
                    icon="close"
                    style={{...style, marginRight: -8}}
                    handler={() => walletKitService.disconnect(session.topic)}
                  />
                )}
              />
            ))}
          </List.Section>
        )}
      </ScrollView>
      <View style={{margin: 16, position: 'fixed'}}>
        <AsyncButton
          mode="contained"
          handler={async () => {
            const uri = await openQrCodeInputModal(/^wc:/);

            if (!uri) {
              return;
            }

            await connect(uiService, walletKitService, uri, address);
          }}
        >
          Connect
        </AsyncButton>
      </View>
    </>
  );
}

async function copy(text: string) {
  await Clipboard.setStringAsync(text);

  ToastAndroid.show('Copied to clipboard', ToastAndroid.SHORT);
}

async function connect(
  uiService: UIService,
  walletKitService: WalletKitService,
  uri: string,
  address: string,
) {
  const message = await walletKitService.connect(uri, address);

  if (!message) {
    return;
  }

  uiService.state.pendingSessionAuthentication = message;

  router.push({
    pathname: '/session-authenticate',
  });
}
