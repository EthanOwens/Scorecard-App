import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme, ThemeMode } from '@/theme/ThemeContext';
import { ACCENT_COLORS } from '@/theme/colors';
import { SegmentedControl } from '@/components/SegmentedControl';
import { ColorSwatch } from '@/components/ColorSwatch';
import { Card } from '@/components/Card';

export default function SettingsScreen() {
  const { theme, mode, setMode, accentKey, setAccentKey } = useTheme();

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>Theme</Text>
      <Card>
        <SegmentedControl<ThemeMode>
          options={[
            { key: 'light', label: 'Light' },
            { key: 'dark', label: 'Dark' },
            { key: 'system', label: 'System' },
          ]}
          value={mode}
          onChange={setMode}
        />
      </Card>

      <Text style={[styles.sectionTitle, { color: theme.textMuted, marginTop: 24 }]}>Accent Color</Text>
      <Card>
        <View style={styles.swatchRow}>
          {ACCENT_COLORS.map((c) => (
            <ColorSwatch
              key={c.key}
              color={c.value}
              selected={c.key === accentKey}
              onPress={() => setAccentKey(c.key)}
            />
          ))}
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
});
