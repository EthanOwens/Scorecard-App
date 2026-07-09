import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { BottomSheet } from './BottomSheet';

export interface ActionSheetItem {
  key: string;
  label: string;
  destructive?: boolean;
  onPress: () => void;
}

interface ActionSheetMenuProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  items: ActionSheetItem[];
}

export function ActionSheetMenu({ visible, onClose, title, items }: ActionSheetMenuProps) {
  const { theme } = useTheme();

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      {title ? (
        <Text style={[styles.title, { color: theme.textMuted }]} numberOfLines={1}>
          {title}
        </Text>
      ) : null}
      {items.map((item, idx) => (
        <Pressable
          key={item.key}
          onPress={() => {
            onClose();
            item.onPress();
          }}
          style={({ pressed }) => [
            styles.row,
            idx < items.length - 1 && { borderBottomColor: theme.border, borderBottomWidth: 1 },
            pressed && { backgroundColor: theme.surfaceAlt },
          ]}
        >
          <Text style={[styles.label, { color: item.destructive ? theme.danger : theme.text }]}>
            {item.label}
          </Text>
        </Pressable>
      ))}
      <View style={{ height: 4 }} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 13,
    fontWeight: '600',
    paddingVertical: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    paddingVertical: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
  },
});
