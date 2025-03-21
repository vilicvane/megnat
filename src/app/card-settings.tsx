import {router} from 'expo-router';
import type {ReactNode} from 'react';
import React, {useState} from 'react';
import {Alert, ScrollView, View} from 'react-native';
import {Appbar, List} from 'react-native-paper';

import {AsyncButton, AsyncIconButton, confirm} from '../components/ui/index.js';
import {useEntrances} from '../entrances.js';
import {useRefresh} from '../hooks/index.js';
import type {TangemScanResponse} from '../tangem.js';
import {tangem, tangemWalletToWallet} from '../tangem.js';
import {useTheme} from '../theme.js';

export default function CardSettingsScreen(): ReactNode {
  const theme = useTheme();

  const {uiService} = useEntrances();

  const refresh = useRefresh();

  const [card] = useState(() => {
    const card = uiService.state.card;

    if (!card) {
      router.back();
      return undefined;
    }

    return card;
  });

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
        <AsyncButton
          mode="contained"
          buttonColor={theme.colors.primaryContainer}
          handler={() => changeAccessCode(card.cardId)}
        >
          Change access code
        </AsyncButton>
        <AsyncButton
          mode="elevated"
          textColor={theme.colors.secondary}
          handler={async () => {
            await purgeAllWallets(card, refresh);
          }}
        >
          Purge all wallets
        </AsyncButton>
      </View>
    </>
  );
}

async function purgeWallet(
  card: TangemScanResponse,
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

async function purgeAllWallets(
  card: TangemScanResponse,
  onChange: () => void,
): Promise<void> {
  if (
    !(await confirm(
      'Purge all wallets',
      `You are going to purge all wallets on card ${card.cardId}, ALL keys of ALL wallets on the card will be ERASED!`,
    ))
  ) {
    return;
  }

  if (
    !(await confirm(
      'Double check',
      `Please confirm the card id ${card.cardId}, are you sure you want to purge all wallets on this card?`,
      'Purge',
      true,
    ))
  ) {
    return;
  }

  await tangem.purgeAllWallets({cardId: card.cardId});

  card.wallets = [];

  Alert.alert(
    'Success',
    `All wallets on card ${card.cardId} have been purged successfully.`,
  );

  onChange();
}
