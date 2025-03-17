import {Slot, SplashScreen} from 'expo-router';
import type {ReactNode} from 'react';
import React, {useEffect} from 'react';
import {StatusBar, View} from 'react-native';
import {MD3DarkTheme, PaperProvider} from 'react-native-paper';

import {EntrancesContext, createEntrances} from '../entrances.js';
import {useAsyncValue} from '../hooks/index.js';

export default function RootLayout(): ReactNode {
  const entrances = useAsyncValue(async () =>
    createEntrances({
      walletKit: {
        projectId: '00ce63cc0e5e65fcc7a50c8bd80c6403',
      },
    }),
  );

  useEffect(() => {
    if (entrances) {
      void SplashScreen.hideAsync();
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
