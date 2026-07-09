import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { usePlayerStore } from '@/store/PlayerStore';
import { useGameStore } from '@/store/GameStore';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { TextPromptModal } from '@/components/TextPromptModal';

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function PlayersScreen() {
  const { theme } = useTheme();
  const { profiles, createProfile, deleteProfile } = usePlayerStore();
  const { games } = useGameStore();
  const [addVisible, setAddVisible] = useState(false);

  const stats = useMemo(() => {
    const map: Record<string, { gamesPlayed: number; totalStrokes: number; bestRound: number | null }> = {};
    for (const profile of profiles) {
      map[profile.id] = { gamesPlayed: 0, totalStrokes: 0, bestRound: null };
    }
    for (const game of games) {
      for (const player of game.players) {
        if (!player.profileId || !map[player.profileId]) continue;
        const scores = game.scores[player.id] ?? [];
        const played = scores.filter((s) => s != null).length;
        if (played === 0) continue;
        const total = scores.reduce<number>((sum, s) => sum + (s ?? 0), 0);
        const s = map[player.profileId];
        s.gamesPlayed += 1;
        s.totalStrokes += total;
        if (s.bestRound === null || total < s.bestRound) s.bestRound = total;
      }
    }
    return map;
  }, [profiles, games]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ title: 'Players' }} />
      <ScrollView contentContainerStyle={styles.content}>
        {profiles.length === 0 ? (
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No players yet</Text>
            <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
              Add players to track stats across games.
            </Text>
          </View>
        ) : (
          profiles.map((profile) => {
            const s = stats[profile.id];
            const avg =
              s.gamesPlayed > 0 ? Math.round((s.totalStrokes / s.gamesPlayed) * 10) / 10 : null;
            return (
              <Card key={profile.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.profileName, { color: theme.text }]}>{profile.name}</Text>
                  <Pressable
                    onPress={() =>
                      Alert.alert(
                        'Remove player?',
                        `"${profile.name}" will be removed. Games already played are unaffected.`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Remove', style: 'destructive', onPress: () => deleteProfile(profile.id) },
                        ]
                      )
                    }
                    hitSlop={8}
                  >
                    <Text style={{ color: theme.danger, fontSize: 14, fontWeight: '600' }}>Remove</Text>
                  </Pressable>
                </View>
                <Text style={[styles.since, { color: theme.textMuted }]}>
                  Since {formatDate(profile.createdAt)}
                </Text>
                {s.gamesPlayed > 0 ? (
                  <View style={styles.statsRow}>
                    <StatChip label="Games" value={String(s.gamesPlayed)} theme={theme} />
                    {avg !== null && <StatChip label="Avg score" value={String(avg)} theme={theme} />}
                    {s.bestRound !== null && (
                      <StatChip label="Best round" value={String(s.bestRound)} theme={theme} />
                    )}
                  </View>
                ) : (
                  <Text style={{ color: theme.textMuted, fontSize: 13, marginTop: 6 }}>
                    No games played yet
                  </Text>
                )}
              </Card>
            );
          })
        )}
        <Button title="+ Add Player" onPress={() => setAddVisible(true)} style={{ marginTop: 16 }} />
      </ScrollView>
      <TextPromptModal
        visible={addVisible}
        title="New Player"
        placeholder="Player name"
        onClose={() => setAddVisible(false)}
        onSubmit={(name) => { createProfile(name); }}
      />
    </View>
  );
}

function StatChip({ label, value, theme }: { label: string; value: string; theme: ReturnType<typeof useTheme>['theme'] }) {
  return (
    <View style={[styles.statChip, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
      <Text style={{ color: theme.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' }}>
        {label}
      </Text>
      <Text style={{ color: theme.text, fontSize: 18, fontWeight: '700' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  emptySubtitle: { fontSize: 14, textAlign: 'center' },
  card: { marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  profileName: { fontSize: 17, fontWeight: '700' },
  since: { fontSize: 12, marginTop: 2, marginBottom: 8 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  statChip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 80,
  },
});
