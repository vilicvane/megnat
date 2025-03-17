import type {ReactNode} from 'react';
import {View} from 'react-native';
import {List, Text, useTheme} from 'react-native-paper';

export type ListItemWithDescriptionBlockProps = {
  title: string;
  description: string;
};

export function ListItemWithDescriptionBlock({
  title,
  description,
}: ListItemWithDescriptionBlockProps): ReactNode {
  const theme = useTheme();

  return (
    <List.Item
      title={title}
      description={
        <View
          style={{
            padding: 8,
            width: '100%',
            backgroundColor: theme.colors.elevation.level1,
            borderRadius: 4,
          }}
        >
          <Text>{description}</Text>
        </View>
      }
      descriptionStyle={{
        paddingTop: 8,
      }}
    />
  );
}
