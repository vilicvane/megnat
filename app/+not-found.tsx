import {Redirect} from 'expo-router';
import type {ReactNode} from 'react';

export default function NotFoundScreen(): ReactNode {
  return <Redirect href="/" />;
}
