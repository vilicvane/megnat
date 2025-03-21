import type {SessionTypes} from '@walletconnect/types';
import {router, useLocalSearchParams} from 'expo-router';
import type {Dispatch, ReactNode, SetStateAction} from 'react';
import {useEffect, useMemo, useState} from 'react';
import {ScrollView, ToastAndroid, View} from 'react-native';
import {Appbar, Badge, Checkbox, List} from 'react-native-paper';

import {PendingRequestList} from '../components/pending-request-list.js';
import {SessionIcon} from '../components/session-icon.js';
import {AsyncButton, AsyncIconButton} from '../components/ui/index.js';
import {useEntrances} from '../entrances.js';
import type {WalletKitService} from '../services/index.js';
import {
  getSessionDisplayName,
  useWalletKitSession,
  useWalletKitSessionPendingRequests,
  useWallets,
} from '../services/index.js';
import {useTheme} from '../theme.js';
import {removeEIP155ChainIdPrefix} from '../utils/index.js';

export default function SessionScreen(): ReactNode {
  const theme = useTheme();

  const {topic} = useLocalSearchParams<{topic: string}>();

  const {walletKitService, walletStorageService} = useEntrances();

  const session = useWalletKitSession(walletKitService, topic);

  const wallets = useWallets(walletStorageService);

  const [sessionAddressSet, walletAddresses, unknownAddresses] = useMemo(() => {
    const sessionAddressSet = new Set(
      session?.namespaces.eip155.accounts.map(account =>
        removeEIP155ChainIdPrefix(account),
      ),
    );

    const unknownAddressSet = new Set(sessionAddressSet);

    const walletAddresses: string[] = [];

    for (const wallet of wallets) {
      for (const derivation of wallet.derivations) {
        if (unknownAddressSet.has(derivation.address)) {
          unknownAddressSet.delete(derivation.address);
        }

        walletAddresses.push(derivation.address);
      }
    }

    for (const address of unknownAddressSet) {
      sessionAddressSet.delete(address);
    }

    return [sessionAddressSet, walletAddresses, Array.from(unknownAddressSet)];
  }, [session, wallets]);

  const [addressOverrideMap, setAddressOverrideMap] = useState(
    () => new Map<string, boolean>(),
  );

  useEffect(() => {
    if (!session) {
      router.back();
    }
  }, [session]);

  const selectedAddresses = useMemo(
    () =>
      walletAddresses.filter(
        address =>
          addressOverrideMap.get(address) ?? sessionAddressSet.has(address),
      ),
    [addressOverrideMap, sessionAddressSet, walletAddresses],
  );

  const pendingRequests = useWalletKitSessionPendingRequests(
    walletKitService,
    session,
  );

  const pendingSessionRequests = session
    ? pendingRequests.map(request => {
        return {
          session,
          request,
        };
      })
    : [];

  const ableToUpdate =
    addressOverrideMap.size > 0 && selectedAddresses.length > 0;

  if (!session) {
    return null;
  }

  return (
    <>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Session" />
      </Appbar.Header>
      <ScrollView contentContainerStyle={{flexGrow: 1}}>
        <List.Section>
          <List.Item
            left={({style}) => (
              <View style={[style, {alignSelf: 'center'}]}>
                <List.Icon
                  icon={() => <SessionIcon metadata={session.peer.metadata} />}
                />
              </View>
            )}
            title={getSessionDisplayName(session.peer.metadata)}
            description={session.peer.metadata.url}
          />
        </List.Section>
        {pendingSessionRequests.length > 0 && (
          <PendingRequestList pendingSessionRequests={pendingSessionRequests} />
        )}
        <List.Section title="Wallets">
          {wallets.map(wallet => {
            const checked = wallet.derivations.filter(
              derivation =>
                addressOverrideMap.get(derivation.address) ??
                sessionAddressSet.has(derivation.address),
            ).length;

            const overridden = wallet.derivations.some(derivation =>
              addressOverrideMap.has(derivation.address),
            );

            return (
              <List.Accordion
                key={wallet.publicKey}
                left={({color, style}) => (
                  <List.Icon
                    icon={wallet.chainCode ? 'key-link' : 'key'}
                    color={
                      color === theme.colors.primary
                        ? theme.colors.onSurface
                        : color
                    }
                    style={style}
                  />
                )}
                title={wallet.name}
                titleStyle={{color: theme.colors.onSurface}}
                right={({isExpanded}) => (
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    {(checked > 0 || overridden) && (
                      <Badge
                        size={24}
                        style={[
                          {
                            alignSelf: 'center',
                            marginRight: 12,
                          },
                          overridden
                            ? {
                                backgroundColor: theme.colors.primaryContainer,
                                color: theme.colors.onPrimaryContainer,
                              }
                            : {
                                backgroundColor: theme.colors.elevation.level2,
                                color: theme.colors.onSurface,
                              },
                        ]}
                      >
                        {checked}
                      </Badge>
                    )}
                    <List.Icon
                      icon={isExpanded ? 'chevron-up' : 'chevron-down'}
                      color={theme.colors.onSurfaceVariant}
                    />
                  </View>
                )}
              >
                {wallet.derivations.map(({path, address}) => {
                  const inSession = sessionAddressSet.has(address);

                  const checked = addressOverrideMap.get(address) ?? inSession;

                  const overridden = addressOverrideMap.has(address);

                  return (
                    <List.Item
                      key={address}
                      style={{marginLeft: 8}}
                      left={({style}) => (
                        <View
                          style={[style, {marginVertical: -8, marginRight: -8}]}
                        >
                          <Checkbox
                            status={checked ? 'checked' : 'unchecked'}
                            {...(overridden
                              ? {
                                  color: theme.colors.primaryContainer,
                                  uncheckedColor: theme.colors.primaryContainer,
                                }
                              : {
                                  color: theme.colors.onSurface,
                                  uncheckedColor: theme.colors.onSurfaceVariant,
                                })}
                            onPress={() =>
                              overrideAddress(
                                sessionAddressSet,
                                address,
                                !checked,
                                setAddressOverrideMap,
                              )
                            }
                          />
                        </View>
                      )}
                      title={address}
                      titleEllipsizeMode="middle"
                      description={path}
                      right={({style}) => (
                        <AsyncIconButton
                          icon="swap-horizontal-circle"
                          style={[style, {marginVertical: -8}]}
                          handler={() =>
                            switchSessionAccount(
                              walletKitService,
                              session,
                              sessionAddressSet,
                              address,
                              setAddressOverrideMap,
                            )
                          }
                        />
                      )}
                    />
                  );
                })}
              </List.Accordion>
            );
          })}
        </List.Section>
        {unknownAddresses.length > 0 && (
          <List.Accordion
            title="Unknown addresses"
            titleStyle={{color: theme.colors.onSurface}}
            left={({color, style}) => (
              <List.Icon
                icon="key-remove"
                color={
                  color === theme.colors.primary
                    ? theme.colors.onSurface
                    : color
                }
                style={style}
              />
            )}
          >
            {unknownAddresses.map(address => (
              <List.Item
                key={address}
                title={address}
                titleEllipsizeMode="middle"
              />
            ))}
          </List.Accordion>
        )}
      </ScrollView>
      <View style={{margin: 16, flexDirection: 'row', gap: 8}}>
        <AsyncButton
          mode="contained"
          buttonColor={theme.colors.secondaryContainer}
          style={{flex: 1, flexBasis: 0}}
          handler={() => walletKitService.disconnect(session)}
        >
          Disconnect
        </AsyncButton>
        <AsyncButton
          mode="contained"
          disabled={!ableToUpdate}
          buttonColor={theme.colors.primaryContainer}
          style={{flex: 1, flexBasis: 0}}
          handler={async () => {
            await walletKitService.updateSession(session, selectedAddresses);

            setAddressOverrideMap(new Map());
          }}
        >
          Update
        </AsyncButton>
      </View>
    </>
  );
}

