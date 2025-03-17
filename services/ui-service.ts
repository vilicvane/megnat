import type {Wallet} from '../core/index.js';
import type {TangemScanResponse} from '../tangem.js';

import type {PendingSessionAuthentication} from './wallet-kit-service.js';

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
