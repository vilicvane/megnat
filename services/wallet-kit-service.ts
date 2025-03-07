import '@walletconnect/react-native-compat';

import {useEffect} from 'react';
import {Core} from '@walletconnect/core';
import {
  AuthTypes,
  PendingRequestTypes,
  SessionTypes,
  SignClientTypes,
} from '@walletconnect/types';
import WalletKit from '@reown/walletkit';
import {
  buildApprovedNamespaces,
  getSdkError,
  populateAuthPayload,
} from '@walletconnect/utils';

import {useRefresh} from '@/hooks/miscellaneous';

const SUPPORTED_METHODS = [
  'eth_sendTransaction',
  'eth_sign',
  'eth_signTypedData',
  'eth_signTypedData_v4',
  'personal_sign',
];

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
      console.log('session_proposal', event);

      const pendingSession = this.pendingSession;

      if (!pendingSession) {
        return;
      }

      this.pendingSession = undefined;

      const {address, resolve, reject} = pendingSession;

      void this.handleSessionProposal(event, address).then(resolve, reject);
    });

    walletKit.on('session_authenticate', event => {
      console.log('session_authenticate', event);

      const pendingSession = this.pendingSession;

      if (!pendingSession) {
        return;
      }

      this.pendingSession = undefined;

      const {address, resolve, reject} = pendingSession;

      void this.handleSessionAuthenticate(event, address).then(resolve, reject);
    });

    walletKit.on('session_request', event => {
      console.log('session_request', event);

      this.emitPendingSessionRequestUpdate();

      void walletKit
        .extendSession({
          topic: event.topic,
        })
        .catch(console.error);
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

  async disconnect(topic: string) {
    await this.walletKit.disconnectSession({
      topic,
      reason: getSdkError('USER_DISCONNECTED'),
    });

    this.emitSessionUpdate();
  }

  getPendingSessionRequest(id: number) {
    return this.walletKit
      .getPendingSessionRequests()
      .find(request => request.id === id);
  }

  async completeSessionAuthentication(id: number, auth: AuthTypes.Cacao) {
    await this.walletKit.approveSessionAuthenticate({
      id,
      auths: [auth],
    });

    this.emitSessionUpdate();
  }

  async rejectSessionAuthentication(id: number) {
    await this.walletKit.rejectSessionAuthenticate({
      id,
      reason: getSdkError('USER_REJECTED'),
    });
  }

  async rejectSessionRequest({topic, id}: PendingRequestTypes.Struct) {
    await this.walletKit.respondSessionRequest({
      topic,
      response: {
        id,
        jsonrpc: '2.0',
        error: getSdkError('USER_REJECTED'),
      },
    });

    this.emitPendingSessionRequestUpdate();
  }

  async completeSessionRequest(
    request: PendingRequestTypes.Struct,
    result: string,
  ) {
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
  ) {
    const chains = [
      ...(params.requiredNamespaces.eip155?.chains ?? []),
      ...(params.optionalNamespaces.eip155?.chains ?? []),
    ];

    if (chains.length === 0) {
      this.walletKit.rejectSession({
        id,
        reason: getSdkError('UNSUPPORTED_CHAINS'),
      });
      return;
    }

    const approvedNamespaces = buildApprovedNamespaces({
      proposal: params,
      supportedNamespaces: {
        eip155: {
          chains,
          methods: SUPPORTED_METHODS,
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
      this.walletKit.rejectSessionAuthenticate({
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

  onSessionUpdate(callback: () => void) {
    this.sessionUpdateCallbackSet.add(callback);

    return () => {
      this.sessionUpdateCallbackSet.delete(callback);
    };
  }

  emitSessionUpdate() {
    this.sessionUpdateCallbackSet.forEach(callback => callback());
  }

  private pendingSessionRequestCallbackSet = new Set<() => void>();

  onPendingSessionRequest(callback: () => void) {
    this.pendingSessionRequestCallbackSet.add(callback);

    return () => {
      this.pendingSessionRequestCallbackSet.delete(callback);
    };
  }

  emitPendingSessionRequestUpdate() {
    this.pendingSessionRequestCallbackSet.forEach(callback => callback());
  }

  static async create(projectId: string) {
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
) {
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

  let topicToSessionDict = service.walletKit.getActiveSessions();

  let requests = service.walletKit.getPendingSessionRequests().map(request => {
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
