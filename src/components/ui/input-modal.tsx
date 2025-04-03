import {type ReactNode, useState} from 'react';
import type {TextInputProps} from 'react-native';
import {TextInput, View} from 'react-native';
import {IconButton, Modal} from 'react-native-paper';

import {useTheme} from '../../theme.js';

export type InputModalProps = TextInputProps & {
  visible: boolean;
  onDismiss: () => void;
  onSubmit: (value: string) => void;
};

export function InputModal({
  visible,
  onDismiss,
  onSubmit,
  ...props
}: InputModalProps): ReactNode {
  const theme = useTheme();

  const [value, setValue] = useState('');

  return (
    <Modal
      style={{
        justifyContent: 'flex-end',
      }}
      visible={visible}
      onDismiss={() => {
        setValue('');
        onDismiss();
      }}
    >
      <View
        style={{
          backgroundColor: theme.colors.elevation.level3,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <TextInput
          style={{
            flex: 1,
            padding: 16,
            fontSize: 16,
            color: theme.colors.onSurface,
          }}
          placeholderTextColor={theme.colors.onSurfaceVariant}
          keyboardType="numeric"
          returnKeyType="done"
          autoFocus
          value={value}
          onChangeText={setValue}
          onSubmitEditing={() => {
            setValue('');
            onSubmit(value);
          }}
          {...props}
        />
        <IconButton
          icon="check"
          iconColor={theme.colors.primary}
          onPress={() => {
            setValue('');
            onSubmit(value);
          }}
        />
      </View>
    </Modal>
  );
}

export function useInputModalProps(): [
  InputModalProps,
  () => Promise<string | undefined>,
] {
  const [{visible}, setState] = useState(() => {
    return {
      visible: false,
      resolve: undefined as ((value: string | undefined) => void) | undefined,
    };
  });

  return [
    {
      visible,
      onSubmit: (value: string) => {
        setState(state => {
          const {resolve} = state;

          resolve?.(value);

          return {
            visible: false,
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
            resolve: undefined,
          };
        });
      },
    },
    async () => {
      return new Promise<string | undefined>(resolve => {
        setState({
          visible: true,
          resolve,
        });
      });
    },
  ];
}