function overrideAddress(
  sessionAddressSet: Set<string>,
  address: string,
  selected: boolean,
  setOverrideMap: Dispatch<SetStateAction<Map<string, boolean>>>,
): void {
  setOverrideMap(overrideMap => {
    if (sessionAddressSet.has(address) === selected) {
      const updatedOverrideMap = new Map(overrideMap);

      updatedOverrideMap.delete(address);

      return updatedOverrideMap;
    } else if (overrideMap.get(address) !== selected) {
      return new Map([...overrideMap, [address, selected]]);
    } else {
      return overrideMap;
    }
  });
}

async function switchSessionAccount(
  walletKitService: WalletKitService,
  session: SessionTypes.Struct,
  sessionAddressSet: Set<string>,
  address: string,
  setAddressOverrideMap: Dispatch<SetStateAction<Map<string, boolean>>>,
): Promise<void> {
  await walletKitService.updateSession(
    session,
    Array.from(new Set([address, ...sessionAddressSet])),
  );

  setAddressOverrideMap(overrideMap => {
    if (overrideMap.has(address)) {
      const updatedOverrideMap = new Map(overrideMap);

      updatedOverrideMap.delete(address);

      return updatedOverrideMap;
    } else {
      return overrideMap;
    }
  });

  await walletKitService.switchSessionAccount(session, [address]);

  ToastAndroid.show('Session account changed', ToastAndroid.SHORT);
}
