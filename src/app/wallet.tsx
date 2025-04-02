import {router, useLocalSearchParams} from 'expo-router';
import type {ReactNode} from 'react';
import React, {useRef, useState} from 'react';
import {Alert, ScrollView, ToastAndroid, View} from 'react-native';
import {Appbar, List, Menu} from 'react-native-paper';

import {
  AsyncButton,
  AsyncIconButton,
  EditableTextInput,
  confirm,
} from '../components/ui/index.js';
import type {Wallet} from '../core/index.js';
import {useEntrances} from '../entrances.js';
import {useRefresh, useVisibleOpenClose} from '../hooks/index.js';
import type {WalletStorageService} from '../services/index.js';
import {
  DERIVATION_PATH_DEFAULT,
  DERIVATION_PATH_PATTERN,
  tangem,
} from '../tangem.js';
import {useTheme} from '../theme.js';

export default function WalletScreen(): ReactNode {
  const {walletPublicKey} = useLocalSearchParams<{walletPublicKey: string}>();

  const theme = useTheme();

  const {walletStorageService} = useEntrances();

  const refresh = useRefresh();

  const [wallet] = useState(() =>
    walletStorageService.getWalletByWalletPublicKey(walletPublicKey),
  );

  const [addingDerivation, setAddingDerivation] = useState(false);
  const addingDerivationPathRef = useRef('');

  const menu = useVisibleOpenClose();

  if (!wallet) {
    return null;
  }

  const itemIcon = wallet.chainCode ? 'file-link' : 'file-key';

  const derivable = wallet.chainCode !== undefined;

  return (
    <>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Wallet" />
        <Menu
          visible={menu.visible}
          onDismiss={menu.close}
          anchor={<Appbar.Action icon="dots-vertical" onPress={menu.open} />}
        >
          <Menu.Item
            title="Forget this wallet"
            leadingIcon="key-remove"
            onPress={() => {
              menu.close();
              void forgetWallet(walletStorageService, wallet);
            }}
          />
        </Menu>
      </Appbar.Header>
      <ScrollView contentContainerStyle={{flexGrow: 1}}>
        <View style={{margin: 16}}>
          <EditableTextInput
            mode="outlined"
            label="Name"
            initialValue={wallet.name}
            handler={text =>
              walletStorageService.renameWallet(wallet.publicKey, text)
            }
          />
        </View>
        <List.Section title={derivable ? 'Accounts' : 'Address'}>
          {wallet.derivations.map(({path, address}, index) => (
            <List.Item
              key={index}
              title={address}
              titleEllipsizeMode="middle"
              description={path}
              left={({style}) => (
                <List.Icon
                  icon={itemIcon}
                  color={theme.colors.listIcon}
                  style={{...style, alignSelf: 'center'}}
                />
              )}
              right={
                path !== undefined && path !== DERIVATION_PATH_DEFAULT
                  ? ({style}) => (
                      <AsyncIconButton
                        icon="close"
                        style={[
                          style,
                          {
                            alignSelf: 'center',
                            marginRight: -8,
                          },
                        ]}
                        handler={async () => {
                          await removeDerivation(
                            walletStorageService,
                            wallet,
                            path,
                          );

                          refresh();
                        }}
                      />
                    )
                  : undefined
              }
            />
          ))}
        </List.Section>
      </ScrollView>
      <View style={{margin: 16, gap: 10}}>
        {addingDerivation && (
          <EditableTextInput
            mode="outlined"
            label="Derivation"
            autoFocus
            initialValue={wallet.derivations[0].path ?? DERIVATION_PATH_DEFAULT}
            onChangeText={text => {
              addingDerivationPathRef.current = text;
            }}
            onBlur={() => setAddingDerivation(false)}
          />
        )}
        {derivable && (
          <AsyncButton
            mode="contained"
            buttonColor={theme.colors.primaryContainer}
            handler={async () => {
              if (!addingDerivation) {
                setAddingDerivation(true);
                return;
              }

              setAddingDerivation(false);

              await addDerivation(
                walletStorageService,
                wallet,
                addingDerivationPathRef.current,
              );

              refresh();
            }}
          >
            Add derivation
          </AsyncButton>
        )}
      </View>
    </>
  );
}

async function addDerivation(
  walletStorageService: WalletStorageService,
  wallet: Wallet,
  derivationPath: string,
): Promise<void> {
  if (!DERIVATION_PATH_PATTERN.test(derivationPath)) {
    Alert.alert(
      'Invalid derivation path',
      `Derivation path ${JSON.stringify(
        derivationPath,
      )} doesn't seem to be valid.`,
    );
    return;
  }

  if (
    wallet.derivations.some(derivation => derivation.path === derivationPath)
  ) {
    Alert.alert(
      'Derivation already added',
      `Derivation path ${JSON.stringify(derivationPath)} is already added.`,
    );
    return;
  }

  const {publicKey} = await tangem.deriveWallet({
    walletPublicKey: wallet.publicKey,
    derivationPath,
  });

  await walletStorageService.addDerivation(
    wallet.publicKey,
    derivationPath,
    publicKey,
  );

  ToastAndroid.show('Derivation added', ToastAndroid.SHORT);
}

async function removeDerivation(
  walletStorageService: WalletStorageService,
  wallet: Wallet,
  derivationPath: string,
): Promise<void> {
  if (
    !(await confirm(
      'Remove derivation',
      `Are you sure you want to remove derivation at path ${JSON.stringify(
        derivationPath,
      )}?`,
      'Remove',
    ))
  ) {
    return;
  }

  await walletStorageService.removeDerivation(wallet.publicKey, derivationPath);
}

async function forgetWallet(
  walletStorageService: WalletStorageService,
  wallet: Wallet,
): Promise<void> {
  if (
    !(await confirm(
      'Forget wallet',
      'Are you sure you want to forget this wallet?',
      'Forget',
    ))
  ) {
    return;
  }

  await walletStorageService.removeWallet(wallet.publicKey);

  router.back();
}
