import * as Clipboard from 'expo-clipboard';
import {router, useLocalSearchParams} from 'expo-router';
import type {ReactNode} from 'react';
import {ScrollView, ToastAndroid, View} from 'react-native';
import {Appbar, List, Text} from 'react-native-paper';

import {
  QRCodeInputModal,
  useQRCodeInputModalProps,
} from '../components/qrcode-input-modal.js';
import {SessionList} from '../components/session-list.js';
import {
  AsyncButton,
  DateFromNow,
  ListIconClockTicking,
} from '../components/ui/index.js';
import {RPC_METHOD_DISPLAY_NAME} from '../constants/index.js';
import {useEntrances} from '../entrances.js';
import type {UIService, WalletKitService} from '../services/index.js';
import {
  getSessionDisplayName,
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
            {pendingSessionRequests.map(({request, session}) => (
              <List.Item
                key={request.id}
                left={({style}) => (
                  <ListIconClockTicking
                    color={theme.colors.onPrimary}
                    style={style}
                  />
                )}
                title={getSessionDisplayName(session)}
                description={
                  <View
                    style={{
                      width: '100%',
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Text style={{color: theme.colors.info}}>
                      {RPC_METHOD_DISPLAY_NAME(request.params.request.method)}
                    </Text>
                    {request.params.request.expiryTimestamp && (
                      <DateFromNow
                        date={
                          new Date(
                            request.params.request.expiryTimestamp * 1000,
                          )
                        }
                        style={{
                          color: theme.colors.onSurfaceVariant,
                        }}
                      />
                    )}
                  </View>
                }
                onPress={() => {
                  router.push({
                    pathname: '/view-request',
                    params: {requestId: request.id},
                  });
                }}
              />
            ))}
          </List.Section>
        )}
        {sessions.length > 0 && <SessionList sessions={sessions} />}
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
    ToastAndroid.show('Session connected', ToastAndroid.SHORT);
    return;
  }

  uiService.state.pendingSessionAuthentication = message;

  router.push({
    pathname: '/session-authenticate',
  });
}
