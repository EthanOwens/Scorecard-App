import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';

interface IntegerPickerModalProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  initialValue: number;
  centerValue: number;
  chipOffsets?: number[];
  min?: number;
  formatValue?: (v: number) => string;
  allowClear?: boolean;
  allowTextInput?: boolean;
  onClose: () => void;
  onSubmit: (value: number | null) => void;
}

const DEFAULT_OFFSETS = [-2, -1, 0, 1, 2, 3];

export function IntegerPickerModal({
  visible,
  title,
  subtitle,
  initialValue,
  centerValue,
  chipOffsets = DEFAULT_OFFSETS,
  min,
  formatValue = (v) => String(v),
  allowClear,
  allowTextInput,
  onClose,
  onSubmit,
}: IntegerPickerModalProps) {
  const { theme } = useTheme();
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  const clamp = (v: number) => (min != null ? Math.max(min, v) : v);

  const commit = (v: number | null) => {
    onSubmit(v);
    onClose();
  };

  const chips = chipOffsets
    .map((offset) => centerValue + offset)
    .filter((v) => min == null || v >= min);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: theme.textMuted }]}>{subtitle}</Text> : null}

      <View style={styles.stepperRow}>
        <Button title="–" variant="outline" onPress={() => setValue((v) => clamp(v - 1))} style={styles.stepperBtn} />
        {allowTextInput ? (
          <TextInput
            style={[styles.valueInput, { color: theme.text, borderColor: theme.border }]}
            keyboardType="number-pad"
            value={String(value)}
            onChangeText={(t) => {
              const n = parseInt(t.replace(/[^0-9-]/g, ''), 10);
              setValue(clamp(Number.isNaN(n) ? 0 : n));
            }}
          />
        ) : (
          <Text style={[styles.value, { color: theme.text }]}>{formatValue(value)}</Text>
        )}
        <Button title="+" variant="outline" onPress={() => setValue((v) => clamp(v + 1))} style={styles.stepperBtn} />
      </View>

      <View style={styles.chipRow}>
        {chips.map((c) => (
          <Button key={c} title={formatValue(c)} variant="ghost" onPress={() => commit(c)} style={styles.chip} />
        ))}
      </View>

      <View style={styles.actionsRow}>
        {allowClear ? (
          <Button title="Clear" variant="danger" onPress={() => commit(null)} style={styles.actionBtn} />
        ) : (
          <Button title="Cancel" variant="ghost" onPress={onClose} style={styles.actionBtn} />
        )}
        <Button title="Done" variant="solid" onPress={() => commit(value)} style={styles.actionBtn} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
    marginBottom: 8,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
    gap: 20,
  },
  stepperBtn: {
    width: 48,
    paddingHorizontal: 0,
  },
  value: {
    fontSize: 40,
    fontWeight: '700',
    minWidth: 80,
    textAlign: 'center',
  },
  valueInput: {
    fontSize: 32,
    fontWeight: '700',
    minWidth: 90,
    textAlign: 'center',
    borderBottomWidth: 1.5,
    paddingVertical: 2,
  },
  chipRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
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
