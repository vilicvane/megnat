import type {ReactNode} from 'react';
import {Pressable} from 'react-native';
import {List, Text, useTheme} from 'react-native-paper';

import {copy} from '../../utils/index.js';

export type ListItemWithDescriptionBlockProps = {
  title: string;
  description: string;
  dataToCopy?: string;
};

export function ListItemWithDescriptionBlock({
  title,
  description,
  dataToCopy,
}: ListItemWithDescriptionBlockProps): ReactNode {
  const theme = useTheme();

  return (
    <List.Item
      title={title}
      description={
        <Pressable
          style={{
            padding: 8,
            width: '100%',
            backgroundColor: theme.colors.elevation.level1,
            borderRadius: 4,
          }}
          onPress={() => {
            if (dataToCopy) {
              void copy(dataToCopy);
            }
          }}
        >
          <Text>{description}</Text>
        </Pressable>
      }
      descriptionStyle={{
        paddingTop: 8,
      }}
    />
  );
}
