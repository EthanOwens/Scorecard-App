import React, { useMemo, useState } from 'react';
import { Alert, Pressable, SectionList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { useGameStore } from '@/store/GameStore';
import { usePlayerStore } from '@/store/PlayerStore';
import { Game } from '@/store/types';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { SegmentedControl } from '@/components/SegmentedControl';
import { ActionSheetMenu, ActionSheetItem } from '@/components/ActionSheetMenu';
import { TextPromptModal } from '@/components/TextPromptModal';

type Tab = 'scorecard' | 'players';
type SortMode = 'date' | 'type';

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function HomeScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { games, deleteGame, toggleFavorite } = useGameStore();
  const { profiles, createProfile, deleteProfile } = usePlayerStore();

  const [tab, setTab] = useState<Tab>('scorecard');
  const [sortMode, setSortMode] = useState<SortMode>('date');
  const [menuGame, setMenuGame] = useState<Game | null>(null);
  const [addPlayerVisible, setAddPlayerVisible] = useState(false);

  // ── Scorecard tab data ──
  const sections = useMemo(() => {
    const sorted = [...games].sort((a, b) => b.updatedAt - a.updatedAt);
    if (sortMode === 'date') {
      return sorted.length ? [{ title: '', data: sorted }] : [];
    }
    const groups = new Map<string, Game[]>();
    for (const g of sorted) {
      const arr = groups.get(g.typeLabel) ?? [];
      arr.push(g);
      groups.set(g.typeLabel, arr);
    }
    return Array.from(groups.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([title, data]) => ({ title, data }));
  }, [games, sortMode]);

  const menuItems: ActionSheetItem[] = menuGame
    ? [
        {
          key: 'favorite',
          label: menuGame.favorite ? 'Remove from Favorites' : 'Add to Favorites',
          onPress: () => toggleFavorite(menuGame.id),
        },
        {
          key: 'delete',
          label: 'Delete Game',
          destructive: true,
          onPress: () =>
            Alert.alert('Delete game?', `"${menuGame.name}" will be permanently deleted.`, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => deleteGame(menuGame.id) },
            ]),
        },
      ]
    : [];

  // ── Players tab data ──
  const playerStats = useMemo(() => {
    const map: Record<string, { gamesPlayed: number; totalStrokes: number; bestRound: number | null }> = {};
    for (const p of profiles) map[p.id] = { gamesPlayed: 0, totalStrokes: 0, bestRound: null };
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
      <Stack.Screen
        options={{
          title: 'Scorecard',
          headerRight: () => (
            <Pressable onPress={() => router.push('/settings')} hitSlop={10}>
              <Text style={{ color: theme.text, fontSize: 20 }}>⚙</Text>
            </Pressable>
          ),
        }}
      />

      {/* Tab bar */}
      <View style={[styles.tabBar, { borderBottomColor: theme.border }]}>
        {(['scorecard', 'players'] as Tab[]).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tabItem, tab === t && { borderBottomColor: theme.accent, borderBottomWidth: 2 }]}
          >
            <Text
              style={[
                styles.tabLabel,
                { color: tab === t ? theme.accent : theme.textMuted },
              ]}
            >
              {t === 'scorecard' ? 'Scorecard' : 'Players'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* ── Scorecard tab ── */}
      {tab === 'scorecard' && (
        <>
          {games.length > 0 && (
            <View style={styles.sortRow}>
              <Text style={[styles.sortLabel, { color: theme.textMuted }]}>Sort by</Text>
              <View style={{ width: 160 }}>
                <SegmentedControl
                  options={[
                    { key: 'date', label: 'Date' },
                    { key: 'type', label: 'Type' },
                  ]}
                  value={sortMode}
                  onChange={setSortMode}
                />
              </View>
            </View>
          )}

          {games.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No games yet</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
                Start a new game to begin keeping score.
              </Text>
            </View>
          ) : (
            <SectionList
              sections={sections}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              renderSectionHeader={({ section }) =>
                section.title ? (
                  <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>{section.title}</Text>
                ) : null
              }
              renderItem={({ item }) => (
                <Pressable onPress={() => router.push(`/game/${item.id}`)}>
                  <Card style={styles.gameCard}>
                    <View style={styles.gameCardMain}>
                      <View style={styles.gameTitleRow}>
                        {item.favorite && <Text style={{ color: theme.accent, marginRight: 4 }}>★</Text>}
                        <Text style={[styles.gameName, { color: theme.text }]} numberOfLines={1}>
                          {item.name}
                        </Text>
                      </View>
                      <Text style={[styles.gameMeta, { color: theme.textMuted }]}>
                        {item.typeLabel} · {formatDate(item.updatedAt)} · {item.players.length}{' '}
                        {item.players.length === 1 ? 'player' : 'players'} · {item.numRounds}{' '}
                        {item.unitLabelPlural.toLowerCase()}
                      </Text>
                    </View>
                    <Pressable onPress={() => setMenuGame(item)} hitSlop={10} style={styles.meatball}>
                      <Text style={[styles.meatballText, { color: theme.textMuted }]}>⋯</Text>
                    </Pressable>
                  </Card>
                </Pressable>
              )}
            />
          )}

          <View style={[styles.footer, { backgroundColor: theme.background }]}>
            <Button title="+ New Game" onPress={() => router.push('/new-game')} />
          </View>

          <ActionSheetMenu
            visible={!!menuGame}
            onClose={() => setMenuGame(null)}
            title={menuGame?.name}
            items={menuItems}
          />
        </>
      )}

      {/* ── Players tab ── */}
      {tab === 'players' && (
        <>
          <ScrollView contentContainerStyle={styles.listContent}>
            {profiles.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No players yet</Text>
                <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
                  Add players to track stats across games.
                </Text>
              </View>
            ) : (
              profiles.map((profile) => {
                const s = playerStats[profile.id];
                const avg =
                  s.gamesPlayed > 0
                    ? Math.round((s.totalStrokes / s.gamesPlayed) * 10) / 10
                    : null;
                return (
                  <Card key={profile.id} style={{ marginBottom: 12 }}>
                    <View style={styles.playerCardHeader}>
                      <Text style={[styles.playerName, { color: theme.text }]}>{profile.name}</Text>
                      <Pressable
                        onPress={() =>
                          Alert.alert(
                            'Remove player?',
                            `"${profile.name}" will be removed. Past games are unaffected.`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Remove',
                                style: 'destructive',
                                onPress: () => deleteProfile(profile.id),
                              },
                            ]
                          )
                        }
                        hitSlop={8}
                      >
                        <Text style={{ color: theme.danger, fontSize: 14, fontWeight: '600' }}>
                          Remove
                        </Text>
                      </Pressable>
                    </View>
                    <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 8 }}>
                      Since {formatDate(profile.createdAt)}
                    </Text>
                    {s.gamesPlayed > 0 ? (
                      <View style={styles.statsRow}>
                        <StatChip label="Games" value={String(s.gamesPlayed)} theme={theme} />
                        {avg !== null && <StatChip label="Avg" value={String(avg)} theme={theme} />}
                        {s.bestRound !== null && (
                          <StatChip label="Best" value={String(s.bestRound)} theme={theme} />
                        )}
                      </View>
                    ) : (
                      <Text style={{ color: theme.textMuted, fontSize: 13 }}>No games played yet</Text>
                    )}
                  </Card>
                );
              })
            )}
            <Button
              title="+ Add Player"
              onPress={() => setAddPlayerVisible(true)}
              style={{ marginTop: 8 }}
            />
          </ScrollView>

          <TextPromptModal
            visible={addPlayerVisible}
            title="New Player"
            placeholder="Player name"
            onClose={() => setAddPlayerVisible(false)}
            onSubmit={(name) => { createProfile(name); }}
          />
        </>
      )}
    </View>
  );
}

function StatChip({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  return (
    <View style={[styles.statChip, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
      <Text style={{ color: theme.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>
        {label}
      </Text>
      <Text style={{ color: theme.text, fontSize: 17, fontWeight: '700' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  sortLabel: { fontSize: 13, fontWeight: '500' },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  emptySubtitle: { fontSize: 14, textAlign: 'center' },
  listContent: { padding: 16, paddingBottom: 8 },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 4,
  },
  gameCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  gameCardMain: { flex: 1 },
  gameTitleRow: { flexDirection: 'row', alignItems: 'center' },
  gameName: { fontSize: 16, fontWeight: '700' },
  gameMeta: { fontSize: 13, marginTop: 4 },
  meatball: { paddingHorizontal: 8, paddingVertical: 8 },
  meatballText: { fontSize: 22, fontWeight: '700' },
  footer: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  playerCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playerName: { fontSize: 17, fontWeight: '700' },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  statChip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 72,
  },
});
