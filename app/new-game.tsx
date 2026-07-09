import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { useGameStore } from '@/store/GameStore';
import { useCourseStore } from '@/store/CourseStore';
import { usePlayerStore } from '@/store/PlayerStore';
import { GAME_TYPES, getGameType } from '@/store/gameTypes';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { SegmentedControl } from '@/components/SegmentedControl';

type PlayerDraft = { name: string; handicap: string; profileId?: string };

function adjustPars(pars: (number | null)[], numRounds: number): (number | null)[] {
  if (pars.length === numRounds) return [...pars];
  if (pars.length > numRounds) return pars.slice(0, numRounds);
  return [...pars, ...new Array(numRounds - pars.length).fill(null)];
}

const BLANK_PLAYER: PlayerDraft = { name: '', handicap: '' };

export default function NewGameScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { createGame } = useGameStore();
  const { courses, findCourseByName } = useCourseStore();
  const { profiles } = usePlayerStore();

  const [typeId, setTypeId] = useState<string>('golf');
  const [usesPar, setUsesPar] = useState(false);
  const [numRounds, setNumRounds] = useState(18);
  const [players, setPlayers] = useState<PlayerDraft[]>([{ ...BLANK_PLAYER }, { ...BLANK_PLAYER }]);
  const [name, setName] = useState('');
  const [courseName, setCourseName] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  const preset = useMemo(() => getGameType(typeId), [typeId]);
  const effectiveUsesPar = preset.parConfigurable ? usesPar : preset.usesPar;

  useEffect(() => {
    if (!effectiveUsesPar) {
      setCourseName('');
      setSelectedCourseId(null);
    }
  }, [effectiveUsesPar]);

  const selectType = (id: string) => {
    setTypeId(id);
    const p = getGameType(id);
    setNumRounds(p.roundOptions[0]);
    setUsesPar(false);
    setCourseName('');
    setSelectedCourseId(null);
  };

  const updateCourseName = (text: string) => {
    setCourseName(text);
    const selected = selectedCourseId ? courses.find((c) => c.id === selectedCourseId) : undefined;
    if (selected && selected.name.trim().toLowerCase() !== text.trim().toLowerCase()) {
      setSelectedCourseId(null);
    }
  };

  const selectCourseChip = (courseId: string) => {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;
    setCourseName(course.name);
    setSelectedCourseId(course.id);
    setNumRounds(course.pars.length);
  };

  const updatePlayer = (index: number, patch: Partial<PlayerDraft>) =>
    setPlayers((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));

  const addPlayerField = () => setPlayers((prev) => [...prev, { ...BLANK_PLAYER }]);

  const removePlayerField = (index: number) =>
    setPlayers((prev) => prev.filter((_, i) => i !== index));

  const addProfilePlayer = (profileId: string) => {
    const profile = profiles.find((p) => p.id === profileId);
    if (!profile) return;
    setPlayers((prev) => [...prev, { name: profile.name, handicap: '', profileId: profile.id }]);
  };

  const addedProfileIds = new Set(players.map((p) => p.profileId).filter(Boolean));

  const canCreate = players.some((p) => p.name.trim().length > 0);

  const handleCreate = () => {
    const finalDrafts = players.filter((p) => p.name.trim().length > 0);
    if (finalDrafts.length === 0) return;

    const finalNames = finalDrafts.map((p) => p.name.trim());
    const finalProfileIds = finalDrafts.map((p) => p.profileId);
    const finalHandicaps = effectiveUsesPar
      ? finalDrafts.map((p) => {
          const n = parseInt(p.handicap, 10);
          return Number.isNaN(n) || n < 0 ? undefined : n;
        })
      : undefined;

    const finalName = name.trim() || `${preset.label} — ${new Date().toLocaleDateString()}`;
    const trimmedCourseName = effectiveUsesPar ? courseName.trim() : '';

    let pars: (number | null)[] | undefined;
    if (trimmedCourseName) {
      const matched = selectedCourseId
        ? courses.find((c) => c.id === selectedCourseId)
        : findCourseByName(trimmedCourseName);
      if (matched) pars = adjustPars(matched.pars, numRounds);
    }

    const game = createGame({
      typeId: preset.id,
      typeLabel: preset.label,
      usesPar: effectiveUsesPar,
      unitLabel: preset.unitLabel,
      unitLabelPlural: preset.unitLabelPlural,
      roundIncrement: preset.roundIncrement,
      defaultPar: preset.defaultPar,
      numRounds,
      playerNames: finalNames,
      playerProfileIds: finalProfileIds,
      playerHandicaps: finalHandicaps,
      name: finalName,
      courseName: trimmedCourseName || undefined,
      pars,
    });

    router.replace(`/game/${game.id}`);
  };

  return (
    <KeyboardAwareScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      enableOnAndroid
      extraScrollHeight={24}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>Game Type</Text>
      <View style={styles.typeRow}>
        {GAME_TYPES.map((t) => {
          const selected = t.id === typeId;
          return (
            <Pressable key={t.id} onPress={() => selectType(t.id)} style={styles.typeCardWrap}>
              <Card
                style={[
                  styles.typeCard,
                  selected ? { borderColor: theme.accent, backgroundColor: theme.accentSoft } : null,
                ]}
              >
                <Text style={[styles.typeLabel, { color: selected ? theme.accent : theme.text }]}>
                  {t.label}
                </Text>
              </Card>
            </Pressable>
          );
        })}
      </View>

      {preset.parConfigurable && (
        <View style={{ marginTop: 14 }}>
          <SegmentedControl
            options={[
              { key: 'no', label: 'No Par' },
              { key: 'yes', label: 'Track Par' },
            ]}
            value={usesPar ? 'yes' : 'no'}
            onChange={(v) => setUsesPar(v === 'yes')}
          />
        </View>
      )}

      <Text style={[styles.sectionTitle, { color: theme.textMuted, marginTop: 24 }]}>
        Number of {preset.unitLabelPlural}
      </Text>
      <View style={styles.pillRow}>
        {preset.roundOptions.map((opt) => {
          const selected = opt === numRounds;
          return (
            <Pressable
              key={opt}
              onPress={() => setNumRounds(opt)}
              style={[
                styles.pill,
                {
                  borderColor: selected ? theme.accent : theme.border,
                  backgroundColor: selected ? theme.accentSoft : theme.surface,
                },
              ]}
            >
              <Text style={{ color: selected ? theme.accent : theme.text, fontWeight: '600' }}>{opt}</Text>
            </Pressable>
          );
        })}
      </View>

      {effectiveUsesPar && (
        <>
          <Text style={[styles.sectionTitle, { color: theme.textMuted, marginTop: 24 }]}>
            Course (optional)
          </Text>
          <TextInput
            style={[styles.nameInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
            placeholder="Course name"
            placeholderTextColor={theme.textMuted}
            value={courseName}
            onChangeText={updateCourseName}
          />
          {courses.length > 0 && (
            <View style={styles.chipRow}>
              {courses.map((c) => {
                const selected = c.id === selectedCourseId;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => selectCourseChip(c.id)}
                    style={[
                      styles.chip,
                      {
                        borderColor: selected ? theme.accent : theme.border,
                        backgroundColor: selected ? theme.accentSoft : theme.surface,
                      },
                    ]}
                  >
                    <Text style={{ color: selected ? theme.accent : theme.text, fontSize: 13, fontWeight: '600' }}>
                      {c.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </>
      )}

      <Text style={[styles.sectionTitle, { color: theme.textMuted, marginTop: 24 }]}>Players</Text>

      {profiles.length > 0 && (
        <View style={styles.chipRow}>
          {profiles.map((profile) => {
            const alreadyAdded = addedProfileIds.has(profile.id);
            return (
              <Pressable
                key={profile.id}
                onPress={() => !alreadyAdded && addProfilePlayer(profile.id)}
                style={[
                  styles.chip,
                  {
                    borderColor: alreadyAdded ? theme.accent : theme.border,
                    backgroundColor: alreadyAdded ? theme.accentSoft : theme.surface,
                    opacity: alreadyAdded ? 0.5 : 1,
                  },
                ]}
              >
                <Text style={{ color: alreadyAdded ? theme.accent : theme.text, fontSize: 13, fontWeight: '600' }}>
                  {alreadyAdded ? '✓ ' : '+ '}{profile.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <Card style={{ marginTop: profiles.length > 0 ? 10 : 0 }}>
        {players.map((player, index) => (
          <View key={index} style={styles.playerRow}>
            <TextInput
              style={[styles.playerInput, { color: theme.text, borderColor: theme.border }]}
              placeholder={`Player ${index + 1}`}
              placeholderTextColor={theme.textMuted}
              value={player.name}
              onChangeText={(t) => updatePlayer(index, { name: t, profileId: player.profileId })}
            />
            {effectiveUsesPar && (
              <TextInput
                style={[styles.handicapInput, { color: theme.text, borderColor: theme.border }]}
                placeholder="HCP"
                placeholderTextColor={theme.textMuted}
                keyboardType="number-pad"
                value={player.handicap}
                onChangeText={(t) => updatePlayer(index, { handicap: t.replace(/[^0-9]/g, '') })}
              />
            )}
            {players.length > 1 && (
              <Pressable onPress={() => removePlayerField(index)} hitSlop={8} style={styles.removeBtn}>
                <Text style={{ color: theme.textMuted, fontSize: 18 }}>×</Text>
              </Pressable>
            )}
          </View>
        ))}
        <Button title="+ Add Player" variant="ghost" onPress={addPlayerField} />
      </Card>

      <Text style={[styles.sectionTitle, { color: theme.textMuted, marginTop: 24 }]}>
        Game Name (optional)
      </Text>
      <TextInput
        style={[styles.nameInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
        placeholder={`${preset.label} — ${new Date().toLocaleDateString()}`}
        placeholderTextColor={theme.textMuted}
        value={name}
        onChangeText={setName}
      />

      <Button title="Create Game" onPress={handleCreate} disabled={!canCreate} style={{ marginTop: 28 }} />
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeCardWrap: {
    flex: 1,
  },
  typeCard: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  typeLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  pillRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pill: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    marginBottom: 4,
  },
  chip: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  playerInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  handicapInput: {
    width: 60,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 10,
    fontSize: 15,
    textAlign: 'center',
  },
  removeBtn: {
    paddingHorizontal: 4,
  },
  nameInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
});
