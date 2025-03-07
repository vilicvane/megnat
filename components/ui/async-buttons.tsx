import {
  Button,
  ButtonProps,
  IconButton,
  IconButtonProps,
} from 'react-native-paper';
import {useState} from 'react';

export type AsyncButtonProps = ButtonProps & {
  handler: () => Promise<void>;
};

export function AsyncButton({disabled, handler, ...props}: AsyncButtonProps) {
  const [loading, setLoading] = useState(false);

  return (
    <Button
      {...props}
      loading={loading}
      disabled={disabled || loading}
      onPress={() => {
        setLoading(true);

        void handler()
          .catch(console.error)
          .finally(() => setLoading(false));
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
}: AsyncIconButtonProps) {
  const [loading, setLoading] = useState(false);

  return (
    <IconButton
      {...props}
      loading={loading}
      disabled={disabled || loading}
      onPress={() => {
        setLoading(true);

        void handler()
          .catch(console.error)
          .finally(() => setLoading(false));
      }}
    />
  );
}
