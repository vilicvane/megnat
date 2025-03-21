import ExpoConstants from 'expo-constants';
import {router} from 'expo-router';
import {openBrowserAsync} from 'expo-web-browser';
import type {ReactNode} from 'react';
import {Image, Pressable, ScrollView, View} from 'react-native';
import {Appbar, Button, Divider, List, Text} from 'react-native-paper';

import {
  MEGNAT_DONATE_URL,
  MEGNAT_REFERRAL_URL,
  MEGNAT_URL,
} from '../constants/index.js';
import {useTheme} from '../theme.js';

export default function AboutScreen(): ReactNode {
  const theme = useTheme();

  const {version, extra} = ExpoConstants.expoConfig!;

  const {
    build: {date, sha},
  } = extra! as {
    build: {
      date: number;
      sha: string;
    };
  };

  return (
    <>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="About" />
      </Appbar.Header>
      <ScrollView contentContainerStyle={{flexGrow: 1}}>
        <Pressable
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            marginVertical: 32,
          }}
          onPress={() => void openBrowserAsync(MEGNAT_URL)}
        >
          <Image
            source={require('../assets/images/compact-icon.png')}
            style={{
              marginLeft: -8,
              width: 48,
              height: 48,
            }}
          />
          <Text variant="headlineLarge" style={{marginLeft: 12}}>
            megnat
          </Text>
        </Pressable>
        <Divider />
        <View style={{padding: 16, gap: 16}}>
          <View>
            <Text variant="bodyLarge">
              Megnat is a{' '}
              <Text
                style={{
                  fontWeight: 'bold',
                  color: theme.colors.primaryContainer,
                }}
              >
                third-party
              </Text>{' '}
              /{' '}
              <Text
                style={{
                  fontWeight: 'bold',
                  color: theme.colors.secondaryContainer,
                }}
              >
                non-official
              </Text>{' '}
              wallet app for Tangem cards.
            </Text>
          </View>
          <View>
            <Text variant="bodyLarge">
              It is created to unleash the full potential of Tangem cards and
              provide a possibly better experience for certain use cases.
            </Text>
          </View>
        </View>
        <Divider />
        <List.Section>
          <List.Item title="Version" description={`${version} (${sha})`} />
          <List.Item
            title="Build Date"
            description={new Date(date).toLocaleString()}
          />
        </List.Section>
      </ScrollView>
      <View style={{padding: 16, gap: 8}}>
        <Button
          mode="contained"
          buttonColor={theme.colors.primaryContainer}
          onPress={() => void openBrowserAsync(MEGNAT_DONATE_URL)}
        >
          Donate
        </Button>
        <Button
          mode="contained"
          buttonColor={theme.colors.secondaryContainer}
          onPress={() => void openBrowserAsync(MEGNAT_REFERRAL_URL)}
        >
          Referral link
        </Button>
      </View>
    </>
  );
}
