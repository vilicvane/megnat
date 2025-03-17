import type {AlertButton} from 'react-native';
import {Alert} from 'react-native';

export async function confirm(
  title: string,
  message: string,
  confirmText = 'Confirm',
  destructive = false,
): Promise<boolean> {
  return new Promise<boolean>(resolve => {
    const buttons: AlertButton[] = [
      {text: 'Cancel', style: 'cancel', onPress: () => resolve(false)},
      {
        text: confirmText,
        style: destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ];

    if (destructive) {
      buttons.reverse();
    }

    Alert.alert(title, message, buttons);
  });
}
