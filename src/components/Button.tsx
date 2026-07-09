import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';

type Variant = 'solid' | 'outline' | 'ghost' | 'danger';

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ title, onPress, variant = 'solid', disabled, loading, style }: ButtonProps) {
  const { theme } = useTheme();

  const palette: Record<Variant, { bg: string; border: string; text: string }> = {
    solid: { bg: theme.accent, border: theme.accent, text: theme.accentText },
    outline: { bg: 'transparent', border: theme.accent, text: theme.accent },
    ghost: { bg: 'transparent', border: 'transparent', text: theme.text },
    danger: { bg: theme.dangerSoft, border: theme.danger, text: theme.danger },
  };
  const colors = palette[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
          opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <Text style={[styles.text, { color: colors.text }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
  },
});
