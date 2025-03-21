import type {PendingRequestTypes, SessionTypes} from '@walletconnect/types';
import {router} from 'expo-router';
import type {ReactNode} from 'react';
import {Text, View} from 'react-native';
import {List} from 'react-native-paper';

import {RPC_METHOD_DISPLAY_NAME} from '../constants/index.js';
import {getSessionDisplayName} from '../services/index.js';
import {useTheme} from '../theme.js';

import {DateFromNow, ListIconClockTicking} from './ui/index.js';

export type PendingRequestListProps = {
  pendingSessionRequests: {
    session: SessionTypes.Struct;
    request: PendingRequestTypes.Struct;
  }[];
};

export function PendingRequestList({
  pendingSessionRequests,
}: PendingRequestListProps): ReactNode {
  const theme = useTheme();

  return (
    <List.Section title="Pending requests">
      {pendingSessionRequests.map(({request, session}) => (
        <List.Item
          key={request.id}
          left={({style}) => (
            <ListIconClockTicking
              color={theme.colors.onSurface}
              style={style}
            />
          )}
          title={getSessionDisplayName(session.peer.metadata)}
          description={
            <View
              style={{
                width: '100%',
                flexDirection: 'row',
                justifyContent: 'space-between',
              }}
            >
              <Text style={{color: theme.colors.primary}}>
                {RPC_METHOD_DISPLAY_NAME(request.params.request.method)}
              </Text>
              {request.params.request.expiryTimestamp && (
                <DateFromNow
                  date={new Date(request.params.request.expiryTimestamp * 1000)}
                  style={{
                    color: theme.colors.onSurfaceVariant,
                  }}
                />
              )}
            </View>
          }
          onPress={() => {
            router.push({
              pathname: '/view-request',
              params: {requestId: request.id},
            });
          }}
        />
      ))}
    </List.Section>
  );
}
