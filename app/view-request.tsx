import {router, useLocalSearchParams} from 'expo-router';
import React, {useEffect, useState} from 'react';

import {useEntrances} from '@/entrances';
import {SendTransaction} from '@/components/request-viewer/send-transaction';
import {Alert} from 'react-native';
import {WalletKitTypes} from '@reown/walletkit';
import {RPC_METHOD_DISPLAY_NAME} from '@/core/chain';
import {SignTypedData} from '@/components/request-viewer/sign-typed-data';
import {SignMessage} from '@/components/request-viewer/sign-message';

export default function ViewRequestScreen() {
  const {walletKitService} = useEntrances();

  const {requestId: requestIdString} = useLocalSearchParams<{
    requestId: string;
  }>();

  const requestId = Number(requestIdString);

  const [request] = useState(() =>
    walletKitService.getPendingSessionRequest(requestId),
  );

  useEffect(() => {
    if (!request) {
      return;
    }

    const callback = (
      event: WalletKitTypes.EventArguments['session_request_expire'],
    ) => {
      if (requestId !== event.id) {
        return;
      }

      router.back();

      const method = RPC_METHOD_DISPLAY_NAME(
        request!.params.request.method,
      ).toLowerCase();

      Alert.alert(
        'Request expired',
        `The ${method} request has expired thus is no longer available to sign.`,
      );
    };

    walletKitService.walletKit.on('session_request_expire', callback);

    return () => {
      walletKitService.walletKit.off('session_request_expire', callback);
    };
  }, [request, requestId]);

  if (!request) {
    return null;
  }

  switch (request.params.request.method) {
    case 'eth_sendTransaction':
      return <SendTransaction request={request} />;
    case 'eth_sign':
    case 'personal_sign':
      return <SignMessage request={request} />;
    case 'eth_signTypedData':
    case 'eth_signTypedData_v4':
      return <SignTypedData request={request} />;
    default:
      return null;
  }
}
