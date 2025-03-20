import type {Dayjs} from 'dayjs';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import type {ReactNode} from 'react';
import {useEffect, useState} from 'react';
import type {TextProps} from 'react-native-paper';
import {Text} from 'react-native-paper';

dayjs.extend(relativeTime);

export type DateFromNowProps = Omit<TextProps<never>, 'children'> & {
  date: Date;
  interval?: number;
};

export function DateFromNow({
  date,
  interval = 1000,
  ...props
}: DateFromNowProps): ReactNode {
  const now = useNow(interval);
  return <Text {...props}>{dayjs(date).from(now, true)}</Text>;
}

function useNow(interval: number): Dayjs {
  const [now, setNow] = useState(() => dayjs());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(dayjs());
    }, interval);

    return () => clearInterval(timer);
  }, [interval]);

  return now;
}
