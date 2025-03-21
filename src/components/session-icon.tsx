import type {CoreTypes} from '@walletconnect/types';
import {Image} from 'expo-image';
import type {ReactNode} from 'react';
import {View} from 'react-native';
import {Icon} from 'react-native-paper';
import {SvgWithCss} from 'react-native-svg/css';

import {useTheme} from '../theme.js';

export type SessionIconProps = {
  metadata: CoreTypes.Metadata;
  size?: number;
};

export function SessionIcon({
  metadata,
  size = 24,
}: SessionIconProps): ReactNode {
  const theme = useTheme();

  const icon = metadata.icons
    .map(icon => {
      if (icon.startsWith('<')) {
        return {
          type: 'svg',
          xml: icon,
          priority: 0,
        };
      } else {
        return {
          type: 'uri',
          uri: icon,
          priority: 1,
        };
      }
    })
    .sort((a, b) => a.priority - b.priority)[0];

  switch (icon?.type) {
    case 'svg':
      return (
        <View style={{width: size, height: size}}>
          <SvgWithCss xml={icon.xml!} width={size} height={size} />
        </View>
      );
    case 'uri':
      return (
        <Image
          source={{uri: icon.uri}}
          style={{width: size, height: size}}
          cachePolicy="memory-disk"
        />
      );
    default:
      return <Icon source="web" size={size} color={theme.colors.listIcon} />;
  }
}
