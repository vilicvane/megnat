/* eslint-disable @mufan/scoped-modules */

import {router} from 'expo-router';
import {openBrowserAsync} from 'expo-web-browser';
import {type ReactNode, useMemo} from 'react';
import {Alert, Image, Pressable, ScrollView, View} from 'react-native';
import {
  Appbar,
  Badge,
  Button,
  Divider,
  List,
  Menu,
  Text,
} from 'react-native-paper';

import {SessionList} from '../components/session-list.js';
import {
  MEGNAT_REFERRAL_URL,
  MEGNAT_URL,
  NEW_CARD_BACKUP_NEEDED_FOR_ACCESS_CODE_MESSAGE,
} from '../constants/index.js';
import {useEntrances} from '../entrances.js';
import {useVisibleOpenClose} from '../hooks/index.js';
import type {UIService, WalletStorageService} from '../services/index.js';
import {
  useWalletKitPendingSessionRequests,
  useWalletKitSessions,
  useWallets,
} from '../services/index.js';
import {
  tangem,
  tangemWalletToWallet,
  tangemWalletsToWallets,
} from '../tangem.js';
import {useTheme} from '../theme.js';

export default function IndexScreen(): ReactNode {
  const theme = useTheme();

  const {walletStorageService, walletKitService, uiService} = useEntrances();

  const wallets = useWallets(walletStorageService);

  const sortedWallets = useMemo(() => {
    return wallets.sort(
      (a, b) =>
        (a.chainCode ? 1 : 0) - (b.chainCode ? 1 : 0) ||
        a.name.localeCompare(b.name),
    );
  }, [wallets]);

  const sessions = useWalletKitSessions(walletKitService);

  const pendingSessionRequests =
    useWalletKitPendingSessionRequests(walletKitService);

  const addMenu = useVisibleOpenClose();
  const settingsMenu = useVisibleOpenClose();

  return (
    <>
      <Appbar.Header>
        <Appbar.Content
          title={
            <Pressable
              style={{
                marginRight: 'auto',
                flexDirection: 'row',
                alignItems: 'center',
              }}
              onPress={() => void openBrowserAsync(MEGNAT_URL)}
            >
              <Image
                source={require('../assets/images/compact-icon.png')} // Add your image source here
                style={{
                  width: 30,
                  height: 30,
                }}
              />
              <Text variant="titleLarge" style={{marginLeft: 12}}>
                megnat
              </Text>
            </Pressable>
          }
        />
        <Menu
          visible={addMenu.visible}
          onDismiss={addMenu.close}
          anchor={<Appbar.Action icon="plus" onPress={addMenu.open} />}
        >
          <Menu.Item
            title="Add wallet"
            leadingIcon="cellphone-key"
            onPress={() => {
              addMenu.close();

              void addWallet(walletStorageService);
            }}
          />
          <Menu.Item
            title="Create wallet on card"
            leadingIcon="card-plus"
            onPress={() => {
              addMenu.close();

              void createWallet(walletStorageService);
            }}
          />
          <Menu.Item
            title="Import wallet to card"
            leadingIcon="card-plus-outline"
            onPress={() => {
              addMenu.close();

              router.push('/import-wallet');
            }}
          />
          <Divider style={{marginVertical: 6}} />
          <Menu.Item
            title="Referral link"
            leadingIcon="ticket-percent-outline"
            onPress={() => {
              addMenu.close();

              void openBrowserAsync(MEGNAT_REFERRAL_URL);
            }}
          />
        </Menu>
        <Menu
          visible={settingsMenu.visible}
          onDismiss={settingsMenu.close}
          anchor={
            <Appbar.Action icon="cog-outline" onPress={settingsMenu.open} />
          }
        >
          <Menu.Item
            title="Chain settings"
            leadingIcon="web"
            onPress={() => {
              settingsMenu.close();

              router.push('/chain-settings');
            }}
          />
          <Menu.Item
            title="Card settings"
            leadingIcon="credit-card-chip-outline"
            onPress={() => {
              settingsMenu.close();

              void scanCard(uiService);
            }}
          />
          <Divider style={{marginVertical: 6}} />
          <Menu.Item
            title="About"
            leadingIcon="information-outline"
            onPress={() => router.push('/about')}
          />
        </Menu>
      </Appbar.Header>
      <ScrollView contentContainerStyle={{flexGrow: 1}}>
        {sortedWallets.length > 0 || sessions.length > 0 ? (
          <>
            {sortedWallets.length > 0 && (
              <List.Section title="Wallets">
                {sortedWallets.map(wallet => {
                  const [accordionIcon, addressIcon] = wallet.chainCode
                    ? ['key-link', 'file-link']
                    : ['key', 'file-key'];

                  return (
                    <List.Accordion
                      key={wallet.publicKey}
                      left={({color, style}) => (
                        <List.Icon
                          icon={accordionIcon}
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
                      onLongPress={() => {
                        router.push({
                          pathname: '/wallet',
                          params: {walletPublicKey: wallet.publicKey},
                        });
                      }}
                    >
                      {wallet.derivations.map(({path, address}) => (
                        <List.Item
                          key={address}
                          style={{marginLeft: 8}}
                          left={({color, style}) => (
                            <List.Icon
                              icon={addressIcon}
                              color={color}
                              style={{...style, alignSelf: 'center'}}
                            />
                          )}
                          title={address}
                          titleEllipsizeMode="middle"
                          description={path}
                          onPress={() => {
                            router.push({
                              pathname: '/wallet-account',
                              params: {address},
                            });
                          }}
                        />
                      ))}
                    </List.Accordion>
                  );
                })}
              </List.Section>
            )}
            {sessions.length > 0 && <SessionList sessions={sessions} />}
          </>
        ) : (
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text style={{color: theme.colors.onSurfaceVariant}}>
              No wallets added yet
            </Text>
          </View>
        )}
      </ScrollView>
      {(pendingSessionRequests.length > 0 || wallets.length > 0) && (
        <View style={{padding: 16, gap: 10}}>
          {pendingSessionRequests.length > 0 && (
            <View>
              <Button
                mode="contained"
                disabled={pendingSessionRequests.length === 0}
                buttonColor={theme.colors.primaryContainer}
                onPress={() => {
                  router.push({
                    pathname: '/view-request',
                    params: {requestId: pendingSessionRequests[0].request.id},
                  });
                }}
              >
                {pendingSessionRequests.length > 1
                  ? 'View next pending request'
                  : pendingSessionRequests.length > 0
                    ? 'View pending request'
                    : 'No pending requests'}
              </Button>
              {pendingSessionRequests.length > 1 && (
                <Badge
                  style={{
                    position: 'absolute',
                    top: -8,
                    right: 0,
                    backgroundColor: theme.colors.secondaryContainer,
                    color: theme.colors.onSecondaryContainer,
                  }}
                >
                  {pendingSessionRequests.length}
                </Badge>
              )}
            </View>
          )}
          <Button
            mode="contained"
            buttonColor={theme.colors.surfaceVariant}
            onPress={() => router.push('/connect')}
          >
            Connect
          </Button>
        </View>
      )}
    </>
  );
}

async function addWallet(
  walletStorageService: WalletStorageService,
): Promise<void> {
  const response = await tangem.scan();

  const wallets = tangemWalletsToWallets(response.wallets);

  if (wallets.length === 0) {
    Alert.alert('No wallets supported found on card.');
    return;
  }

  await walletStorageService.addWallets(wallets);
}

async function createWallet(
  walletStorageService: WalletStorageService,
): Promise<void> {
  const {cardId, wallet} = await tangem.createWallet({});

  await walletStorageService.addWallet(tangemWalletToWallet(wallet)!);

  let message = `Wallet has been created on card ${cardId} successfully.`;

  if (wallet.index === 0) {
    message += `\n\n${NEW_CARD_BACKUP_NEEDED_FOR_ACCESS_CODE_MESSAGE}`;
  }

  Alert.alert('Success', message);
}

async function scanCard(uiService: UIService): Promise<void> {
  const card = await tangem.scan();

  uiService.state.card = card;

  router.push('/card-settings');
}
