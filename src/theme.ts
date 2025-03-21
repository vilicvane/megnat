import type {MD3Theme} from 'react-native-paper';
import {MD3DarkTheme, useTheme as useTheme_} from 'react-native-paper';

export const THEME = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#60a2f6',
    onPrimary: '#ffffff',

    primaryContainer: '#1274f0',
    onPrimaryContainer: '#ffffff',

    secondary: '#eb3344',
    onSecondary: '#ffffff',

    secondaryContainer: '#eb3344',
    onSecondaryContainer: '#ffffff',

    background: '#000000',

    surface: '#000000',
    surfaceVariant: '#333333',
    onSurfaceVariant: '#ffffffaa',

    elevation: {
      level0: 'transparent',
      level1: '#111111',
      level2: '#222222',
      level3: '#333333',
      level4: '#444444',
      level5: '#555555',
    },

    ...{
      warning: '#ff9d34',
      listIcon: '#ffffff99',
    },
  },
} satisfies MD3Theme;

export const useTheme = useTheme_<typeof THEME>;
