import '@walletconnect/react-native-compat';

import WalletKit from '@reown/walletkit';
import {Core} from '@walletconnect/core';
import type {
  AuthTypes,
  CoreTypes,
  PendingRequestTypes,
  SessionTypes,
  SignClientTypes,
} from '@walletconnect/types';
import {
  buildApprovedNamespaces,
  getSdkError,
  populateAuthPayload,
} from '@walletconnect/utils';
import {useEffect} from 'react';

import {useRefresh} from '../hooks/index.js';
import {
  Event,
  getEIP155ChainIdPrefix,
  removeEIP155ChainIdPrefix,
} from '../utils/index.js';

export const SUPPORTED_METHODS = [
  'eth_sendTransaction',
  'eth_sign',
  'eth_signTypedData',
  'eth_signTypedData_v3',
  'eth_signTypedData_v4',
  'personal_sign',
];

export const SUPPORTED_METHOD_SET = new Set(SUPPORTED_METHODS);

export class WalletKitService {
  private pendingSession:
    | {
        addresses: string[];
        resolve: (pendingSession: PendingSession | false) => void;
        reject: (error: Error) => void;
      }
    | undefined;

  private constructor(readonly walletKit: WalletKit) {
    walletKit.on('session_proposal', event => {
      console.info('session_proposal', event);

      const pendingSession = this.pendingSession;

      if (!pendingSession) {
        return;
      }

      this.pendingSession = undefined;

      const {addresses, resolve, reject} = pendingSession;

      void this.handleSessionProposal(event, addresses).then(resolve, reject);
    });

    walletKit.on('session_authenticate', event => {
      console.info('session_authenticate', event);

      const pendingSession = this.pendingSession;

      if (!pendingSession) {
        return;
      }

      this.pendingSession = undefined;

      const {addresses, resolve, reject} = pendingSession;

      void this.handleSessionAuthenticate(event, addresses[0]).then(
        resolve,
        reject,
      );
    });

    walletKit.on('session_request', event => {
      console.info('session_request', event);

      if (SUPPORTED_METHOD_SET.has(event.params.request.method)) {
        this.pendingSessionRequestUpdate.emit();
      } else {
        void this.rejectSessionRequest(
          event,
          getSdkError('UNSUPPORTED_METHODS'),
        );
      }

      void walletKit.extendSession({
        topic: event.topic,
      });
    });

    walletKit.engine.signClient.events
      .on('session_update', event => {
        console.info('session_update', event);
        this.sessionUpdate.emit();
      })
      .on('session_expire', event => {
        console.info('session_expire', event);
        this.sessionUpdate.emit();
      })
      .on('session_delete', event => {
        console.info('session_delete', event);
        this.sessionUpdate.emit();
      })
      .on('session_request_expire', event => {
        console.info('session_request_expire', event);
        this.pendingSessionRequestUpdate.emit();
      });
  }

  async connect(
    uri: string,
    addresses: string[],
  ): Promise<PendingSession | false> {
    const promise = new Promise<PendingSession | false>((resolve, reject) => {
      this.pendingSession = {addresses, resolve, reject};
    });

    await this.walletKit.pair({uri});

    return promise;
  }

  async disconnect(session: SessionTypes.Struct): Promise<void> {
    await this.walletKit.disconnectSession({
      topic: session.topic,
      reason: getSdkError('USER_DISCONNECTED'),
    });

    this.sessionUpdate.emit();
  }

  async updateSession(
    session: SessionTypes.Struct,
    addresses: string[],
  ): Promise<void> {
    const chains = session.namespaces.eip155.chains ?? [];

    const namespaces = {
      ...session.namespaces,
      eip155: {
        ...session.namespaces.eip155,
        accounts: addresses.flatMap(address =>
          chains.map(chain => `${chain}:${address}`),
        ),
      },
    };

    await this.walletKit.updateSession({
      topic: session.topic,
      namespaces,
    });

    this.sessionUpdate.emit();
  }

