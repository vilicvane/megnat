import {useState} from 'react';
import {TextInput, TextInputProps} from 'react-native-paper';

export type EditableTextInputProps = TextInputProps & {
  initialValue: string;
  handler?: (text: string) => Promise<void>;
  savingEnabled?: boolean;
};

export function EditableTextInput({
  initialValue,
  onChangeText,
  onBlur,
  handler,
  savingEnabled = false,
  ...props
}: EditableTextInputProps) {
  const [text, setText] = useState(() => {
    onChangeText?.(initialValue);
    return initialValue;
  });

  const [saving, setSaving] = useState(false);

  return (
    <TextInput
      {...props}
      value={text}
      right={
        savingEnabled && saving ? (
          <TextInput.Icon icon="loading" loading />
        ) : undefined
      }
      onChangeText={text => {
        onChangeText?.(text);
        setText(text);
      }}
      onBlur={event => {
        onBlur?.(event);

        if (!handler || text === initialValue) {
          return;
        }

        if (savingEnabled) {
          setSaving(true);
        }

        void handler(text)
          .catch(console.error)
          .finally(() => {
            if (savingEnabled) {
              setSaving(false);
            }
          });
      }}
    />
  );
}
