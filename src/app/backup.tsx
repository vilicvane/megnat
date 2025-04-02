import {router, useLocalSearchParams} from 'expo-router';
import {type ReactNode, useEffect, useState} from 'react';
import type {StyleProp, ViewStyle} from 'react-native';
import {Alert, ScrollView, View} from 'react-native';
import {Appbar, Button, Icon, List, TextInput} from 'react-native-paper';

import {AsyncButton} from '../components/ui/index.js';
import {useEntrances} from '../entrances.js';
import {type TangemCardResponse, tangem} from '../tangem.js';
import {useTheme} from '../theme.js';

export default function BackupScreen(): ReactNode {
  const {cardId} = useLocalSearchParams<{cardId: string}>();

  useEffect(() => {
    if (!cardId) {
      router.back();
      return undefined;
    }
  }, [cardId]);

  const [state, setState] = useState<StepState>(() => {
    return {
      step: 'add-cards',
      primaryCardScanned: false,
      backupCards: [],
    };
  });

  if (!cardId) {
    return null;
  }

  return (
    <>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Backup" />
      </Appbar.Header>
      <ScrollView contentContainerStyle={{flexGrow: 1}}>
        <StepAddCards cardId={cardId} state={state} onStateChange={setState} />
        <StepSetAccessCode state={state} onStateChange={setState} />
        <StepFinalize state={state} />
      </ScrollView>
    </>
  );
}

type StepState = StepAddCardsState | StepSetAccessCodeState | StepFinalizeState;

type StepAddCardsState = {
  step: 'add-cards';
  primaryCardScanned: boolean;
  backupCards: TangemCardResponse[];
};

type StepSetAccessCodeState = {
  step: 'set-access-code';
  backupCards: TangemCardResponse[];
};

type StepFinalizeState = {
  step: 'finalize';
  backupCards: TangemCardResponse[];
};

const BACKUP_CARD_LIMIT = 2;

function StepAddCards({
  cardId,
  state,
  onStateChange,
}: {
  cardId: string;
  state: StepState;
  onStateChange: (state: StepState) => void;
}): ReactNode {
  const theme = useTheme();

  const cardsCount =
    (state.step === 'add-cards' && !state.primaryCardScanned ? 0 : 1) +
    state.backupCards.length;

  const title = `Add cards${cardsCount > 0 ? ` (${cardsCount})` : ''}`;

  switch (state.step) {
    case 'add-cards':
      break;
    case 'set-access-code':
    case 'finalize':
      return <Step status="done" title={title} />;
  }

  return (
    <Step status="active" title={title}>
      <AsyncButton
        mode="contained"
        buttonColor={theme.colors.primaryContainer}
        disabled={state.primaryCardScanned}
        handler={() =>
          tangem.readPrimaryCardToBackup({cardId}).then(() =>
            onStateChange({
              ...state,
              primaryCardScanned: true,
            }),
          )
        }
      >
        Scan primary card
      </AsyncButton>
      <AsyncButton
        mode="contained"
        buttonColor={theme.colors.primaryContainer}
        disabled={!state.primaryCardScanned}
        handler={() =>
          tangem.addBackupCard().then(backupCard => {
            const backupCards = [...state.backupCards, backupCard];

            if (backupCards.length >= BACKUP_CARD_LIMIT) {
              onStateChange({
                step: 'set-access-code',
                backupCards,
              });
            } else {
              onStateChange({
                ...state,
                backupCards,
              });
            }
          })
        }
      >
        {state.backupCards.length > 0
          ? 'Add another backup card'
          : 'Add backup card'}
      </AsyncButton>
      {state.backupCards.length > 0 && (
        <Button
          mode="contained"
          buttonColor={theme.colors.secondaryContainer}
          onPress={() =>
            onStateChange({
              step: 'set-access-code',
              backupCards: state.backupCards,
            })
          }
        >
          Continue
        </Button>
      )}
    </Step>
  );
}

