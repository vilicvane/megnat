import type {ReactNode} from 'react';
import {useEffect, useState} from 'react';
import {List, type ListIconProps} from 'react-native-paper';

export type ListIconClockTickingProps = Omit<ListIconProps, 'icon'> & {
  outline?: boolean;
};

const TICK_ICONS = [
  'clock-time-one',
  'clock-time-two',
  'clock-time-three',
  'clock-time-four',
  'clock-time-five',
  'clock-time-six',
  'clock-time-seven',
  'clock-time-eight',
  'clock-time-nine',
  'clock-time-ten',
  'clock-time-eleven',
  'clock-time-twelve',
];

export function ListIconClockTicking({
  outline = false,
  ...props
}: ListIconClockTickingProps): ReactNode {
  const [ticks, setTicks] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTicks(ticks => ticks + 1);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const icon =
    TICK_ICONS[ticks % TICK_ICONS.length] + (outline ? '-outline' : '');

  return <List.Icon {...props} icon={icon} />;
}
