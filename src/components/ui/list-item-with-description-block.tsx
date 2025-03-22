import type {ReactNode} from 'react';
import {Pressable} from 'react-native';
import type {ListItemProps} from 'react-native-paper';
import {List, Text, useTheme} from 'react-native-paper';

import {copy} from '../../utils/index.js';

export type ListItemWithDescriptionBlockProps = Omit<
  ListItemProps,
  'description'
> & {
  description: string;
  dataToCopy?: string;
};

export function ListItemWithDescriptionBlock({
  description,
  dataToCopy,
  ...props
}: ListItemWithDescriptionBlockProps): ReactNode {
  const theme = useTheme();

  return (
    <List.Item
      {...props}
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
