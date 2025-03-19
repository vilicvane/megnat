import {execSync} from 'child_process';

import type {ExpoConfig} from 'expo/config.js';
export default {
  name: 'Megnat',
  slug: 'megnat',
  version: require('./package.json').version,
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'megnat',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#111111',
    },
    package: 'com.megnat',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#111111',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    build: {
      date: Date.now(),
      sha: execSync('git rev-parse --short HEAD').toString().trim(),
    },
  },
} satisfies ExpoConfig;
