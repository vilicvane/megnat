import {router, useLocalSearchParams} from 'expo-router';
import {type ReactNode, useMemo, useState} from 'react';
import {ScrollView, View} from 'react-native';
import {Appbar, List, TextInput} from 'react-native-paper';

import {AsyncButton} from '../components/ui/index.js';
import {CHAIN_LIST_INFURA_KEY_TEMPLATE} from '../constants/index.js';
import {useEntrances} from '../entrances.js';
import type {ChainService} from '../services/index.js';
import {useTheme} from '../theme.js';
import {eip155ChainIdToString} from '../utils/index.js';
const RPC_PROTOCOL_PATTERN = /^https?:$/;

export default function EditCustomChainScreen(): ReactNode {
  const theme = useTheme();

  const {editingChainId, addingChainId} = useLocalSearchParams<{
    editingChainId?: string;
    addingChainId?: string;
  }>();

  const {chainService} = useEntrances();

  const [chain] = useState(() => {
    if (!editingChainId) {
      return undefined;
    }

    return chainService.getCustomChain(editingChainId);
  });

  const [name, setName] = useState(chain?.name ?? '');
  const [rpcURL, setRpcURL] = useState(chain?.rpc ?? '');
  const [chainId, setChainId] = useState(chain?.id ?? addingChainId ?? '');

  const rpcURLValid = useMemo(() => {
    try {
      return RPC_PROTOCOL_PATTERN.test(new URL(rpcURL).protocol);
    } catch {
      return false;
    }
  }, [rpcURL]);

  const chainIdValid = useMemo(
    () => /^\s*(?:eip155:)?[1-9]\d*\s*$/.test(chainId),
    [chainId],
  );

  let eip155ChainId: string | undefined;

  if (chainIdValid) {
    if (chainId.includes(':')) {
      eip155ChainId = chainId;
    } else {
      eip155ChainId = eip155ChainIdToString(BigInt(chainId));
    }
  }

  const valid = rpcURLValid && chainIdValid;

  const listedRpcURLs = eip155ChainId
    ? chainService.getChainListedRPC(eip155ChainId)
    : [];

  return (
    <>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content
          title={chain ? 'Edit custom chain' : 'Add custom chain'}
        />
      </Appbar.Header>
      <ScrollView contentContainerStyle={{flexGrow: 1}}>
        <View style={{margin: 16, gap: 16}}>
          <TextInput
            mode="outlined"
            label="Chain ID"
            value={chainId}
            error={chainId !== '' && !chainIdValid}
            onChangeText={setChainId}
          />
          <TextInput
            mode="outlined"
            label="Name"
            placeholder={
              (eip155ChainId &&
                chainService.getChainDisplayName(eip155ChainId)) ||
              'Optional'
            }
            value={name}
            onChangeText={setName}
          />
          <TextInput
            mode="outlined"
            label="RPC URL"
            value={rpcURL}
            error={rpcURL !== '' && !rpcURLValid}
            onChangeText={setRpcURL}
          />
        </View>
        {listedRpcURLs.length > 0 && (
          <List.Accordion
            left={({style}) => (
              <List.Icon
                icon="web"
                color={theme.colors.listIcon}
                style={style}
              />
            )}
            title="Listed RPC URLs"
          >
            {listedRpcURLs.map(url => (
              <List.Item
                key={url}
                title={url}
                onPress={() => {
                  if (url.includes(CHAIN_LIST_INFURA_KEY_TEMPLATE)) {
                    router.replace('/chain-settings');
                    return;
                  }

                  setRpcURL(url);
                }}
              />
            ))}
          </List.Accordion>
        )}
      </ScrollView>
      <View style={{margin: 16}}>
        <AsyncButton
          mode="contained"
          disabled={!valid}
          buttonColor={theme.colors.primaryContainer}
          handler={() =>
            save(chainService, {id: eip155ChainId!, name, rpc: rpcURL})
          }
        >
          Save
        </AsyncButton>
      </View>
    </>
  );
}

async function save(
  chainService: ChainService,
  {id, name, rpc}: {id: string; name: string; rpc: string},
): Promise<void> {
  const chain = {
    id,
    name: name || undefined,
    rpc,
  };

  await chainService.addCustomChain(chain);

  router.back();
}
