import {buildAuthObject} from '@walletconnect/utils';
import {router} from 'expo-router';
import type {ReactNode} from 'react';
import React, {useEffect, useState} from 'react';
import {Alert, ScrollView, ToastAndroid, View} from 'react-native';
import {Appbar, List} from 'react-native-paper';

import {SessionVerification} from '../components/session-verification.js';
import {
  AsyncButton,
  ListItemWithDescriptionBlock,
} from '../components/ui/index.js';
import type {Wallet, WalletDerivation} from '../core/index.js';
import {TangemSigner} from '../core/index.js';
import {useEntrances} from '../entrances.js';
import type {
  PendingSessionAuthentication,
  WalletKitService,
} from '../services/index.js';
import {useTheme} from '../theme.js';

export default function SessionAuthenticateScreen(): ReactNode {
  const theme = useTheme();

  const {walletKitService, walletStorageService, uiService} = useEntrances();
  const [authentication] = useState(() => {
    const pendingSession = uiService.state.pendingSession;

    uiService.state.pendingSession = undefined;

    return (
      pendingSession &&
      (pendingSession.type === 'authenticate' ? pendingSession : undefined)
    );
  });

  useEffect(() => {
    if (!authentication) {
      router.back();
    }
  }, [authentication]);

  if (!authentication) {
    return null;
  }

  const wallet = walletStorageService.getWalletByAddress(
    authentication.address,
  );

  const displayMessage = authentication.message.replace(
    /^Resources:(?:\n- .+)+$/m,
    '',
  );

  const signDisabled = !wallet;

  const {
    authenticate: {
      params: {
        requester: {metadata},
      },
      verifyContext,
    },
  } = authentication;

  return (
    <>
      <Appbar.Header>
        <Appbar.BackAction
          onPress={() => {
            router.back();
          }}
        />
        <Appbar.Content title="Session authenticate" />
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
          <List.Item
            title="Address"
            description={authentication.address}
            descriptionNumberOfLines={1}
            descriptionEllipsizeMode="middle"
          />
          <ListItemWithDescriptionBlock
            title="Message"
            description={displayMessage}
            dataToCopy={authentication.message}
          />
        </List.Section>
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
            handler={() => reject(walletKitService, authentication)}
          >
            Reject
          </AsyncButton>
          <AsyncButton
            mode="contained"
            disabled={signDisabled}
            buttonColor={theme.colors.primaryContainer}
            style={{flex: 1, flexBasis: 0}}
            handler={() =>
              sign(
                walletKitService,
                wallet!.wallet,
                wallet!.derivation,
                authentication,
              )
            }
          >
            Sign
          </AsyncButton>
        </View>
      </ScrollView>
    </>
  );
}

async function reject(
  walletKitService: WalletKitService,
  authentication: PendingSessionAuthentication,
): Promise<void> {
  await walletKitService
    .rejectSessionAuthentication(authentication.authenticate.id)
    .then(
      () => ToastAndroid.show('Session rejected', ToastAndroid.SHORT),
      error => Alert.alert('Error', error.message),
    );

  router.back();
}

async function sign(
  walletKitService: WalletKitService,
  wallet: Wallet,
  walletDerivation: WalletDerivation,
  authentication: PendingSessionAuthentication,
): Promise<void> {
  const signer = new TangemSigner(
    undefined,
    wallet.publicKey,
    walletDerivation,
  );

  const signature = await signer.signMessage(authentication.message);

  const auth = buildAuthObject(
    authentication.authPayload,
    {
      t: 'eip191',
      s: signature,
    },
    authentication.iss,
  );

  await walletKitService
    .completeSessionAuthentication(authentication.authenticate.id, auth)
    .then(
      () => ToastAndroid.show('Session authenticated', ToastAndroid.SHORT),
      error => Alert.alert('Error', error.message),
    );

  router.back();
}
