import type {CoreTypes, Verify} from '@walletconnect/types';
import type {ReactNode} from 'react';
import {View} from 'react-native';
import {Card, Icon, Text} from 'react-native-paper';

import {
  WALLET_KIT_DOMAIN_MISMATCH,
  WALLET_KIT_SCAM_ALERT,
} from '../constants/index.js';
import {getSessionDisplayName} from '../services/index.js';
import {useTheme} from '../theme.js';

import {SessionIcon} from './session-icon.js';

export type SessionVerificationProps = {
  metadata: CoreTypes.Metadata;
  context: Verify.Context;
};

export function SessionVerification({
  metadata,
  context,
}: SessionVerificationProps): ReactNode {
  const theme = useTheme();

  const {verified, dangerous, message} = (() => {
    if (context.verified.isScam) {
      return {
        verified: false,
        dangerous: true,
        message: WALLET_KIT_SCAM_ALERT.message,
      };
    }

    switch (context.verified.validation) {
      case 'VALID':
        return {
          verified: true,
          dangerous: false,
          message: undefined,
        };
      case 'INVALID':
        return {
          verified: false,
          dangerous: true,
          message: WALLET_KIT_DOMAIN_MISMATCH.message,
        };
      case 'UNKNOWN':
      default:
        return {
          verified: false,
          dangerous: false,
          message: undefined,
        };
    }
  })();

  return (
    <View style={{margin: 8}}>
      <Card
        style={{
          backgroundColor: dangerous
            ? theme.colors.secondaryContainer
            : theme.colors.elevation.level2,
        }}
      >
        <Card.Title
          left={({size}) => <SessionIcon metadata={metadata} size={size} />}
          title={getSessionDisplayName(metadata)}
          titleStyle={{minHeight: 24, color: theme.colors.onPrimaryContainer}}
          subtitle={new URL(metadata.url).hostname}
          subtitleStyle={{
            color: theme.colors.onSurfaceVariant,
          }}
          right={() =>
            verified ? (
              <View style={{marginRight: 16}}>
                <Icon
                  source="check-decagram"
                  size={24}
                  color={theme.colors.primary}
                />
              </View>
            ) : null
          }
        />
        {message && (
          <Card.Content>
            <Text style={{color: theme.colors.onPrimaryContainer}}>
              {message}
            </Text>
          </Card.Content>
        )}
      </Card>
    </View>
  );
}
