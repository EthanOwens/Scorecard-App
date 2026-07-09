import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { useGameStore } from '@/store/GameStore';
import { Game, GameStructure } from '@/store/types';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { TextPromptModal } from '@/components/TextPromptModal';
import { IntegerPickerModal } from '@/components/IntegerPickerModal';

function snapshotOf(game: Game): GameStructure {
  return { players: game.players, pars: game.pars, scores: game.scores, numRounds: game.numRounds };
}

export default function EditGameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const { getGame, addPlayer, removePlayer, addRounds, removeRounds, restoreStructure, setPlayerHandicap } =
    useGameStore();
  const game = getGame(id);

  const [addPlayerVisible, setAddPlayerVisible] = useState(false);
  const [editHandicapPlayerId, setEditHandicapPlayerId] = useState<string | null>(null);
  const [past, setPast] = useState<GameStructure[]>([]);
  const [future, setFuture] = useState<GameStructure[]>([]);

  if (!game) {
    return (
      <View style={[styles.notFound, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.textMuted }}>Game not found.</Text>
      </View>
    );
  }

  const recordAndRun = (action: () => void) => {
    setPast((p) => [...p, snapshotOf(game)]);
    setFuture([]);
    action();
  };

  const handleAddPlayer = (playerName: string) => recordAndRun(() => addPlayer(game.id, playerName));
  const handleRemovePlayer = (playerId: string) => recordAndRun(() => removePlayer(game.id, playerId));
  const handleAddRounds = () => recordAndRun(() => addRounds(game.id, game.roundIncrement));
  const handleRemoveRounds = () => recordAndRun(() => removeRounds(game.id, game.roundIncrement));

  const handleUndo = () => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    setPast((p) => p.slice(0, -1));
    setFuture((f) => [snapshotOf(game), ...f]);
    restoreStructure(game.id, previous);
  };

  const handleRedo = () => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((f) => f.slice(1));
    setPast((p) => [...p, snapshotOf(game)]);
    restoreStructure(game.id, next);
  };

  const canRemoveRounds = game.numRounds > game.roundIncrement;
  const canRemovePlayer = game.players.length > 1;
  const editHandicapPlayer = editHandicapPlayerId
    ? game.players.find((p) => p.id === editHandicapPlayerId)
    : undefined;

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: `Edit ${game.name}` }} />

      <View style={styles.undoRow}>
        <Button title="Undo" variant="outline" onPress={handleUndo} disabled={past.length === 0} style={styles.undoBtn} />
        <Button title="Redo" variant="outline" onPress={handleRedo} disabled={future.length === 0} style={styles.undoBtn} />
      </View>

      <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>Players</Text>
      <Card>
        {game.players.map((p, idx) => (
          <View
            key={p.id}
            style={[
              styles.playerRow,
              idx < game.players.length - 1 && { borderBottomColor: theme.border, borderBottomWidth: 1 },
            ]}
          >
            <Text style={[styles.playerName, { color: theme.text }]} numberOfLines={1}>
              {p.name}
            </Text>
            {game.usesPar && (
              <Pressable
                onPress={() => setEditHandicapPlayerId(p.id)}
                hitSlop={8}
                style={[styles.handicapBtn, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
              >
                <Text style={{ color: theme.textMuted, fontSize: 13, fontWeight: '600' }}>
                  HCP {p.handicap ?? '–'}
                </Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => handleRemovePlayer(p.id)}
              disabled={!canRemovePlayer}
              hitSlop={8}
              style={{ opacity: canRemovePlayer ? 1 : 0.3 }}
            >
              <Text style={{ color: theme.danger, fontSize: 14, fontWeight: '600' }}>Remove</Text>
            </Pressable>
          </View>
        ))}
        <Button title="+ Add Player" variant="ghost" onPress={() => setAddPlayerVisible(true)} />
      </Card>

      <Text style={[styles.sectionTitle, { color: theme.textMuted, marginTop: 24 }]}>
        {game.unitLabelPlural}
      </Text>
      <Card>
        <Text style={[styles.roundsCount, { color: theme.text }]}>
          {game.numRounds} {game.unitLabelPlural.toLowerCase()}
        </Text>
        <View style={styles.roundsBtnRow}>
          <Button
            title={`− ${game.roundIncrement}`}
            variant="outline"
            onPress={handleRemoveRounds}
            disabled={!canRemoveRounds}
            style={styles.roundsBtn}
          />
          <Button
            title={`+ ${game.roundIncrement}`}
            variant="outline"
            onPress={handleAddRounds}
            style={styles.roundsBtn}
          />
        </View>
      </Card>

      <TextPromptModal
        visible={addPlayerVisible}
        title="Add Player"
        placeholder="Player name"
        onClose={() => setAddPlayerVisible(false)}
        onSubmit={handleAddPlayer}
      />

      {editHandicapPlayer && (
        <IntegerPickerModal
          visible
          title={`Handicap — ${editHandicapPlayer.name}`}
          initialValue={editHandicapPlayer.handicap ?? 0}
          centerValue={18}
          chipOffsets={[-18, -9, 0, 9, 18]}
          min={0}
          allowClear
          allowTextInput
          onClose={() => setEditHandicapPlayerId(null)}
          onSubmit={(v) => {
            setPlayerHandicap(game.id, editHandicapPlayer.id, v ?? undefined);
            setEditHandicapPlayerId(null);
          }}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  undoRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  undoBtn: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    gap: 10,
  },
  playerName: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  handicapBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  roundsCount: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 14,
  },
  roundsBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  roundsBtn: {
    flex: 1,
  },
});
