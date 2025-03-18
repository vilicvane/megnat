import * as Clipboard from 'expo-clipboard';
import {router, useLocalSearchParams} from 'expo-router';
import type {ReactNode} from 'react';
import {Alert, ScrollView, ToastAndroid, View} from 'react-native';
import {Appbar, IconButton, List, Text} from 'react-native-paper';

import {
  QRCodeInputModal,
  useQRCodeInputModalProps,
} from '../components/qrcode-input-modal.js';
import {AsyncButton, AsyncIconButton} from '../components/ui/index.js';
import {RPC_METHOD_DISPLAY_NAME} from '../constants/index.js';
import {useEntrances} from '../entrances.js';
import type {UIService, WalletKitService} from '../services/index.js';
import {
  SUPPORTED_METHOD_SET,
  useWalletKitPendingSessionRequests,
  useWalletKitSessions,
} from '../services/index.js';
import {useTheme} from '../theme.js';

export default function WalletAccountScreen(): ReactNode {
  const {address} = useLocalSearchParams<{address: string}>();

  const theme = useTheme();

  const {walletKitService, uiService, walletStorageService} = useEntrances();

  const pendingSessionRequests = useWalletKitPendingSessionRequests(
    walletKitService,
    address,
  );

  const sessions = useWalletKitSessions(walletKitService, address);

  const derivationPath =
    walletStorageService.getWalletByAddress(address)?.derivation.path;

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
            onPress={() => void copy(address)}
          />
          {derivationPath && (
            <List.Item
              title="Derivation path"
              description={derivationPath}
              onPress={() => void copy(derivationPath)}
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
            {sessions.map(session => {
              const unsupported =
                session.namespaces.eip155?.methods.some(
                  method => !SUPPORTED_METHOD_SET.has(method),
                ) ?? false;

              return (
                <List.Item
                  key={session.topic}
                  left={({style}) => (
                    <List.Icon
                      icon="web"
                      color={theme.colors.primary}
                      style={style}
                    />
                  )}
                  title={
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <Text>
                        {session.peer.metadata.name ||
                          new URL(session.peer.metadata.url).hostname}
                      </Text>
                      {unsupported && (
                        <IconButton
                          icon="alert-circle"
                          iconColor={theme.colors.alert}
                          size={16}
                          style={{
                            margin: 0,
                            marginLeft: -4,
                            height: 16,
                          }}
                          onPress={() => {
                            Alert.alert(
                              'Unsupported methods',
                              'This session requires some methods that are not supported by Megnat, thus may not work as expected.',
                            );
                          }}
                        />
                      )}
                    </View>
                  }
                  description={session.peer.metadata.url}
                  right={({style}) => (
                    <AsyncIconButton
                      icon="close"
                      style={{...style, marginRight: -8}}
                      handler={() => walletKitService.disconnect(session.topic)}
                    />
                  )}
                />
              );
            })}
          </List.Section>
        )}
      </ScrollView>
      <View style={{margin: 16}}>
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

async function copy(text: string): Promise<void> {
  await Clipboard.setStringAsync(text);

  ToastAndroid.show('Copied to clipboard', ToastAndroid.SHORT);
}

async function connect(
  uiService: UIService,
  walletKitService: WalletKitService,
  uri: string,
  address: string,
): Promise<void> {
  const message = await walletKitService.connect(uri, address);

  if (!message) {
    return;
  }

  uiService.state.pendingSessionAuthentication = message;

  router.push({
    pathname: '/session-authenticate',
  });
}
