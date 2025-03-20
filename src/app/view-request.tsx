import type {WalletKitTypes} from '@reown/walletkit';
import {router, useLocalSearchParams} from 'expo-router';
import type {ReactNode} from 'react';
import React, {useEffect, useState} from 'react';
import {Alert} from 'react-native';

import {SendTransaction} from '../components/request-viewer/send-transaction.js';
import {SignMessage} from '../components/request-viewer/sign-message.js';
import {SignTypedData} from '../components/request-viewer/sign-typed-data.js';
import {RPC_METHOD_DISPLAY_NAME} from '../constants/index.js';
import {useEntrances} from '../entrances.js';

export default function ViewRequestScreen(): ReactNode {
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

    function callback(
      event: WalletKitTypes.EventArguments['session_request_expire'],
    ): void {
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
    }

    const walletKit = walletKitService.walletKit;

    walletKit.on('session_request_expire', callback);

    return () => {
      walletKit.off('session_request_expire', callback);
    };
  }, [request, requestId, walletKitService.walletKit]);

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
    case 'eth_signTypedData_v3':
    case 'eth_signTypedData_v4':
      return <SignTypedData request={request} />;
    default:
      return null;
  }
}
