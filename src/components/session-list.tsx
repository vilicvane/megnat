import type {SessionTypes} from '@walletconnect/types';
import {router} from 'expo-router';
import type {ReactNode} from 'react';
import {Alert, View} from 'react-native';
import {Badge, IconButton, List, Text} from 'react-native-paper';

import {useEntrances} from '../entrances.js';
import type {WalletKitService} from '../services/index.js';
import {
  SUPPORTED_METHOD_SET,
  getSessionAddressSet,
  getSessionDisplayName,
} from '../services/index.js';
import {useTheme} from '../theme.js';
import {removeEIP155ChainIdPrefix} from '../utils/index.js';

import {SessionIcon} from './session-icon.js';
import {AsyncIconButton} from './ui/index.js';

export type SessionListProps = {
  sessions: SessionTypes.Struct[];
  address?: string;
};

export function SessionList({sessions, address}: SessionListProps): ReactNode {
  const theme = useTheme();

  const {walletKitService} = useEntrances();

  if (sessions.length === 0) {
    return null;
  }

  return (
    <List.Section title="Sessions">
      {sessions.map(session => {
        const unsupported =
          session.namespaces.eip155?.methods.some(
            method => !SUPPORTED_METHOD_SET.has(method),
          ) ?? false;

        const wallets = new Set(
          session.namespaces.eip155?.accounts.map(account =>
            removeEIP155ChainIdPrefix(account),
          ),
        ).size;

        return (
          <List.Item
            key={session.topic}
            left={({style}) => (
              <View style={[style, {alignSelf: 'center'}]}>
                <List.Icon
                  icon={() => <SessionIcon metadata={session.peer.metadata} />}
                />
              </View>
            )}
            title={
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Text>{getSessionDisplayName(session.peer.metadata)}</Text>
                {unsupported && (
                  <IconButton
                    icon="alert-circle-outline"
                    iconColor={theme.colors.onSurfaceVariant}
                    size={20}
                    style={{
                      margin: 0,
                      marginLeft: -4,
                      height: 20,
                    }}
                    onPress={() => {
                      Alert.alert(
                        'Unsupported methods',
                        'This session requires some methods that are not supported by Megnat, thus may not work as expected.',
                      );
                    }}
                  />
                )}
              </View>
            }
            description={new URL(session.peer.metadata.url).hostname}
            descriptionNumberOfLines={1}
            onPress={() =>
              router.push({
                pathname: '/session',
                params: {
                  topic: session.topic,
                },
              })
            }
            right={({style}) => (
              <>
                {(address === undefined || wallets > 1) && (
                  <Badge
                    size={24}
                    style={{
                      alignSelf: 'center',
                      marginRight: -12,
                      backgroundColor: theme.colors.elevation.level2,
                      color: theme.colors.onSurface,
                    }}
                  >
                    {wallets}
                  </Badge>
                )}
                <AsyncIconButton
                  icon="close"
                  style={[style, {marginRight: -8}]}
                  handler={() => disconnect(walletKitService, session, address)}
                />
              </>
            )}
          />
        );
      })}
    </List.Section>
  );
}

async function disconnect(
  walletKitService: WalletKitService,
  session: SessionTypes.Struct,
  address: string | undefined,
): Promise<void> {
  if (address) {
    const addressSet = getSessionAddressSet(session);

    if (addressSet.size > 1) {
      addressSet.delete(address);

      await walletKitService.updateSession(session, Array.from(addressSet));
    } else {
      await walletKitService.disconnect(session);
    }
  } else {
    await walletKitService.disconnect(session);
  }
}
