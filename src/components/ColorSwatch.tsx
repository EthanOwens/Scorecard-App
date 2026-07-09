import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';

interface ColorSwatchProps {
  color: string;
  selected: boolean;
  onPress: () => void;
}

export function ColorSwatch({ color, selected, onPress }: ColorSwatchProps) {
  const { theme } = useTheme();
  return (
    <Pressable onPress={onPress} style={styles.touchTarget}>
      <View
        style={[
          styles.ring,
          { borderColor: selected ? color : 'transparent', backgroundColor: theme.surface },
        ]}
      >
        <View style={[styles.swatch, { backgroundColor: color }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touchTarget: {
    padding: 4,
  },
  ring: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
});
