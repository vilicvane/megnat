import {useCallback, useEffect, useState} from 'react';

export function useAsyncValue<T>(initializer: () => Promise<T>) {
  const [state, setState] = useState<T>();

  useEffect(() => {
    initializer().then(setState);
  }, []);

  return state;
}

export function useAsyncValueUpdate<T>(
  callback: (update: boolean) => Promise<T>,
) {
  const [state, setState] = useState<T>();

  const update = useCallback(() => {
    callback(true).then(setState).catch(console.error);
  }, [callback]);

  useEffect(() => {
    callback(false).then(setState).catch(console.error);
  }, []);

  return [state, update] as const;
}

export function useValueUpdate<T>(callback: (update: boolean) => T) {
  const [state, setState] = useState<T>();

  const update = useCallback(() => {
    setState(callback(true));
  }, [callback]);

  useEffect(() => {
    setState(callback(false));
  }, []);

  return [state, update] as const;
}

export function useRefresh() {
  const [, setRefresh] = useState(0);

  return useCallback(() => setRefresh(count => count + 1), [setRefresh]);
}

export function useToggle(initialValue: boolean) {
  const [value, setValue] = useState(initialValue);

  const toggle = () => setValue(value => !value);

  return {value, toggle};
}

export function useVisibleOpenClose() {
  const [visible, setVisible] = useState(false);

  const open = () => setVisible(true);
  const close = () => setVisible(false);

  return {visible, open, close};
}
