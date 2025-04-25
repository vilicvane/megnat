import {Slot, SplashScreen} from 'expo-router';
import type {ReactNode} from 'react';
import React, {useEffect} from 'react';
import {LogBox, StatusBar, View} from 'react-native';
import {PaperProvider} from 'react-native-paper';
import {setUnhandledPromiseRejectionTracker} from 'react-native-promise-rejection-utils';

import {EntrancesContext, entrancesPromise} from '../entrances.js';
import {useAsyncValue} from '../hooks/index.js';
import {THEME} from '../theme.js';

void SplashScreen.preventAutoHideAsync();

LogBox.ignoreAllLogs();

setUnhandledPromiseRejectionTracker((_id, error) => {
  console.error(error);
});

export default function RootLayout(): ReactNode {
  const entrances = useAsyncValue(() => entrancesPromise, []);

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
        backgroundColor={THEME.colors.background}
      />
      <PaperProvider theme={THEME}>
        <EntrancesContext.Provider value={entrances}>
          <View style={{flex: 1, backgroundColor: THEME.colors.background}}>
            <Slot />
          </View>
        </EntrancesContext.Provider>
      </PaperProvider>
    </>
  );
}
