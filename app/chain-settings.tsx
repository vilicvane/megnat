import {router} from 'expo-router';
import {type ReactNode, useState} from 'react';
import {ScrollView, View} from 'react-native';
import {Appbar, Button, List} from 'react-native-paper';

import {AsyncIconButton, EditableTextInput} from '../components/ui/index.js';
import type {CustomChain} from '../core/index.js';
import {useEntrances} from '../entrances.js';
import {useChainDisplayName, useCustomChains} from '../services/index.js';
import {useTheme} from '../theme.js';

const INFURA_KEY_PATTERN = /^(?:|[\da-f]{32})$/;

export default function ChainSettingsScreen(): ReactNode {
  const {chainService} = useEntrances();

  const customChains = useCustomChains(chainService);

  const [infuraKey] = useState(() => chainService.getInfuraKey() ?? '');

  const [infuraKeyInputActive, setInfuraKeyInputActive] = useState(false);

  const keyInputActive = infuraKeyInputActive;

  return (
    <>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Chain settings" />
      </Appbar.Header>
      <ScrollView contentContainerStyle={{flexGrow: 1}}>
        <List.Section title="Provider keys">
          <View style={{margin: 16, marginTop: 0}}>
            <EditableTextInput
              mode="outlined"
              label="Infura key"
              initialValue={infuraKey}
              pattern={INFURA_KEY_PATTERN}
              onFocus={() => setInfuraKeyInputActive(true)}
              onBlur={() => setInfuraKeyInputActive(false)}
              handler={key => chainService.setInfuraKey(key)}
            />
          </View>
        </List.Section>
        {customChains.length > 0 && (
          <List.Section title="Custom chains">
            {customChains.map(chain => (
              <ChainItem key={chain.id} chain={chain} />
            ))}
          </List.Section>
        )}
      </ScrollView>
      {!keyInputActive && (
        <View style={{margin: 16}}>
          <Button
            mode="contained"
            onPress={() => router.push('/edit-custom-chain')}
          >
            Add custom chain
          </Button>
        </View>
      )}
    </>
  );
}

function ChainItem({chain}: {chain: CustomChain}): ReactNode {
  const theme = useTheme();

  const {chainService} = useEntrances();
  const name = useChainDisplayName(chainService, chain.id) ?? 'Unknown';

  return (
    <List.Item
      left={({style}) => (
        <List.Icon icon="web" color={theme.colors.listIcon} style={style} />
      )}
      title={name}
      description={chain.id}
      onPress={() =>
        router.push({
          pathname: '/edit-custom-chain',
          params: {id: chain.id},
        })
      }
      right={({style}) => (
        <AsyncIconButton
          icon="close"
          style={{...style, marginRight: -16}}
          handler={() => chainService.removeCustomChain(chain.id)}
        />
      )}
    />
  );
}
