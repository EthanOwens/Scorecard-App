import React, { useMemo, useState } from 'react';
import { Alert, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeContext';
import { useGameStore } from '@/store/GameStore';
import { Game } from '@/store/types';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { SegmentedControl } from '@/components/SegmentedControl';
import { ActionSheetMenu, ActionSheetItem } from '@/components/ActionSheetMenu';

type SortMode = 'date' | 'type';

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function HistoryScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { games, deleteGame, toggleFavorite } = useGameStore();
  const [sortMode, setSortMode] = useState<SortMode>('date');
  const [menuGame, setMenuGame] = useState<Game | null>(null);

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

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Pressable onPress={() => router.push('/players' as any)} hitSlop={10}>
              <Text style={{ color: theme.accent, fontSize: 15, fontWeight: '600' }}>Players</Text>
            </Pressable>
          ),
          headerRight: () => (
            <Pressable onPress={() => router.push('/settings')} hitSlop={10}>
              <Text style={{ color: theme.text, fontSize: 20 }}>⚙</Text>
            </Pressable>
          ),
        }}
      />

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
                <Pressable
                  onPress={() => setMenuGame(item)}
                  hitSlop={10}
                  style={styles.meatball}
                >
                  <Text style={[styles.meatballText, { color: theme.textMuted }]}>⋯</Text>
                </Pressable>
              </Card>
            </Pressable>
          )}
        />
      )}

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12, backgroundColor: theme.background }]}>
        <Button title="+ New Game" onPress={() => router.push('/new-game')} />
      </View>

      <ActionSheetMenu
        visible={!!menuGame}
        onClose={() => setMenuGame(null)}
        title={menuGame?.name}
        items={menuItems}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  sortLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 8,
    gap: 10,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 4,
  },
  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  gameCardMain: {
    flex: 1,
  },
  gameTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gameName: {
    fontSize: 16,
    fontWeight: '700',
  },
  gameMeta: {
    fontSize: 13,
    marginTop: 4,
  },
  meatball: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  meatballText: {
    fontSize: 22,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
});
