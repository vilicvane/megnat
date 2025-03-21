import {buildAuthObject} from '@walletconnect/utils';
import {router} from 'expo-router';
import type {ReactNode} from 'react';
import React, {useEffect, useState} from 'react';
import {ScrollView, ToastAndroid, View} from 'react-native';
import {Appbar, List} from 'react-native-paper';

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
    const authentication = uiService.state.pendingSessionAuthentication;

    uiService.state.pendingSessionAuthentication = undefined;

    return authentication;
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
      <ScrollView contentContainerStyle={{flexGrow: 1}}>
        <List.Section>
          <List.Item title="Signer" description={authentication.address} />
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
            gap: 8,
          }}
        >
          <AsyncButton
            mode="contained"
            buttonColor={theme.colors.secondary}
            style={{flex: 1, flexBasis: 0}}
            handler={() => reject(walletKitService, authentication)}
          >
            Reject
          </AsyncButton>
          <AsyncButton
            mode="contained"
            style={{flex: 1, flexBasis: 0}}
            disabled={signDisabled}
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
  pendingSessionAuthentication: PendingSessionAuthentication,
): Promise<void> {
  await walletKitService.rejectSessionAuthentication(
    pendingSessionAuthentication.id,
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

  await walletKitService.completeSessionAuthentication(authentication.id, auth);

  ToastAndroid.show('Session authenticated', ToastAndroid.SHORT);

  router.back();
}
