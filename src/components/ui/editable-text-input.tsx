import type {ReactNode} from 'react';
import {useState} from 'react';
import type {TextInputProps} from 'react-native-paper';
import {TextInput} from 'react-native-paper';

export type EditableTextInputProps = TextInputProps & {
  initialValue: string;
  handler?: (text: string) => Promise<void> | void;
  savingEnabled?: boolean;
  pattern?: RegExp;
};

export function EditableTextInput({
  initialValue,
  onChangeText,
  onBlur,
  handler,
  savingEnabled = false,
  pattern,
  ...props
}: EditableTextInputProps): ReactNode {
  const [text, setText] = useState(() => {
    onChangeText?.(initialValue);
    return initialValue;
  });

  const [saving, setSaving] = useState(false);

  const error = pattern ? !pattern.test(text) : false;

  return (
    <TextInput
      {...props}
      value={text}
      error={error}
      onChangeText={text => {
        onChangeText?.(text);
        setText(text);
      }}
      onBlur={event => {
        onBlur?.(event);

        if (!handler || text === initialValue || error) {
          return;
        }

        const result = handler(text);

        if (result instanceof Promise && savingEnabled) {
          setSaving(true);

          void result.finally(() => {
            setSaving(false);
          });
        }
      }}
      right={
        savingEnabled && saving ? (
          <TextInput.Icon icon="loading" loading />
        ) : undefined
      }
    />
  );
}
