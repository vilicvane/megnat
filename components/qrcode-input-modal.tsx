import {CameraView} from 'expo-camera';
import type {ReactNode} from 'react';
import {useState} from 'react';
import {useWindowDimensions} from 'react-native';
import {Modal, Portal} from 'react-native-paper';

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
  const {width, height} = useWindowDimensions();

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
