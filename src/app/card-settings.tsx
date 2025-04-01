import {router} from 'expo-router';
import type {ReactNode} from 'react';
import React, {useEffect} from 'react';
import {Alert, ScrollView, View} from 'react-native';
import {Appbar, Button, List} from 'react-native-paper';

import {AsyncButton, AsyncIconButton, confirm} from '../components/ui/index.js';
import {useEntrances} from '../entrances.js';
import {useRefresh} from '../hooks/index.js';
import type {TangemCardResponse} from '../tangem.js';
import {tangem, tangemWalletToWallet} from '../tangem.js';
import {useTheme} from '../theme.js';

export default function CardSettingsScreen(): ReactNode {
  const theme = useTheme();

  const {uiService} = useEntrances();

  const refresh = useRefresh();

  const {card} = uiService.state;

  useEffect(() => {
    if (!card) {
      router.back();
      return undefined;
    }
  }, [card]);

  if (!card) {
    return null;
  }

  return (
    <>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Card settings" />
      </Appbar.Header>
      <ScrollView contentContainerStyle={{flexGrow: 1}}>
        <List.Section title="Information">
          <List.Item title="Card ID" description={card.cardId} />
          <List.Item
            title="Firmware version"
            description={card.firmwareVersion.stringValue}
          />
          <List.Item
            title="Manufacture date"
            description={card.manufacturer.manufactureDate}
          />
        </List.Section>
        {card.wallets.length > 0 && (
          <List.Section title="Wallets">
            {card.wallets.map(tangemWallet => {
              const wallet = tangemWalletToWallet(tangemWallet);

              let oneAddress: string | undefined;
              let icon: string;
              let title: string;
              let description: string | undefined;

              if (wallet) {
                const {
                  derivations: [{path, address}],
                } = wallet;

                oneAddress = address;
                title = address;

                if (path === undefined) {
                  icon = 'key';
                } else {
                  description = path;
                  icon = 'key-link';
                }
              } else {
                title = tangemWallet.curve;
                description = tangemWallet.publicKey;
                icon = 'key-remove';
              }

              return (
                <List.Item
                  key={tangemWallet.publicKey}
                  left={({color, style}) => (
                    <List.Icon
                      color={color}
                      style={{
                        ...style,
                        alignSelf: 'center',
                      }}
                      icon={icon}
                    />
                  )}
                  title={title}
                  titleEllipsizeMode="middle"
                  description={description}
                  descriptionEllipsizeMode="middle"
                  descriptionNumberOfLines={1}
                  right={({style}) => (
                    <AsyncIconButton
                      style={[style, {marginRight: -8}]}
                      icon="delete-alert-outline"
                      iconColor={theme.colors.secondaryContainer}
                      handler={() =>
                        purgeWallet(
                          card,
                          oneAddress,
                          tangemWallet.publicKey,
                          refresh,
                        )
                      }
                    />
                  )}
                />
              );
            })}
          </List.Section>
        )}
      </ScrollView>
      <View style={{margin: 16, gap: 8}}>
        {card.backupStatus.status === 'active' && (
          <AsyncButton
            mode="contained"
            buttonColor={theme.colors.primaryContainer}
            handler={() => changeAccessCode(card.cardId)}
          >
            Change access code
          </AsyncButton>
        )}
        {card.backupStatus.status === 'noBackup' && card.wallets.length > 0 && (
          <Button
            mode="contained"
            buttonColor={theme.colors.primaryContainer}
            onPress={() => {
              router.push({
                pathname: '/backup',
                params: {cardId: card.cardId},
              });
            }}
          >
            Backup card
          </Button>
        )}
        <AsyncButton
          mode="contained"
          buttonColor={theme.colors.secondaryContainer}
          handler={() => resetToFactorySettings(card).finally(refresh)}
        >
          Reset to factory settings
        </AsyncButton>
      </View>
    </>
  );
}

async function purgeWallet(
  card: TangemCardResponse,
  address: string | undefined,
  walletPublicKey: string,
  onChange: () => void,
): Promise<void> {
  const identifier = address
    ? `an address starts with ${address.slice(0, 8)}`
    : `the public key starts with ${walletPublicKey.slice(0, 8)}...`;

  const confirmed = await new Promise(resolve =>
    Alert.alert(
      'Purge wallet',
      `\
Are you sure you want to purge the wallet of which ${identifier} on card ${card.cardId}?

Keys of this wallet on the card will be ERASED!`,
      [
        {
          text: 'Purge',
          style: 'destructive',
          onPress: () => resolve(true),
        },
        {text: 'Cancel', style: 'cancel', onPress: () => resolve(false)},
      ],
    ),
  );

  if (!confirmed) {
    return;
  }

  await tangem.purgeWallet({cardId: card.cardId, walletPublicKey});

  card.wallets = card.wallets.filter(
    wallet => wallet.publicKey !== walletPublicKey,
  );

  onChange();
}

async function changeAccessCode(cardId: string): Promise<void> {
  await tangem.setAccessCode({cardId});
}

async function resetToFactorySettings(card: TangemCardResponse): Promise<void> {
  if (
    !(await confirm(
      'Reset to factory settings',
      `You are going to reset the card ${card.cardId} to factory settings, ALL wallets on the card will be ERASED!`,
    ))
  ) {
    return;
  }

  if (
    !(await confirm(
      'Double check',
      `Please confirm the card id ${card.cardId}, are you sure you want to reset the card to factory settings?`,
      'Reset',
      true,
    ))
  ) {
    return;
  }

  await tangem.resetToFactorySettings({cardId: card.cardId});

  card.wallets = [];
  card.backupStatus = {
    status: 'noBackup',
  };

  Alert.alert(
    'Success',
    `Card ${card.cardId} has been successfully reset to factory settings.`,
  );
}
