import type {EffectCallback} from 'react';
import {useEffect, useRef, useState} from 'react';
import useEvent from 'react-use-event-hook';

import type {Event} from '../utils/index.js';

export function useMountEffect(callback: EffectCallback): void {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(callback, []);
}

export function useAsyncValue<T>(
  initializer: () => Promise<T>,
  deps: unknown[],
): T | undefined {
  const [state, setState] = useState<{
    update: number;
    value: T;
  }>();

  const updateRef = useRef(0);

  useEffect(() => {
    const update = ++updateRef.current;

    void initializer().then(value =>
      setState(state => {
        if (state && state.update >= update) {
          return state;
        }

        return {
          update,
          value,
        };
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state?.value;
}

export function useAsyncValueUpdate<T>(
  callback: (update: boolean) => Promise<T>,
): [T | undefined, () => void] {
  const [state, setState] = useState<T>();

  const update = useEvent(() => {
    void callback(true).then(setState);
  });

  useMountEffect(() => void callback(false).then(setState));

  return [state, update];
}

export function useRefresh(): () => void {
  const [, setRefresh] = useState(0);

  return useEvent(() => setRefresh(count => count + 1));
}

export function useToggle(initialValue: boolean): {
  value: boolean;
  toggle: () => void;
} {
  const [value, setValue] = useState(initialValue);

  const toggle = useEvent(() => setValue(value => !value));

  return {value, toggle};
}

export function useVisibleOpenClose(): {
  visible: boolean;
  open: () => void;
  close: () => void;
} {
  const [visible, setVisible] = useState(false);

  const open = useEvent(() => setVisible(true));
  const close = useEvent(() => setVisible(false));

  return {visible, open, close};
}

export function useEventUpdateValue<T, TEventData>(
  event: Event<TEventData> | Event<TEventData>[],
  callback: (event: TEventData | undefined) => T,
): T {
  const [value, setValue] = useState(() => callback(undefined));

  callback = useEvent(callback);

  const events = Array.isArray(event) ? event : [event];

  useEffect(() => {
    const disposers = events.map(event =>
      event.on(data => setValue(callback(data))),
    );

    return () => {
      for (const disposer of disposers) {
        disposer();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callback, ...events]);

  return value;
}
