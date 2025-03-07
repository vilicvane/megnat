import {createEntrances, EntrancesContext} from '@/entrances';
import {useAsyncValue} from '@/hooks/miscellaneous';
import {Slot, SplashScreen} from 'expo-router';
import React, {useEffect} from 'react';
import {StatusBar, View} from 'react-native';
import {MD3DarkTheme, PaperProvider} from 'react-native-paper';

export default function RootLayout() {
  const entrances = useAsyncValue(async () =>
    createEntrances({
      walletKit: {
        projectId: '00ce63cc0e5e65fcc7a50c8bd80c6403',
      },
    }),
  );

  useEffect(() => {
    if (entrances) {
      SplashScreen.hideAsync();
    }
  }, [entrances]);

  if (!entrances) {
    return null;
  }

  return (
    <>
      <StatusBar
        barStyle="light-content"
        backgroundColor={MD3DarkTheme.colors.background}
      />
      <PaperProvider theme={MD3DarkTheme}>
        <EntrancesContext.Provider value={entrances}>
          <View
            style={{flex: 1, backgroundColor: MD3DarkTheme.colors.background}}
          >
            <Slot />
          </View>
        </EntrancesContext.Provider>
      </PaperProvider>
    </>
  );
}
