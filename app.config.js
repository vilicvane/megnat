import {execSync} from 'child_process';

const PRODUCTION = process.env.NODE_ENV === 'production';

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
    package: PRODUCTION ? 'com.megnat' : 'com.megnat.debug',
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
      sha:
        process.env.GITHUB_SHA?.slice(0, 7) ||
        execSync('git rev-parse --short HEAD').toString().trim(),
    },
  },
};
