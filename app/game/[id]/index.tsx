import React, { useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useTheme } from '@/theme/ThemeContext';
import { useGameStore } from '@/store/GameStore';
import { useCourseStore } from '@/store/CourseStore';
import { EntryMode, Game } from '@/store/types';
import {
  formatRelative,
  netRelativeToPar,
  netTotalForPlayer,
  relativeToPar,
  roundsPlayedForPlayer,
  totalForPlayer,
  totalPar,
} from '@/utils/scoring';
import { Card } from '@/components/Card';
import { SegmentedControl } from '@/components/SegmentedControl';
import { IntegerPickerModal } from '@/components/IntegerPickerModal';

const LABEL_WIDTH = 96;
const DATA_WIDTH = 52;
const ROW_HEIGHT = 44;

// ── Off-screen scorecard rendered for PNG capture ────────────────────────────

const XP = 20;        // outer padding
const XL = 120;       // player name column width
const XH = 36;        // hole column width
const XT = 72;        // total column width (wide enough for "39 (+3)")
const XR = 36;        // row height
const XF = 12;        // base font size

// Scorecard palette (always light, regardless of app theme)
const SC = {
  border: '#6b7280',
  headerBg: '#1f2937',
  headerText: '#ffffff',
  parBg: '#dbeafe',
  parText: '#1e40af',
  nameBg: '#f3f4f6',
  rowEven: '#ffffff',
  rowOdd: '#f0f4f8',
  totalBg: '#f3f4f6',
  text: '#111827',
  muted: '#6b7280',
  eagle: '#6d28d9',
  birdie: '#1d4ed8',
  bogey: '#b91c1c',
  double: '#7f1d1d',
};

function scoreColor(raw: number | null, par: number | null): string {
  if (raw == null || par == null) return SC.text;
  const d = raw - par;
  if (d <= -2) return SC.eagle;
  if (d === -1) return SC.birdie;
  if (d === 0) return SC.text;
  if (d === 1) return SC.bogey;
  return SC.double;
}

function XCell({
  w, h = XR, label, bold, bg, color, right = true, left = false, fs = XF, align = 'center',
}: {
  w: number; h?: number; label: string; bold?: boolean; bg?: string; color?: string;
  right?: boolean; left?: boolean; fs?: number; align?: 'center' | 'left';
}) {
  return (
    <View style={{
      width: w, height: h,
      justifyContent: 'center',
      alignItems: align === 'left' ? 'flex-start' : 'center',
      paddingHorizontal: align === 'left' ? 8 : 3,
      backgroundColor: bg ?? SC.rowEven,
      borderRightWidth: right ? 1 : 0,
      borderRightColor: SC.border,
      borderLeftWidth: left ? 1 : 0,
      borderLeftColor: SC.border,
      borderBottomWidth: 1,
      borderBottomColor: SC.border,
    }}>
      <Text numberOfLines={1} style={{ color: color ?? SC.text, fontWeight: bold ? '700' : '400', fontSize: fs }}>
        {label}
      </Text>
    </View>
  );
}

