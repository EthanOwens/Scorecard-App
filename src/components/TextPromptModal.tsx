import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';

interface TextPromptModalProps {
  visible: boolean;
  title: string;
  placeholder?: string;
  submitLabel?: string;
  onClose: () => void;
  onSubmit: (value: string) => void;
}

export function TextPromptModal({
  visible,
  title,
  placeholder,
  submitLabel = 'Add',
  onClose,
  onSubmit,
}: TextPromptModalProps) {
  const { theme } = useTheme();
  const [text, setText] = useState('');

  useEffect(() => {
    if (visible) setText('');
  }, [visible]);

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      <TextInput
        style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
        placeholder={placeholder}
        placeholderTextColor={theme.textMuted}
        value={text}
        onChangeText={setText}
        autoFocus
        onSubmitEditing={submit}
      />
      <View style={styles.actionsRow}>
        <Button title="Cancel" variant="ghost" onPress={onClose} style={styles.actionBtn} />
        <Button title={submitLabel} variant="solid" onPress={submit} style={styles.actionBtn} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  actionBtn: {
    flex: 1,
  },
});
