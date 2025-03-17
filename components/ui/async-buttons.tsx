import type {ReactNode} from 'react';
import {useState} from 'react';
import type {ButtonProps, IconButtonProps} from 'react-native-paper';
import {Button, IconButton} from 'react-native-paper';

export type AsyncButtonProps = ButtonProps & {
  handler: () => Promise<void>;
};

export function AsyncButton({
  disabled,
  handler,
  ...props
}: AsyncButtonProps): ReactNode {
  const [loading, setLoading] = useState(false);

  return (
    <Button
      {...props}
      loading={loading}
      disabled={disabled || loading}
      onPress={() => {
        setLoading(true);

        void handler().finally(() => setLoading(false));
      }}
    />
  );
}

export type AsyncIconButtonProps = IconButtonProps & {
  handler: () => Promise<void>;
};

export function AsyncIconButton({
  disabled,
  handler,
  ...props
}: AsyncIconButtonProps): ReactNode {
  const [loading, setLoading] = useState(false);

  return (
    <IconButton
      {...props}
      loading={loading}
      disabled={disabled || loading}
      onPress={() => {
        setLoading(true);

        void handler().finally(() => setLoading(false));
      }}
    />
  );
}
