import {CameraView, useCameraPermissions} from 'expo-camera';
import type {ReactNode} from 'react';
import {useEffect, useState} from 'react';
import {AppState, View, useWindowDimensions} from 'react-native';
import {Modal, Portal, Text} from 'react-native-paper';

import {useTheme} from '../theme.js';

export type QRCodeInputModalProps = {
  visible: boolean;
  filter?: (data: string) => boolean;
  onDismiss: () => void;
  onQRCodeScanned: (data: string) => void;
};

export function QRCodeInputModal({
  visible,
  filter,
  onDismiss,
  onQRCodeScanned,
}: QRCodeInputModalProps): ReactNode {
  const theme = useTheme();

  const {width, height} = useWindowDimensions();

  const [cameraPermission, requestCameraPermission, getCameraPermission] =
    useCameraPermissions();

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      getCameraPermission,
    );

    return () => subscription.remove();
  }, [getCameraPermission]);

  useEffect(() => {
    if (
      !cameraPermission?.granted &&
      cameraPermission?.canAskAgain &&
      visible
    ) {
      void requestCameraPermission();
    }
  }, [cameraPermission, requestCameraPermission, visible]);

  const cameraSize = Math.min(width, height) * 0.8;

  return (
    <Portal>
      <Modal
        visible={visible}
        style={{
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onDismiss={onDismiss}
      >
        {cameraPermission?.granted ? (
          <CameraView
            style={{width: cameraSize, height: cameraSize, borderRadius: 16}}
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
            onBarcodeScanned={({data}) => {
              if (filter && !filter(data)) {
                return;
              }

              onQRCodeScanned(data);
            }}
          />
        ) : (
          <View
            style={{
              padding: 16,
              borderRadius: 4,
              backgroundColor: theme.colors.surfaceVariant,
            }}
          >
            <Text>Grant camera permission to scan QR codes</Text>
          </View>
        )}
      </Modal>
    </Portal>
  );
}

export function useQRCodeInputModalProps(): [
  QRCodeInputModalProps,
  (pattern?: RegExp) => Promise<string | undefined>,
] {
  const [{visible}, setState] = useState(() => {
    return {
      visible: false,
      pattern: undefined as RegExp | undefined,
      resolve: undefined as ((data: string | undefined) => void) | undefined,
    };
  });

  return [
    {
      visible,
      onQRCodeScanned: (data: string) => {
        setState(state => {
          const {pattern, resolve} = state;

          if (pattern && !pattern.test(data)) {
            return state;
          }

          resolve?.(data);

          return {
            visible: false,
            pattern: undefined,
            resolve: undefined,
          };
        });
      },
      onDismiss: () => {
        setState(state => {
          const {resolve} = state;

          resolve?.(undefined);

          return {
            visible: false,
            pattern: undefined,
            resolve: undefined,
          };
        });
      },
    },
    async pattern => {
      return new Promise<string | undefined>(resolve => {
        setState({
          visible: true,
          pattern,
          resolve,
        });
      });
    },
  ];
}
