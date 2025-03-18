import {router} from 'expo-router';
import type {ReactNode} from 'react';
import React, {useState} from 'react';
import {Alert, ScrollView, View} from 'react-native';
import {Appbar, List} from 'react-native-paper';

import {AsyncButton, AsyncIconButton, confirm} from '../components/ui/index.js';
import {useEntrances} from '../entrances.js';
import {useRefresh} from '../hooks/index.js';
import {tangem, tangemWalletToWallet} from '../tangem.js';

export default function CardSettingsScreen(): ReactNode {
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
                      style={{...style, marginRight: -16}}
                      icon="delete-alert"
                      handler={async () => {
                        await purgeWallet(
                          card.cardId,
                          oneAddress,
                          tangemWallet.publicKey,
                        );

                        card.wallets = card.wallets.filter(
                          wallet => wallet.publicKey !== tangemWallet.publicKey,
                        );

                        refresh();
                      }}
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
          handler={() => changeAccessCode(card.cardId)}
        >
          Change access code
        </AsyncButton>
        <AsyncButton
          mode="elevated"
          handler={async () => {
            await purgeAllWallets(card.cardId);

            card.wallets = [];

            refresh();
          }}
        >
          Purge all wallets
        </AsyncButton>
      </View>
    </>
  );
}

async function purgeWallet(
  cardId: string,
  address: string | undefined,
  walletPublicKey: string,
): Promise<void> {
  const identifier = address
    ? `an address starts with ${address.slice(0, 8)}`
    : `the public key starts with ${walletPublicKey.slice(0, 8)}...`;

  const confirmed = await new Promise(resolve =>
    Alert.alert(
      'Purge wallet',
      `Are you sure you want to purge the wallet of which ${identifier} on card ${cardId}?`,
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

  await tangem.purgeWallet({cardId, walletPublicKey});
}

async function changeAccessCode(cardId: string): Promise<void> {
  await tangem.setAccessCode({cardId});
}

async function purgeAllWallets(cardId: string): Promise<void> {
  if (
    !(await confirm(
      'Purge all wallets',
      `You are going to purge all wallets on card ${cardId}, all wallets on this card will be lost.`,
    ))
  ) {
    return;
  }

  if (
    !(await confirm(
      'Double check',
      `Please confirm the card id ${cardId}, are you sure you want to purge all wallets on this card?`,
      'Purge',
      true,
    ))
  ) {
    return;
  }

  await tangem.purgeAllWallets({cardId});

  Alert.alert(
    'Success',
    `All wallets on card ${cardId} have been purged successfully.`,
  );
}
