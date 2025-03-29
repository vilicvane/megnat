import {type ReactNode} from 'react';
import {View} from 'react-native';
import {Icon, List, Text} from 'react-native-paper';

import {useEntrances} from '../entrances.js';
import {useWalletAddressSet} from '../services/index.js';
import {useTheme} from '../theme.js';

export function AddressesListItem({
  addresses,
  titlePrefix,
  titleSuffix,
  onAddressPress,
  checkWalletAddresses = true,
}: {
  addresses: string[];
  checkWalletAddresses?: boolean;
  titlePrefix?: string;
  titleSuffix?: string;
  onAddressPress?: (address: string) => void;
}): ReactNode {
  const theme = useTheme();

  const {walletStorageService} = useEntrances();

  const title =
    (addresses.length > 1
      ? titlePrefix
        ? `${titlePrefix} addresses`
        : 'Addresses'
      : titlePrefix
        ? `${titlePrefix} address`
        : 'Address') + (titleSuffix ? ` ${titleSuffix}` : '');

  const addressSet = useWalletAddressSet(walletStorageService);

  return (
    <List.Item
      title={title}
      description={props =>
        addresses.map(address => (
          <View
            key={address}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <View style={{flex: 1}}>
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
            {checkWalletAddresses && addressSet.has(address) && (
              <View
                style={{
                  marginLeft: 2,
                  flex: 0,
                }}
              >
                <Icon source="check" size={20} color={theme.colors.primary} />
              </View>
            )}
          </View>
        ))
      }
    />
  );
}