function ScorecardCapture({
  game,
  exportRef,
}: {
  game: Game;
  exportRef: React.RefObject<View | null>;
}) {
  const n = game.numRounds;
  const holes = Array.from({ length: n }, (_, i) => i);
  const totalWidth = XP * 2 + XL + XH * n + XT;
  const dateStr = new Date(game.updatedAt).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  const parSum = game.pars.reduce<number>((s, v) => s + (v ?? 0), 0);

  return (
    <View
      ref={exportRef}
      collapsable={false}
      style={{ position: 'absolute', left: -10000, top: 0, width: totalWidth, backgroundColor: '#fff', padding: XP }}
    >
      {/* Title block */}
      <Text style={{ fontSize: 17, fontWeight: '800', color: SC.text, marginBottom: 2 }}>{game.name}</Text>
      <Text style={{ fontSize: 11, color: SC.muted, marginBottom: 14 }}>
        {game.typeLabel}{game.courseName ? ` · ${game.courseName}` : ''} · {dateStr} · {n} {game.unitLabelPlural.toLowerCase()}
      </Text>

      {/* Table */}
      <View style={{ borderTopWidth: 1, borderTopColor: SC.border }}>

        {/* Header row — hole numbers */}
        <View style={{ flexDirection: 'row' }}>
          <XCell w={XL} label={game.unitLabel} bold bg={SC.headerBg} color={SC.headerText} align="left" fs={XF} />
          {holes.map((i) => (
            <XCell key={i} w={XH} label={String(i + 1)} bold bg={SC.headerBg} color={SC.headerText} fs={XF} />
          ))}
          <XCell w={XT} label="Total" bold bg={SC.headerBg} color={SC.headerText} right={false} fs={XF} />
        </View>

        {/* Par row */}
        {game.usesPar && (
          <View style={{ flexDirection: 'row' }}>
            <XCell w={XL} label="Par" bold bg={SC.parBg} color={SC.parText} align="left" />
            {holes.map((i) => (
              <XCell key={i} w={XH} label={game.pars[i] != null ? String(game.pars[i]) : '–'} bg={SC.parBg} color={SC.parText} />
            ))}
            <XCell w={XT} label={parSum > 0 ? String(parSum) : '–'} bold bg={SC.parBg} color={SC.parText} right={false} />
          </View>
        )}

        {/* Player rows */}
        {game.players.map((p, pi) => {
          const scores = game.scores[p.id] ?? [];
          const gross = scores.reduce<number>((s, v) => s + (v ?? 0), 0);
          const played = scores.filter((v) => v != null).length;
          const parPlayed = holes.reduce<number>((s, i) => s + (scores[i] != null && game.pars[i] != null ? (game.pars[i] as number) : 0), 0);
          const rel = gross - parPlayed;
          const relStr = rel === 0 ? 'E' : rel > 0 ? `+${rel}` : `${rel}`;
          const net = p.handicap != null ? gross - p.handicap : null;
          const rowBg = pi % 2 === 0 ? SC.rowEven : SC.rowOdd;
          const nameLabel = p.name + (p.handicap != null ? ` (HCP ${p.handicap})` : '');
          const totalLabel = played === 0
            ? '–'
            : game.usesPar
              ? `${gross} (${relStr}${net != null ? ` N${net}` : ''})`
              : String(gross);

          return (
            <View key={p.id} style={{ flexDirection: 'row' }}>
              <XCell w={XL} label={nameLabel} bold bg={SC.nameBg} align="left" />
              {holes.map((i) => (
                <XCell
                  key={i}
                  w={XH}
                  label={scores[i] != null ? String(scores[i]) : '–'}
                  bg={rowBg}
                  color={game.usesPar ? scoreColor(scores[i] ?? null, game.pars[i] ?? null) : SC.text}
                  bold={game.usesPar && scores[i] != null && game.pars[i] != null && (scores[i] as number) < (game.pars[i] as number)}
                />
              ))}
              <XCell w={XT} label={totalLabel} bold bg={SC.totalBg} right={false} fs={11} />
            </View>
          );
        })}

      </View>

      {/* Totals cards */}
      <Text style={{ fontSize: 11, fontWeight: '700', color: SC.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 20, marginBottom: 10 }}>
        Totals
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {game.players.map((p) => {
          const scores = game.scores[p.id] ?? [];
          const played = scores.filter((v) => v != null).length;
          const gross = scores.reduce<number>((s, v) => s + (v ?? 0), 0);
          const parPlayed = holes.reduce<number>((s, i) => s + (scores[i] != null && game.pars[i] != null ? (game.pars[i] as number) : 0), 0);
          const rel = gross - parPlayed;
          const relStr = played > 0 ? (rel === 0 ? 'E' : rel > 0 ? `+${rel}` : `${rel}`) : 'E';
          const relColor = rel < 0 ? SC.birdie : rel > 0 ? SC.bogey : SC.text;
          const net = p.handicap != null ? gross - p.handicap : null;
          const netRel = net != null ? net - parPlayed : null;
          const netRelStr = netRel != null ? (netRel === 0 ? 'E' : netRel > 0 ? `+${netRel}` : `${netRel}`) : '';
          const netRelColor = netRel != null ? (netRel < 0 ? SC.birdie : netRel > 0 ? SC.bogey : SC.text) : SC.text;

          return (
            <View
              key={p.id}
              style={{
                width: 148,
                height: 148,
                borderWidth: 1,
                borderColor: SC.border,
                borderRadius: 8,
                padding: 12,
                backgroundColor: '#fff',
                overflow: 'hidden',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: SC.text, marginBottom: 6 }} numberOfLines={1}>
                {p.name}
                {p.handicap != null ? (
                  <Text style={{ fontSize: 10, fontWeight: '400', color: SC.muted }}>{` HCP ${p.handicap}`}</Text>
                ) : null}
              </Text>

              <Text style={{ fontSize: 28, fontWeight: '800', color: SC.text, lineHeight: 32, marginBottom: 2 }}>
                {played > 0 ? gross : '–'}
              </Text>

              {game.usesPar && (
                <>
                  <Text style={{ fontSize: 11, color: SC.muted }}>Par {parPlayed}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: relColor, marginTop: 1 }}>
                    {relStr} thru {played}
                  </Text>
                </>
              )}

              {net != null && netRel != null && played > 0 && (
                <Text style={{ fontSize: 11, color: SC.muted, marginTop: 6 }}>
                  {'Net '}
                  <Text style={{ color: SC.text, fontWeight: '700' }}>{net}</Text>
                  {'  '}
                  <Text style={{ color: netRelColor, fontWeight: '700' }}>({netRelStr})</Text>
                </Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ── Active cell types ────────────────────────────────────────────────────────

type ActiveCell =
  | { kind: 'par'; roundIndex: number }
  | { kind: 'score'; roundIndex: number; playerId: string }
  | null;

function formatScoreCell(game: Game, raw: number | null, roundIndex: number): string {
  if (raw == null) return '–';
  if (!game.usesPar) return String(raw);
  if (game.entryMode === 'relative') {
    const par = game.pars[roundIndex];
    if (par == null) return String(raw);
    return formatRelative(raw - par);
  }
  return String(raw);
}

// ── Main screen ──────────────────────────────────────────────────────────────

export default function GameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const { getGame, setPar, setScore, setEntryMode } = useGameStore();
  const { upsertCourse } = useCourseStore();
  const game = getGame(id);
  const exportRef = useRef<View>(null);

  const [activeCell, setActiveCell] = useState<ActiveCell>(null);

  if (!game) {
    return (
      <View style={[styles.notFound, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.textMuted }}>Game not found.</Text>
      </View>
    );
  }

  const rounds = Array.from({ length: game.numRounds });
  const totalParValue = totalPar(game);
  const anyHandicap = game.usesPar && game.players.some((p) => p.handicap != null);

  const handleSetPar = (roundIndex: number, value: number | null) => {
    setPar(game.id, roundIndex, value);
    if (game.courseName) {
      const updatedPars = [...game.pars];
      updatedPars[roundIndex] = value;
      upsertCourse(game.courseName, updatedPars);
    }
  };

  const handleShare = async () => {
    try {
      const uri = await captureRef(exportRef, { format: 'png', quality: 1.0, result: 'tmpfile' });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share Scorecard' });
    } catch {
      Alert.alert('Not available', 'Image sharing requires the standalone app build (not Expo Go).');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Off-screen scorecard for PNG capture */}
      <ScorecardCapture game={game} exportRef={exportRef} />

      <Stack.Screen
        options={{
          title: game.name,
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 18 }}>
              <Pressable onPress={handleShare} hitSlop={10}>
                <Text style={{ color: theme.accent, fontSize: 15, fontWeight: '600' }}>Share</Text>
              </Pressable>
              <Pressable onPress={() => router.push(`/game/${game.id}/edit`)} hitSlop={10}>
                <Text style={{ color: theme.accent, fontSize: 15, fontWeight: '600' }}>Edit</Text>
              </Pressable>
            </View>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {game.usesPar && (
          <View style={styles.controls}>
            <SegmentedControl<EntryMode>
              options={[
                { key: 'raw', label: 'Strokes' },
                { key: 'relative', label: 'Par +/-' },
              ]}
              value={game.entryMode}
              onChange={(m) => setEntryMode(game.id, m)}
            />
          </View>
        )}

        <View style={styles.gridRow}>
          <View>
            <GridCell width={LABEL_WIDTH} label={game.unitLabel} bold muted align="left" />
            {game.usesPar && <GridCell width={LABEL_WIDTH} label="Par" bold align="left" />}
            {game.players.map((p) => (
              <GridCell key={p.id} width={LABEL_WIDTH} label={p.name} align="left" />
            ))}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              <View style={styles.gridDataRow}>
                {rounds.map((_, idx) => (
                  <GridCell key={idx} width={DATA_WIDTH} label={String(idx + 1)} bold muted />
                ))}
              </View>

              {game.usesPar && (
                <View style={styles.gridDataRow}>
                  {rounds.map((_, idx) => (
                    <GridCell
                      key={idx}
                      width={DATA_WIDTH}
                      label={game.pars[idx] != null ? String(game.pars[idx]) : '–'}
                      onPress={() => setActiveCell({ kind: 'par', roundIndex: idx })}
                    />
                  ))}
                </View>
              )}

              {game.players.map((p) => (
                <View key={p.id} style={styles.gridDataRow}>
                  {rounds.map((_, idx) => {
                    const raw = game.scores[p.id]?.[idx] ?? null;
                    return (
                      <GridCell
                        key={idx}
                        width={DATA_WIDTH}
                        label={formatScoreCell(game, raw, idx)}
                        onPress={() =>
                          setActiveCell({ kind: 'score', roundIndex: idx, playerId: p.id })
                        }
                      />
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>Totals</Text>
        <View style={styles.totalsRow}>
          {game.players.map((p) => {
            const gross = totalForPlayer(game, p.id);
            const played = roundsPlayedForPlayer(game, p.id);
            const rel = relativeToPar(game, p.id);
            const net = anyHandicap ? netTotalForPlayer(game, p.id) : null;
            const netRel = anyHandicap ? netRelativeToPar(game, p.id) : null;
            return (
              <Card key={p.id} style={styles.totalCard}>
                <Text style={[styles.totalName, { color: theme.text }]} numberOfLines={1}>
                  {p.name}
                  {p.handicap != null ? (
                    <Text style={{ color: theme.textMuted, fontSize: 12, fontWeight: '400' }}>
                      {' '}HCP {p.handicap}
                    </Text>
                  ) : null}
                </Text>
                <Text style={[styles.totalScore, { color: theme.text }]}>{gross}</Text>
                {game.usesPar && (
                  <>
                    <Text style={{ color: theme.textMuted, fontSize: 12 }}>Par {totalParValue}</Text>
                    <Text
                      style={{
                        color: rel === 0 ? theme.textMuted : rel > 0 ? theme.danger : theme.accent,
                        fontWeight: '700',
                      }}
                    >
                      {formatRelative(rel)}
                      {played < game.numRounds ? ` thru ${played}` : ''}
                    </Text>
                    {net != null && netRel != null && (
                      <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 6 }}>
                        Net{' '}
                        <Text style={{ color: theme.text, fontWeight: '700' }}>{net}</Text>
                        {'  '}
                        <Text
                          style={{
                            color:
                              netRel === 0
                                ? theme.textMuted
                                : netRel > 0
                                ? theme.danger
                                : theme.accent,
                            fontWeight: '700',
                          }}
                        >
                          {formatRelative(netRel)}
                        </Text>
                      </Text>
                    )}
                  </>
                )}
              </Card>
            );
          })}
        </View>
      </ScrollView>

      {activeCell?.kind === 'par' &&
        (() => {
          const idx = activeCell.roundIndex;
          return (
            <IntegerPickerModal
              visible
              title={`${game.unitLabel} ${idx + 1} Par`}
              initialValue={game.pars[idx] ?? null}
              centerValue={game.defaultPar}
              min={1}
              allowClear
              onClose={() => setActiveCell(null)}
              onSubmit={(v) => handleSetPar(idx, v)}
            />
          );
        })()}

      {activeCell?.kind === 'score' &&
        (() => {
          const { roundIndex: idx, playerId } = activeCell;
          const player = game.players.find((p) => p.id === playerId);
          const raw = game.scores[playerId]?.[idx] ?? null;
          const parVal = game.pars[idx] ?? null;

          if (!game.usesPar) {
            return (
              <IntegerPickerModal
                visible
                title={`${player?.name} • ${game.unitLabel} ${idx + 1}`}
                initialValue={raw}
                centerValue={1}
                chipOffsets={[0, 1, 2, 3, 4, 5]}
                min={1}
                allowClear
                onClose={() => setActiveCell(null)}
                onSubmit={(v) => setScore(game.id, playerId, idx, v)}
              />
            );
          }

          if (game.entryMode === 'relative') {
            const parForCalc = parVal ?? 0;
            return (
              <IntegerPickerModal
                visible
                title={`${player?.name} • ${game.unitLabel} ${idx + 1}`}
                subtitle={`Par ${parVal ?? '–'}`}
                initialValue={raw != null ? raw - parForCalc : null}
                centerValue={0}
                min={parVal != null ? 1 - parVal : undefined}
                formatValue={formatRelative}
                allowClear
                onClose={() => setActiveCell(null)}
                onSubmit={(v) => setScore(game.id, playerId, idx, v == null ? null : v + parForCalc)}
              />
            );
          }

          return (
            <IntegerPickerModal
              visible
              title={`${player?.name} • ${game.unitLabel} ${idx + 1}`}
              subtitle={`Par ${parVal ?? '–'}`}
              initialValue={raw}
              centerValue={parVal ?? 1}
              chipOffsets={parVal != null ? [-2, -1, 0, 1, 2, 3] : [0, 1, 2, 3, 4, 5]}
              min={1}
              allowClear
              onClose={() => setActiveCell(null)}
              onSubmit={(v) => setScore(game.id, playerId, idx, v)}
            />
          );
        })()}
    </View>
  );
}

// ── GridCell ─────────────────────────────────────────────────────────────────

function GridCell({
  width,
  label,
  bold,
  muted,
  onPress,
  align = 'center',
}: {
  width: number;
  label: string;
  bold?: boolean;
  muted?: boolean;
  onPress?: () => void;
  align?: 'center' | 'left';
}) {
  const { theme } = useTheme();
  const body = (
    <View
      style={[
        styles.cell,
        {
          width,
          borderColor: theme.border,
          alignItems: align === 'center' ? 'center' : 'flex-start',
        },
      ]}
    >
      <Text
        style={{ color: muted ? theme.textMuted : theme.text, fontWeight: bold ? '700' : '500' }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
  return onPress ? <Pressable onPress={onPress}>{body}</Pressable> : body;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  controls: { marginBottom: 18 },
  gridRow: { flexDirection: 'row', marginBottom: 24 },
  gridDataRow: { flexDirection: 'row' },
  cell: {
    height: ROW_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderRightWidth: 1,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  totalsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  totalCard: { minWidth: 110 },
  totalName: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  totalScore: { fontSize: 22, fontWeight: '700' },
});
