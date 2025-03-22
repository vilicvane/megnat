import {type ReactNode} from 'react';
import {View} from 'react-native';
import {List, Text} from 'react-native-paper';

import {useTheme} from '../theme.js';

export function AddressesListItem({
  addresses,
  titlePrefix,
  titleSuffix,
  onAddressPress,
}: {
  addresses: string[];
  titlePrefix?: string;
  titleSuffix?: string;
  onAddressPress?: (address: string) => void;
}): ReactNode {
  const theme = useTheme();

  const title =
    (addresses.length > 1
      ? titlePrefix
        ? `${titlePrefix} addresses`
        : 'Addresses'
      : titlePrefix
        ? `${titlePrefix} address`
        : 'Address') + (titleSuffix ? ` ${titleSuffix}` : '');

  return (
    <List.Item
      title={title}
      description={props =>
        addresses.map(address => (
          <View key={address}>
            <Text
              {...props}
              numberOfLines={1}
              ellipsizeMode="middle"
              style={[
                {
                  color: theme.colors.onSurfaceVariant,
                },
                onAddressPress && {
                  textDecorationLine: 'underline',
                  lineHeight: 24,
                },
              ]}
              onPress={() => onAddressPress?.(address)}
            >
              {address}
            </Text>
          </View>
        ))
      }
    />
  );
}