  async switchSessionAccount(
    session: SessionTypes.Struct,
    addresses: string[],
  ): Promise<void> {
    const chainId = getEIP155ChainIdPrefix(
      session.namespaces.eip155.accounts[0],
    );

    await this.walletKit.emitSessionEvent({
      topic: session.topic,
      event: {
        name: 'accountsChanged',
        data: addresses,
      },
      chainId,
    });
  }

  getPendingSessionRequests(): PendingRequestTypes.Struct[] {
    return this.walletKit
      .getPendingSessionRequests()
      .filter(request =>
        SUPPORTED_METHOD_SET.has(request.params.request.method),
      );
  }

  getPendingSessionRequest(id: number): PendingRequestTypes.Struct | undefined {
    return this.getPendingSessionRequests().find(request => request.id === id);
  }

  async completeSessionProposal(
    id: number,
    namespaces: SessionTypes.Namespaces,
  ): Promise<void> {
    await this.walletKit.approveSession({
      id,
      namespaces,
    });

    this.sessionUpdate.emit();
  }

  async rejectSessionProposal(id: number): Promise<void> {
    await this.walletKit.rejectSession({
      id,
      reason: getSdkError('USER_REJECTED'),
    });
  }

  async completeSessionAuthentication(
    id: number,
    auth: AuthTypes.Cacao,
  ): Promise<void> {
    await this.walletKit.approveSessionAuthenticate({
      id,
      auths: [auth],
    });

    this.sessionUpdate.emit();
  }

  async rejectSessionAuthentication(id: number): Promise<void> {
    await this.walletKit.rejectSessionAuthenticate({
      id,
      reason: getSdkError('USER_REJECTED'),
    });
  }

  async rejectSessionRequest(
    {topic, id}: PendingRequestTypes.Struct,
    error = getSdkError('USER_REJECTED'),
  ): Promise<void> {
    await this.walletKit.respondSessionRequest({
      topic,
      response: {
        id,
        jsonrpc: '2.0',
        error,
      },
    });

    this.pendingSessionRequestUpdate.emit();
  }

  async completeSessionRequest(
    request: PendingRequestTypes.Struct,
    result: string,
  ): Promise<void> {
    await this.walletKit.respondSessionRequest({
      topic: request.topic,
      response: {
        id: request.id,
        jsonrpc: '2.0',
        result,
      },
    });

    this.pendingSessionRequestUpdate.emit();
  }

  private async handleSessionProposal(
    event: SignClientTypes.EventArguments['session_proposal'],
    addresses: string[],
  ): Promise<PendingSession | false> {
    const {id, params} = event;

    const chains = Array.from(
      new Set([
        ...(params.requiredNamespaces.eip155?.chains ?? []),
        ...(params.optionalNamespaces.eip155?.chains ?? []),
      ]),
    );

    if (chains.length === 0) {
      await this.walletKit.rejectSession({
        id,
        reason: getSdkError('UNSUPPORTED_CHAINS'),
      });

      return false;
    }

    // Filter out unsupported methods in optional namespaces but accept all
    // methods in required namespaces to maximize compatibility.
    const methods = Array.from(
      new Set([
        ...(params.requiredNamespaces.eip155?.methods ?? []),
        ...(params.optionalNamespaces.eip155?.methods.filter(method =>
          SUPPORTED_METHOD_SET.has(method),
        ) ?? []),
      ]),
    );

    const events = Array.from(
      new Set([
        ...(params.requiredNamespaces.eip155?.events ?? []),
        ...(params.optionalNamespaces.eip155?.events ?? []),
      ]),
    );

    const approvedNamespaces = buildApprovedNamespaces({
      proposal: params,
      supportedNamespaces: {
        eip155: {
          chains,
          methods,
          events,
          accounts: addresses.flatMap(address =>
            chains.map(chain => `${chain}:${address}`),
          ),
        },
      },
    });

    return {
      type: 'proposal',
      addresses,
      proposal: event,
      namespaces: approvedNamespaces,
    };
  }

