import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';

interface IntegerPickerModalProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  initialValue: number | null;
  centerValue: number;
  chipOffsets?: number[];
  min?: number;
  formatValue?: (v: number) => string;
  allowClear?: boolean;
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
  onClose,
  onSubmit,
}: IntegerPickerModalProps) {
  const { theme } = useTheme();
  const [value, setValue] = useState<number | null>(initialValue);
  const [typing, setTyping] = useState(false);
  const [rawText, setRawText] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setValue(initialValue);
      setTyping(false);
      setRawText('');
    }
  }, [visible, initialValue]);

  useEffect(() => {
    if (typing) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [typing]);

  const clamp = (v: number) => (min != null ? Math.max(min, v) : v);

  const commit = (v: number | null) => {
    onSubmit(v);
    onClose();
  };

  const stepUp = () => {
    setTyping(false);
    setValue((v) => clamp((v ?? centerValue) + 1));
  };

  const stepDown = () => {
    setTyping(false);
    setValue((v) => clamp((v ?? centerValue) - 1));
  };

  const openKeyboard = () => {
    setRawText(value != null ? String(value) : '');
    setTyping(true);
  };

  const handleTextChange = (t: string) => {
    const cleaned = t.replace(/[^0-9-]/g, '');
    setRawText(cleaned);
    const n = parseInt(cleaned, 10);
    if (!Number.isNaN(n)) setValue(clamp(n));
  };

  const chips = chipOffsets
    .map((offset) => centerValue + offset)
    .filter((v) => min == null || v >= min);

  // Use a more permissive keyboard when negative values are allowed
  const keyboardType = min != null && min < 0 ? 'numbers-and-punctuation' : 'number-pad';

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: theme.textMuted }]}>{subtitle}</Text> : null}

      <View style={styles.stepperRow}>
        <Button title="–" variant="outline" onPress={stepDown} style={styles.stepperBtn} />

        {typing ? (
          <TextInput
            ref={inputRef}
            style={[styles.valueInput, { color: theme.text, borderColor: theme.accent }]}
            keyboardType={keyboardType}
            value={rawText}
            onChangeText={handleTextChange}
            onBlur={() => setTyping(false)}
            selectTextOnFocus
          />
        ) : (
          <Pressable onPress={openKeyboard} style={styles.valueDisplay} hitSlop={8}>
            <Text style={[styles.value, { color: value == null ? theme.textMuted : theme.text }]}>
              {value == null ? '–' : formatValue(value)}
            </Text>
          </Pressable>
        )}

        <Button title="+" variant="outline" onPress={stepUp} style={styles.stepperBtn} />
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
  valueDisplay: {
    minWidth: 80,
    alignItems: 'center',
  },
  value: {
    fontSize: 40,
    fontWeight: '700',
    textAlign: 'center',
  },
  valueInput: {
    fontSize: 32,
    fontWeight: '700',
    minWidth: 90,
    textAlign: 'center',
    borderBottomWidth: 2,
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
