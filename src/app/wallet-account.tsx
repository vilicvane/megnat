import {router, useLocalSearchParams} from 'expo-router';
import type {ReactNode} from 'react';
import {ScrollView, View} from 'react-native';
import {Appbar, List} from 'react-native-paper';

import {PendingRequestList} from '../components/pending-request-list.js';
import {
  QRCodeInputModal,
  useQRCodeInputModalProps,
} from '../components/qrcode-input-modal.js';
import {SessionList} from '../components/session-list.js';
import {AsyncButton} from '../components/ui/index.js';
import {useEntrances} from '../entrances.js';
import type {UIService, WalletKitService} from '../services/index.js';
import {
  useWalletKitPendingSessionRequests,
  useWalletKitSessions,
} from '../services/index.js';
import {useTheme} from '../theme.js';
import {copy} from '../utils/index.js';

export default function WalletAccountScreen(): ReactNode {
  const theme = useTheme();

  const {address} = useLocalSearchParams<{address: string}>();

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
          <PendingRequestList pendingSessionRequests={pendingSessionRequests} />
        )}
        {sessions.length > 0 && (
          <SessionList sessions={sessions} address={address} />
        )}
      </ScrollView>
      <View style={{margin: 16}}>
        <AsyncButton
          mode="contained"
          buttonColor={theme.colors.primaryContainer}
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

async function connect(
  uiService: UIService,
  walletKitService: WalletKitService,
  uri: string,
  address: string,
): Promise<void> {
  const message = await walletKitService.connect(uri, [address]);

  if (!message) {
    return;
  }

  uiService.state.pendingSession = message;

  router.push({
    pathname:
      message.type === 'authenticate'
        ? '/session-authenticate'
        : '/session-proposal',
  });
}
