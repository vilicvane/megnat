import type {SessionTypes} from '@walletconnect/types';
import {router} from 'expo-router';
import type {ReactNode} from 'react';
import {Alert, View} from 'react-native';
import {Badge, IconButton, List, Text} from 'react-native-paper';

import {useEntrances} from '../entrances.js';
import {
  SUPPORTED_METHOD_SET,
  getSessionDisplayName,
} from '../services/index.js';
import {useTheme} from '../theme.js';
import {removeEIP155ChainIdPrefix} from '../utils/index.js';

import {AsyncIconButton} from './ui/index.js';

export type SessionListProps = {
  sessions: SessionTypes.Struct[];
};

export function SessionList({sessions}: SessionListProps): ReactNode {
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
              <View style={style}>
                <List.Icon icon="web" color={theme.colors.listIcon} />
              </View>
            )}
            title={
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Text>{getSessionDisplayName(session)}</Text>
                {unsupported && (
                  <IconButton
                    icon="alert-circle"
                    iconColor={theme.colors.warning}
                    size={16}
                    style={{
                      margin: 0,
                      marginLeft: -4,
                      height: 16,
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
            description={session.peer.metadata.url}
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
                <AsyncIconButton
                  icon="close"
                  style={style}
                  handler={() => walletKitService.disconnect(session)}
                />
              </>
            )}
          />
        );
      })}
    </List.Section>
  );
}
