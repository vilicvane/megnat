import {router} from 'expo-router';
import React, {useEffect, useState} from 'react';
import {Alert, ScrollView, View} from 'react-native';
import {Appbar, List} from 'react-native-paper';
import {buildAuthObject} from '@walletconnect/utils';

import {useEntrances} from '@/entrances';
import {ListItemWithDescriptionBlock} from '@/components/ui/list-item-with-description-block';
import {AsyncButton} from '@/components/ui/async-buttons';
import {
  PendingSessionAuthentication,
  WalletKitService,
} from '@/services/wallet-kit-service';
import {Wallet, WalletDerivation} from '@/core/wallet';
import {TangemSigner} from '@/core/tangem-signer';

export default function SessionAuthenticateScreen() {
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
          />
        </List.Section>
      </ScrollView>
      <View
        style={{
          margin: 16,
          marginTop: 'auto',
          flexDirection: 'row',
          gap: 8,
        }}
      >
        <AsyncButton
          mode="elevated"
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
    </>
  );
}

async function reject(
  walletKitService: WalletKitService,
  pendingSessionAuthentication: PendingSessionAuthentication,
) {
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
) {
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

  Alert.alert(
    'Session authenticated',
    'The session has been authenticated successfully, please proceed within the dApp.',
  );

  router.back();
}
