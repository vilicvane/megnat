import '@walletconnect/react-native-compat';

import WalletKit from '@reown/walletkit';
import {Core} from '@walletconnect/core';
import type {
  AuthTypes,
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

export const SUPPORTED_METHODS = [
  'eth_sendTransaction',
  'eth_sign',
  'eth_signTypedData',
  'eth_signTypedData_v4',
  'personal_sign',
];

export const SUPPORTED_METHOD_SET = new Set(SUPPORTED_METHODS);

export class WalletKitService {
  private pendingSession:
    | {
        address: string;
        resolve: (message: PendingSessionAuthentication | void) => void;
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

      const {address, resolve, reject} = pendingSession;

      void this.handleSessionProposal(event, address).then(resolve, reject);
    });

    walletKit.on('session_authenticate', event => {
      console.info('session_authenticate', event);

      const pendingSession = this.pendingSession;

      if (!pendingSession) {
        return;
      }

      this.pendingSession = undefined;

      const {address, resolve, reject} = pendingSession;

      void this.handleSessionAuthenticate(event, address).then(resolve, reject);
    });

    walletKit.on('session_request', event => {
      console.info('session_request', event);

      if (SUPPORTED_METHOD_SET.has(event.params.request.method)) {
        this.emitPendingSessionRequestUpdate();
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
      .on('session_expire', () => this.emitSessionUpdate())
      .on('session_delete', () => this.emitSessionUpdate())
      .on('session_request_expire', () =>
        this.emitPendingSessionRequestUpdate(),
      );
  }

  async connect(
    uri: string,
    address: string,
  ): Promise<PendingSessionAuthentication | void> {
    const promise = new Promise<PendingSessionAuthentication | void>(
      (resolve, reject) => {
        this.pendingSession = {address, resolve, reject};
      },
    );

    await this.walletKit.pair({uri});

    return promise;
  }

  async disconnect(topic: string): Promise<void> {
    await this.walletKit.disconnectSession({
      topic,
      reason: getSdkError('USER_DISCONNECTED'),
    });

    this.emitSessionUpdate();
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

  async completeSessionAuthentication(
    id: number,
    auth: AuthTypes.Cacao,
  ): Promise<void> {
    await this.walletKit.approveSessionAuthenticate({
      id,
      auths: [auth],
    });

    this.emitSessionUpdate();
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

    this.emitPendingSessionRequestUpdate();
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

    this.emitPendingSessionRequestUpdate();
  }

  private async handleSessionProposal(
    {id, params}: SignClientTypes.EventArguments['session_proposal'],
    address: string,
  ): Promise<void> {
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
      return;
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

    const approvedNamespaces = buildApprovedNamespaces({
      proposal: params,
      supportedNamespaces: {
        eip155: {
          chains,
          methods,
          events: params.requiredNamespaces.eip155?.events ?? [],
          accounts: chains.map(chain => `${chain}:${address}`),
        },
      },
    });

    await this.walletKit.approveSession({
      id,
      namespaces: approvedNamespaces,
    });

    this.emitSessionUpdate();
  }

  private async handleSessionAuthenticate(
    {id, params}: SignClientTypes.EventArguments['session_authenticate'],
    address: string,
  ): Promise<PendingSessionAuthentication> {
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
      id,
      address,
      authPayload,
      iss,
      message,
    };
  }

  private sessionUpdateCallbackSet = new Set<() => void>();

  onSessionUpdate(callback: () => void): () => void {
    this.sessionUpdateCallbackSet.add(callback);

    return () => {
      this.sessionUpdateCallbackSet.delete(callback);
    };
  }

  emitSessionUpdate(): void {
    this.sessionUpdateCallbackSet.forEach(callback => callback());
  }

  private pendingSessionRequestCallbackSet = new Set<() => void>();

  onPendingSessionRequest(callback: () => void): () => void {
    this.pendingSessionRequestCallbackSet.add(callback);

    return () => {
      this.pendingSessionRequestCallbackSet.delete(callback);
    };
  }

  emitPendingSessionRequestUpdate(): void {
    this.pendingSessionRequestCallbackSet.forEach(callback => callback());
  }

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

export type PendingSessionAuthentication = {
  id: number;
  address: string;
  authPayload: AuthTypes.PayloadParams;
  iss: string;
  message: string;
};

export function useWalletKitSessions(
  service: WalletKitService,
  address?: string,
): SessionTypes.Struct[] {
  const refresh = useRefresh();

  useEffect(() => service.onSessionUpdate(refresh), [refresh, service]);

  let sessions = Object.values(service.walletKit.getActiveSessions());

  if (address) {
    sessions = sessions.filter(session =>
      session.namespaces.eip155.accounts.includes(`eip155:1:${address}`),
    );
  }

  return sessions;
}

export function useWalletKitPendingSessionRequests(
  service: WalletKitService,
  address?: string,
): {
  session: SessionTypes.Struct;
  request: PendingRequestTypes.Struct;
}[] {
  const refresh = useRefresh();

  useEffect(() => service.onPendingSessionRequest(refresh), [refresh, service]);

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

export function getSessionDisplayName(session: SessionTypes.Struct): string {
  return (
    session.peer.metadata.name || new URL(session.peer.metadata.url).hostname
  );
}
