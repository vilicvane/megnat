import type {Wallet} from '../core/index.js';
import type {TangemCardResponse} from '../tangem.js';

import type {PendingSession} from './wallet-kit-service.js';

export class UIService {
  readonly state = {
    card: undefined as TangemCardResponse | undefined,
    pendingSession: undefined as PendingSession | undefined,
  };
}

export type UICardState = {
  id: string;
  wallets: Wallet[];
};