function StepSetAccessCode({
  state,
  onStateChange,
}: {
  state: StepState;
  onStateChange: (state: StepState) => void;
}): ReactNode {
  const theme = useTheme();

  const [accessCodeFocused, setAccessCodeFocused] = useState<boolean>();
  const [confirmAccessCodeFocused, setConfirmAccessCodeFocused] =
    useState<boolean>();

  const [accessCode, setAccessCode] = useState('');
  const [confirmAccessCode, setConfirmAccessCode] = useState('');

  const title = 'Set access code';

  switch (state.step) {
    case 'add-cards':
      return <Step status="pending" title={title} />;
    case 'set-access-code':
      break;
    case 'finalize':
      return <Step status="done" title={title} />;
  }

  const accessCodeValid = accessCode.length >= 4;
  const confirmAccessCodeValid = confirmAccessCode === accessCode;

  const valid = accessCodeValid && confirmAccessCodeValid;

  return (
    <Step status="active" title="Set access code" style={{gap: 8}}>
      <TextInput
        mode="outlined"
        secureTextEntry
        label="Access code"
        value={accessCode}
        onFocus={() => setAccessCodeFocused(true)}
        onBlur={() => setAccessCodeFocused(false)}
        onChangeText={setAccessCode}
        error={
          accessCodeFocused === false &&
          accessCode.length > 0 &&
          !accessCodeValid
        }
      />
      <TextInput
        mode="outlined"
        secureTextEntry
        label="Confirm access code"
        value={confirmAccessCode}
        onFocus={() => setConfirmAccessCodeFocused(true)}
        onBlur={() => setConfirmAccessCodeFocused(false)}
        onChangeText={setConfirmAccessCode}
        error={
          confirmAccessCodeFocused === false &&
          confirmAccessCode.length > 0 &&
          !confirmAccessCodeValid
        }
      />
      <AsyncButton
        mode="contained"
        style={{marginTop: 8}}
        buttonColor={theme.colors.primaryContainer}
        disabled={!valid}
        handler={() =>
          tangem.setAccessCodeForBackup({accessCode}).then(() =>
            onStateChange({
              step: 'finalize',
              backupCards: state.backupCards,
            }),
          )
        }
      >
        Continue
      </AsyncButton>
    </Step>
  );
}

function StepFinalize({state}: {state: StepState}): ReactNode {
  const theme = useTheme();

  const {
    uiService: {
      state: {card},
    },
  } = useEntrances();

  const [finalized, setFinalized] = useState(0);
  const cardsCount = state.backupCards.length + 1;

  useEffect(() => {
    if (finalized < cardsCount) {
      return;
    }

    Alert.alert(
      'Backup completed',
      `The ${cardsCount}-card set is now ready to use.`,
    );

    router.back();
  }, [finalized, cardsCount]);

  const title = `Finalize backup${state.step === 'finalize' ? ` (${finalized}/${cardsCount})` : ''}`;

  switch (state.step) {
    case 'add-cards':
      return <Step status="pending" title={title} />;
    case 'set-access-code':
      return <Step status="pending" title={title} />;
    case 'finalize':
      break;
  }

  return (
    <Step status="active" title={title}>
      <AsyncButton
        mode="contained"
        buttonColor={theme.colors.primaryContainer}
        disabled={finalized === cardsCount}
        handler={() =>
          tangem.proceedBackup().then(() =>
            setFinalized(finalized => {
              if (finalized === 0 && card) {
                card.backupStatus = {
                  status: 'active',
                  cardsCount: state.backupCards.length.toString(),
                };
              }

              return finalized + 1;
            }),
          )
        }
      >
        {finalized === 0
          ? 'Finalize primary card'
          : finalized === 1
            ? 'Finalize backup card'
            : 'Finalize next backup card'}
      </AsyncButton>
    </Step>
  );
}

function Step({
  status,
  title,
  style,
  children,
}: {
  status: 'pending' | 'active' | 'done';
  title: string;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}): ReactNode {
  const theme = useTheme();

  const {icon, iconColor} = (() => {
    switch (status) {
      case 'pending':
        return {
          icon: 'clock-outline',
          iconColor: theme.colors.onSurfaceVariant,
        };
      case 'active':
        return {
          icon: 'dots-horizontal',
          iconColor: theme.colors.primary,
        };
      case 'done':
        return {
          icon: 'check',
          iconColor: theme.colors.onPrimaryContainer,
        };
    }
  })();

  const expanded = status === 'active';

  return (
    <List.Accordion
      left={({style}) => (
        <View style={style}>
          <Icon source={icon} size={24} color={iconColor} />
        </View>
      )}
      title={title}
      titleStyle={{
        color: expanded
          ? theme.colors.onPrimaryContainer
          : theme.colors.onSurfaceVariant,
      }}
      expanded={expanded}
      right={() => null}
    >
      <View
        style={[
          {
            paddingLeft: 48,
            paddingRight: 16,
            paddingBottom: 8,
            gap: 10,
          },
          style,
        ]}
      >
        {children}
      </View>
    </List.Accordion>
  );
}