  private async handleSessionAuthenticate(
    event: SignClientTypes.EventArguments['session_authenticate'],
    address: string,
  ): Promise<PendingSession> {
    const {id, params} = event;

    const chains = params.authPayload.chains.filter(chain =>
      chain.startsWith('eip155:'),
    );

    if (chains.length === 0) {
      await this.walletKit.rejectSessionAuthenticate({
        id,
        reason: getSdkError('UNSUPPORTED_CHAINS'),
      });

      throw new Error('No supported chains to authenticate.');
    }

    const authPayload = populateAuthPayload({
      authPayload: params.authPayload,
      chains,
      methods: SUPPORTED_METHODS,
    });

    const iss = `${chains[0]}:${address}`;

    const message = this.walletKit.formatAuthMessage({
      request: authPayload,
      iss,
    });

    return {
      type: 'authenticate',
      address,
      authenticate: event,
      authPayload,
      iss,
      message,
    };
  }

  readonly sessionUpdate = new Event<void>('session-update');

  readonly pendingSessionRequestUpdate = new Event<void>(
    'pending-session-request-update',
  );

  static async create(projectId: string): Promise<WalletKitService> {
    const walletKit = await WalletKit.init({
      core: new Core({
        projectId,
      }),
      metadata: {
        name: 'Megnat',
        description: 'Minimal Tangem Wallet',
        url: 'https://megnat.app',
        icons: ['https://walletconnect.network/favicon.ico'],
      },
    });

    return new WalletKitService(walletKit);
  }
}

export type PendingSession =
  | PendingSessionProposal
  | PendingSessionAuthentication;

export type PendingSessionAuthentication = {
  type: 'authenticate';
  address: string;
  authenticate: SignClientTypes.EventArguments['session_authenticate'];
  authPayload: AuthTypes.PayloadParams;
  iss: string;
  message: string;
};

export type PendingSessionProposal = {
  type: 'proposal';
  addresses: string[];
  proposal: SignClientTypes.EventArguments['session_proposal'];
  namespaces: SessionTypes.Namespaces;
};

export function useWalletKitSessions(
  service: WalletKitService,
  address?: string,
): SessionTypes.Struct[] {
  const refresh = useRefresh();

  useEffect(() => service.sessionUpdate.on(refresh), [refresh, service]);

  let sessions = Object.values(service.walletKit.getActiveSessions());

  if (address) {
    sessions = sessions.filter(session =>
      session.namespaces.eip155.accounts.includes(`eip155:1:${address}`),
    );
  }

  return sessions;
}

export function useWalletKitSession(
  service: WalletKitService,
  topic: string | undefined,
): SessionTypes.Struct | undefined {
  const refresh = useRefresh();

  useEffect(() => service.sessionUpdate.on(refresh), [refresh, service]);

  if (topic === undefined) {
    return undefined;
  }

  return service.walletKit.getActiveSessions()[topic];
}

export function useWalletKitPendingSessionRequests(
  service: WalletKitService,
  address?: string,
): {
  session: SessionTypes.Struct;
  request: PendingRequestTypes.Struct;
}[] {
  const refresh = useRefresh();

  useEffect(
    () => service.pendingSessionRequestUpdate.on(refresh),
    [refresh, service],
  );

  const topicToSessionDict = service.walletKit.getActiveSessions();

  let requests = service.getPendingSessionRequests().map(request => {
    return {
      session: topicToSessionDict[request.topic],
      request,
    };
  });

  if (address) {
    requests = requests.filter(request =>
      request.session.namespaces.eip155.accounts.includes(
        `eip155:1:${address}`,
      ),
    );
  }

  return requests;
}

export function useWalletKitSessionPendingRequests(
  service: WalletKitService,
  session: SessionTypes.Struct | undefined,
): PendingRequestTypes.Struct[] {
  const refresh = useRefresh();

  useEffect(
    () => service.pendingSessionRequestUpdate.on(refresh),
    [refresh, service],
  );

  if (!session) {
    return [];
  }

  return service
    .getPendingSessionRequests()
    .filter(request => request.topic === session.topic);
}

export function getSessionDisplayName(metadata: CoreTypes.Metadata): string {
  return metadata.name || new URL(metadata.url).hostname;
}

export function getSessionAddressSet(
  session: SessionTypes.Struct,
): Set<string> {
  return new Set(
    session.namespaces.eip155.accounts.map(account =>
      removeEIP155ChainIdPrefix(account),
    ),
  );
}
