import type {MD3Theme} from 'react-native-paper';
import {MD3DarkTheme, useTheme as useTheme_} from 'react-native-paper';

export const THEME = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#1274F0',
    onPrimary: '#ffffff',

    secondary: '#eb3344',
    onSecondary: '#ffffff',

    background: '#000000',

    surface: '#000000',
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
      info: '#4F98F5',
      listIcon: '#ffffff99',
    },
  },
} satisfies MD3Theme;

export const useTheme = useTheme_<typeof THEME>;
