import {router} from 'expo-router';
import {type ReactNode, useState} from 'react';
import {ScrollView, View} from 'react-native';
import {Appbar, Badge, Checkbox, List} from 'react-native-paper';

import {
  QRCodeInputModal,
  useQRCodeInputModalProps,
} from '../components/qrcode-input-modal.js';
import {AsyncButton} from '../components/ui/index.js';
import {useEntrances} from '../entrances.js';
import type {UIService, WalletKitService} from '../services/index.js';
import {useWallets} from '../services/index.js';
import {useTheme} from '../theme.js';

export default function ConnectScreen(): ReactNode {
  const theme = useTheme();

  const {walletStorageService, walletKitService, uiService} = useEntrances();

  const wallets = useWallets(walletStorageService);

  const [selectedAddressSet, setSelectedAddressSet] = useState(
    () => new Set<string>(),
  );

  const [qrCodeInputModalProps, openQrCodeInputModal] =
    useQRCodeInputModalProps();

  const ableToConnect = selectedAddressSet.size > 0;

  return (
    <>
      <QRCodeInputModal {...qrCodeInputModalProps} />
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Connect" />
      </Appbar.Header>
      <ScrollView contentContainerStyle={{flexGrow: 1}}>
        <List.Section title="Select wallets to connect">
          {wallets.map(wallet => {
            const checked = wallet.derivations.filter(derivation =>
              selectedAddressSet.has(derivation.address),
            ).length;

            return (
              <List.Accordion
                key={wallet.publicKey}
                left={({color, style}) => (
                  <List.Icon
                    icon={wallet.chainCode ? 'key-link' : 'key'}
                    color={
                      color === theme.colors.primary
                        ? theme.colors.onSurface
                        : color
                    }
                    style={style}
                  />
                )}
                title={wallet.name}
                titleStyle={{color: theme.colors.onSurface}}
                right={({isExpanded}) => (
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    {checked > 0 && (
                      <Badge
                        size={24}
                        style={{
                          alignSelf: 'center',
                          marginRight: 12,
                          backgroundColor: theme.colors.primaryContainer,
                          color: theme.colors.onPrimaryContainer,
                        }}
                      >
                        {checked}
                      </Badge>
                    )}
                    <List.Icon
                      icon={isExpanded ? 'chevron-up' : 'chevron-down'}
                      color={theme.colors.onSurfaceVariant}
                    />
                  </View>
                )}
              >
                {wallet.derivations.map(({path, address}) => {
                  const checked = selectedAddressSet.has(address);

                  return (
                    <List.Item
                      key={address}
                      style={{marginLeft: 8}}
                      left={({style}) => (
                        <View
                          style={[style, {marginVertical: -8, marginRight: -8}]}
                        >
                          <Checkbox
                            status={checked ? 'checked' : 'unchecked'}
                            color={theme.colors.primaryContainer}
                          />
                        </View>
                      )}
                      title={address}
                      titleEllipsizeMode="middle"
                      description={path}
                      onPress={() =>
                        setSelectedAddressSet(addressSet => {
                          const updatedAddressSet = new Set(addressSet);

                          if (updatedAddressSet.has(address)) {
                            updatedAddressSet.delete(address);
                          } else {
                            updatedAddressSet.add(address);
                          }

                          return updatedAddressSet;
                        })
                      }
                    />
                  );
                })}
              </List.Accordion>
            );
          })}
        </List.Section>
      </ScrollView>
      <View style={{margin: 16}}>
        <AsyncButton
          mode="contained"
          disabled={!ableToConnect}
          buttonColor={theme.colors.primaryContainer}
          handler={async () => {
            const uri = await openQrCodeInputModal(/^wc:/);

            if (!uri) {
              return;
            }

            await connect(
              uiService,
              walletKitService,
              uri,
              Array.from(selectedAddressSet),
            );
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
  addresses: string[],
): Promise<void> {
  const message = await walletKitService.connect(uri, addresses);

  if (!message) {
    router.back();
    return;
  }

  uiService.state.pendingSession = message;

  router.replace({
    pathname:
      message.type === 'authenticate'
        ? '/session-authenticate'
        : '/session-proposal',
  });
}
