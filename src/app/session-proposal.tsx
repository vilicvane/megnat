import {router} from 'expo-router';
import type {ReactNode} from 'react';
import React, {useEffect, useState} from 'react';
import {Alert, ScrollView, ToastAndroid, View} from 'react-native';
import {Appbar, List} from 'react-native-paper';

import {AddressesListItem} from '../components/addresses-list-item.js';
import {SessionVerification} from '../components/session-verification.js';
import {AsyncButton} from '../components/ui/index.js';
import {useEntrances} from '../entrances.js';
import type {
  PendingSessionProposal,
  WalletKitService,
} from '../services/index.js';
import {useTheme} from '../theme.js';

export default function SessionProposalScreen(): ReactNode {
  const theme = useTheme();

  const {walletKitService, uiService} = useEntrances();
  const [proposal] = useState(() => {
    const pendingSession = uiService.state.pendingSession;

    uiService.state.pendingSession = undefined;

    return (
      pendingSession &&
      (pendingSession.type === 'proposal' ? pendingSession : undefined)
    );
  });

  useEffect(() => {
    if (!proposal) {
      router.back();
    }
  }, [proposal]);

  if (!proposal) {
    return null;
  }

  const {
    addresses,
    proposal: {
      params: {
        proposer: {metadata},
      },
      verifyContext,
    },
  } = proposal;

  return (
    <>
      <Appbar.Header>
        <Appbar.BackAction
          onPress={() => {
            router.back();
          }}
        />
        <Appbar.Content title="Session proposal" />
      </Appbar.Header>
      <SessionVerification metadata={metadata} context={verifyContext} />
      <ScrollView contentContainerStyle={{flexGrow: 1}}>
        <List.Section>
          {metadata.description && (
            <List.Item
              title="Description"
              description={metadata.description}
              descriptionNumberOfLines={0}
            />
          )}
          <AddressesListItem
            addresses={addresses}
            checkWalletAddresses={false}
          />
        </List.Section>
      </ScrollView>
      <View
        style={{
          margin: 16,
          marginTop: 'auto',
          flexDirection: 'row',
          gap: 10,
        }}
      >
        <AsyncButton
          mode="contained"
          buttonColor={theme.colors.secondaryContainer}
          style={{flex: 1, flexBasis: 0}}
          handler={() => reject(walletKitService, proposal)}
        >
          Reject
        </AsyncButton>
        <AsyncButton
          mode="contained"
          buttonColor={theme.colors.primaryContainer}
          style={{flex: 1, flexBasis: 0}}
          handler={() => connect(walletKitService, proposal)}
        >
          Connect
        </AsyncButton>
      </View>
    </>
  );
}

async function reject(
  walletKitService: WalletKitService,
  proposal: PendingSessionProposal,
): Promise<void> {
  await walletKitService.rejectSessionProposal(proposal.proposal.id).then(
    () => ToastAndroid.show('Session rejected', ToastAndroid.SHORT),
    error => Alert.alert('Error', error.message),
  );

  router.back();
}

async function connect(
  walletKitService: WalletKitService,
  proposal: PendingSessionProposal,
): Promise<void> {
  await walletKitService
    .completeSessionProposal(proposal.proposal.id, proposal.namespaces)
    .then(
      () => ToastAndroid.show('Session connected', ToastAndroid.SHORT),
      error => Alert.alert('Error', error.message),
    );

  router.back();
}
