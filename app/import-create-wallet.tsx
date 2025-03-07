import {Appbar, TextInput} from 'react-native-paper';
import {router} from 'expo-router';
import React, {useState} from 'react';
import {Alert, ScrollView, View} from 'react-native';

import {WalletStorageService} from '@/services/wallet-storage-service';
import {tangem, tangemWalletToWallet} from '@/tangem';
import {useEntrances} from '@/entrances';
import {
  QRCodeInputModal,
  useQRCodeInputModalProps,
} from '@/components/qrcode-input-modal';
import {NEW_CARD_BACKUP_NEEDED_FOR_ACCESS_CODE_MESSAGE} from '@/constants/texts';
import {AsyncButton} from '@/components/ui/async-buttons';

const SECRET_PATTERN =
  /^\s*(?:([\da-f]{64})|([a-z]+(?:\s+[a-z]+){11}(?:(?:\s+[a-z]+){3}){0,4}))\s*$/i;

export default function ImportCreateWalletScreen() {
  const {walletStorageService} = useEntrances();

  const [secret, setSecret] = useState('');

  const [, privateKey, mnemonic] = SECRET_PATTERN.exec(secret) ?? [];

  const valid = !!(privateKey || mnemonic);

  const [qrCodeInputModalProps, openQRCodeInputModal] =
    useQRCodeInputModalProps();

  return (
    <>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Import & Create Wallet" />
      </Appbar.Header>
      <QRCodeInputModal {...qrCodeInputModalProps} />
      <ScrollView contentContainerStyle={{flexGrow: 1}}>
        <View style={{margin: 16}}>
          <TextInput
            mode="outlined"
            label="Private key or mnemonic phrase"
            value={secret}
            error={secret !== '' && !valid}
            multiline
            onChangeText={setSecret}
          />
        </View>
        <View style={{margin: 16, marginTop: 0, alignItems: 'flex-end'}}>
          <AsyncButton
            mode="elevated"
            handler={async () => {
              const data = await openQRCodeInputModal(SECRET_PATTERN);

              if (data) {
                setSecret(data);
              }
            }}
          >
            Scan QRCode
          </AsyncButton>
        </View>
      </ScrollView>
      <View style={{margin: 16, position: 'fixed'}}>
        <AsyncButton
          mode="contained"
          disabled={!valid}
          handler={() =>
            importWallet(walletStorageService, {privateKey, mnemonic})
          }
        >
          Import
        </AsyncButton>
      </View>
    </>
  );
}

async function importWallet(
  walletStorageService: WalletStorageService,
  {
    privateKey,
    mnemonic,
  }: {privateKey: string | undefined; mnemonic: string | undefined},
) {
  if (!privateKey && !mnemonic) {
    throw new Error('Either private key or mnemonic phrase is required.');
  }

  const {cardId, wallet} = await tangem.createWallet({
    privateKey,
    mnemonic,
  });

  await walletStorageService.addWallet(tangemWalletToWallet(wallet)!);

  let message = `Wallet has been imported to card ${cardId} successfully.`;

  if (wallet.index === 0) {
    message += `\n\n${NEW_CARD_BACKUP_NEEDED_FOR_ACCESS_CODE_MESSAGE}`;
  }

  Alert.alert('Success', message);

  router.back();
}
