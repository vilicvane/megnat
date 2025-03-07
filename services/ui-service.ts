import {Wallet} from '@/core/wallet';

import {PendingSessionAuthentication} from './wallet-kit-service';
import {TangemScanResponse} from '@/tangem';

export class UIService {
  readonly state = {
    card: undefined as TangemScanResponse | undefined,
    pendingSessionAuthentication: undefined as
      | PendingSessionAuthentication
      | undefined,
  };
}

export type UICardState = {
  id: string;
  wallets: Wallet[];
};
