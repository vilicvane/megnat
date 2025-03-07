import React from 'react';
import {Alert, ScrollView, View} from 'react-native';
import {Appbar, List} from 'react-native-paper';
import {router} from 'expo-router';
import {PendingRequestTypes} from '@walletconnect/types';

import {useEntrances} from '@/entrances';
import {WalletKitService} from '@/services/wallet-kit-service';
import {TangemSigner} from '@/core/tangem-signer';
import {Wallet, WalletDerivation} from '@/core/wallet';
import {AsyncButton} from '@/components/ui/async-buttons';
import {ListItemWithDescriptionBlock} from '@/components/ui/list-item-with-description-block';

export type SignTypedDataProps = {
  request: PendingRequestTypes.Struct;
};

export function SignTypedData({request}: SignTypedDataProps) {
  const {chainService, walletKitService, walletStorageService} = useEntrances();

  const {
    params: {
      chainId,
      request: {params},
    },
  } = request;

  const [address, dataJSON] = params as [string, string];

  const data = JSON.parse(dataJSON) as TypedData;

  const wallet = walletStorageService.getWalletByAddress(address);

  const chainName = chainService.getName(chainId);

  const signDisabled = !wallet;

  return (
    <>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Sign typed data" />
      </Appbar.Header>
      <ScrollView contentContainerStyle={{flexGrow: 1}}>
        <List.Section>
          <List.Item title="Chain" description={chainName} />
          <List.Item title="Signer" description={address} />
          <List.Item title="Domain" description={data.domain.name} />
          <ListItemWithDescriptionBlock
            title="Message"
            description={JSON.stringify(data.message, null, 2)}
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
            mode="elevated"
            style={{flex: 1, flexBasis: 0}}
            handler={() => reject(walletKitService, request)}
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
                request,
                data,
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
  request: PendingRequestTypes.Struct,
) {
  await walletKitService.rejectSessionRequest(request);

  router.back();
}

async function sign(
  walletKitService: WalletKitService,
  wallet: Wallet,
  walletDerivation: WalletDerivation,
  request: PendingRequestTypes.Struct,
  {domain, types, message}: TypedData,
) {
  const signer = new TangemSigner(
    undefined,
    wallet.publicKey,
    walletDerivation,
  );

  types = {
    ...types,
  };

  delete types.EIP712Domain;

  const signature = await signer.signTypedData(domain, types, message);

  await walletKitService.completeSessionRequest(request, signature);

  Alert.alert(
    'Typed data signed',
    'The typed data has been signed successfully, please proceed within the dApp.',
  );

  router.back();
}

type TypedData = {
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: string;
  };
  message: any;
  primaryType: string;
  types: Record<string, any>;
};
