import * as Clipboard from 'expo-clipboard';
import {ToastAndroid} from 'react-native';

export async function copy(text: string): Promise<void> {
  await Clipboard.setStringAsync(text);

  ToastAndroid.show('Copied to clipboard', ToastAndroid.SHORT);
}
