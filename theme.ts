import {MD3DarkTheme, useTheme as useTheme_} from 'react-native-paper';

export const THEME = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    alert: '#ffbb00',
  },
};

export const useTheme = useTheme_<typeof THEME>;
