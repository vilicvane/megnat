/* eslint-disable @mufan/scoped-modules */

import {router} from 'expo-router';
import type {ReactNode} from 'react';
import {Alert, ScrollView, View} from 'react-native';
import {Appbar, Badge, Button, List, Menu, useTheme} from 'react-native-paper';

import {NEW_CARD_BACKUP_NEEDED_FOR_ACCESS_CODE_MESSAGE} from '../constants/index.js';
import {useEntrances} from '../entrances.js';
import {useValueUpdate, useVisibleOpenClose} from '../hooks/index.js';
import type {UIService, WalletStorageService} from '../services/index.js';
import {useWalletKitPendingSessionRequests} from '../services/index.js';
import {
  tangem,
  tangemWalletToWallet,
  tangemWalletsToWallets,
} from '../tangem.js';

export default function IndexScreen(): ReactNode {
  const theme = useTheme();

  const {walletStorageService, walletKitService, uiService} = useEntrances();

  const [wallets, updateWallets] = useValueUpdate(() => {
    const wallets = walletStorageService.getWallets();

    return wallets.sort(
      (a, b) =>
        (a.chainCode ? 1 : 0) - (b.chainCode ? 1 : 0) ||
        a.name.localeCompare(b.name),
    );
  });

  const pendingSessionRequests =
    useWalletKitPendingSessionRequests(walletKitService);

  const menu = useVisibleOpenClose();

  return (
    <>
      <Appbar.Header>
        <Appbar.Content title="Wallets" />
        <Menu
          visible={menu.visible}
          onDismiss={menu.close}
          anchor={<Appbar.Action icon="plus" onPress={menu.open} />}
        >
          <Menu.Item
            title="Add wallet"
            leadingIcon="nfc-tap"
            onPress={() => {
              menu.close();

              void addWallet(walletStorageService).finally(updateWallets);
            }}
          />
          <Menu.Item
            title="Create wallet"
            leadingIcon="key-wireless"
            onPress={() => {
              menu.close();

              void createWallet(walletStorageService).finally(updateWallets);
            }}
          />
          <Menu.Item
            title="Import & create wallet"
            leadingIcon="key-wireless"
            onPress={() => {
              menu.close();

              router.push('/import-create-wallet');
            }}
          />
          <Menu.Item
            title="Card settings"
            leadingIcon="credit-card-wireless"
            onPress={() => {
              menu.close();

              void scanCard(uiService);
            }}
          />
        </Menu>
      </Appbar.Header>
      <ScrollView contentContainerStyle={{flexGrow: 1}}>
        <List.Section>
          {wallets?.map(wallet => {
            const [accordionIcon, addressIcon] = wallet.chainCode
              ? ['key-link', 'file-link']
              : ['key', 'file-key'];

            return (
              <List.Accordion
                key={wallet.publicKey}
                left={props => <List.Icon {...props} icon={accordionIcon} />}
                title={wallet.name}
                titleStyle={{color: theme.colors.onBackground}}
                onLongPress={() => {
                  router.push({
                    pathname: '/wallet',
                    params: {walletPublicKey: wallet.publicKey},
                  });
                }}
              >
                {wallet.derivations.map(({path, address}, index) => (
                  <List.Item
                    key={index}
                    style={{marginLeft: 8}}
                    left={({style}) => (
                      <List.Icon
                        icon={addressIcon}
                        color={theme.colors.primary}
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
      </ScrollView>
      <View style={{margin: 16}}>
        <Button
          mode="contained"
          disabled={pendingSessionRequests.length === 0}
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
          <Badge style={{position: 'absolute', top: -8, right: 0}}>
            {pendingSessionRequests.length}
          </Badge>
        )}
      </View>
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
