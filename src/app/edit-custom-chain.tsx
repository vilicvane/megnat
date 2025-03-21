import {router, useLocalSearchParams} from 'expo-router';
import {type ReactNode, useMemo, useState} from 'react';
import {ScrollView, View} from 'react-native';
import {Appbar, TextInput} from 'react-native-paper';

import {AsyncButton} from '../components/ui/index.js';
import {useEntrances} from '../entrances.js';
import type {ChainService} from '../services/index.js';
import {useTheme} from '../theme.js';
import {eip155ChainIdToString} from '../utils/index.js';
const RPC_PROTOCOL_PATTERN = /^https?:$/;

export default function EditCustomChainScreen(): ReactNode {
  const theme = useTheme();

  const {id} = useLocalSearchParams<{id?: string}>();

  const {chainService} = useEntrances();

  const [chain] = useState(() => {
    if (!id) {
      return undefined;
    }

    return chainService.getCustomChain(id);
  });

  const [name, setName] = useState(chain?.name ?? '');
  const [rpcURL, setRpcURL] = useState(chain?.rpc ?? '');
  const [chainId, setChainId] = useState(chain?.id ?? '');

  const rpcURLValid = useMemo(() => {
    try {
      return RPC_PROTOCOL_PATTERN.test(new URL(rpcURL.trim()).protocol);
    } catch {
      return false;
    }
  }, [rpcURL]);

  const chainIdValid = useMemo(
    () => /^\s*(?:eip155:)?[1-9]\d*\s*$/.test(chainId),
    [chainId],
  );

  const valid = rpcURLValid && chainIdValid;

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
            label="Name"
            placeholder="Optional"
            value={name}
            onChangeText={setName}
          />
          <TextInput
            mode="outlined"
            label="Chain ID"
            value={chainId}
            error={chainId !== '' && !chainIdValid}
            onChangeText={setChainId}
          />
          <TextInput
            mode="outlined"
            label="RPC URL"
            value={rpcURL}
            error={rpcURL !== '' && !rpcURLValid}
            onChangeText={setRpcURL}
          />
        </View>
      </ScrollView>
      <View style={{margin: 16}}>
        <AsyncButton
          mode="contained"
          disabled={!valid}
          buttonColor={theme.colors.primaryContainer}
          handler={() => save(chainService, {id: chainId, name, rpc: rpcURL})}
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
  id = id.trim();

  if (!id.includes(':')) {
    id = eip155ChainIdToString(BigInt(id));
  }

  name = name.trim();
  rpc = rpc.trim();

  const chain = {
    id,
    name: name || undefined,
    rpc,
  };

  await chainService.addCustomChain(chain);

  router.back();
}
