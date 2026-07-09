import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as Print from 'expo-print';
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

type ActiveCell =
  | { kind: 'par'; roundIndex: number }
  | { kind: 'score'; roundIndex: number; playerId: string }
  | null;

function formatScoreCell(game: Game, raw: number | null, roundIndex: number): string {
  if (raw == null) return '–';
  if (!game.usesPar) return String(raw);
  if (game.entryMode === 'relative') {
    const par = game.pars[roundIndex] ?? game.defaultPar;
    return formatRelative(raw - par);
  }
  return String(raw);
}

function buildScorecardHtml(game: Game): string {
  const dateStr = new Date(game.updatedAt).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const rounds = Array.from({ length: game.numRounds }, (_, i) => i);

  const headerCells = rounds.map((i) => `<th>${i + 1}</th>`).join('');

  const parRow = game.usesPar
    ? `<tr>
        <th class="label-col">Par</th>
        ${rounds.map((i) => `<td>${game.pars[i] != null ? game.pars[i] : '–'}</td>`).join('')}
        <td><strong>${game.pars.reduce<number>((s, v) => s + (v ?? 0), 0) || '–'}</strong></td>
      </tr>`
    : '';

  const playerRows = game.players
    .map((p) => {
      const scores = game.scores[p.id] ?? [];
      const total = scores.reduce((s: number, v) => s + (v ?? 0), 0);
      const parPlayed = (() => {
        let sum = 0;
        for (let i = 0; i < game.pars.length; i++) {
          if (scores[i] != null && game.pars[i] != null) sum += game.pars[i] as number;
        }
        return sum;
      })();
      const rel = total - parPlayed;
      const relStr = rel === 0 ? 'E' : rel > 0 ? `+${rel}` : `${rel}`;
      const net = p.handicap != null ? total - p.handicap : null;

      const cells = rounds.map((i) => `<td>${scores[i] != null ? scores[i] : '–'}</td>`).join('');
      const hcpBadge = p.handicap != null
        ? ` <span style="color:#888;font-size:11px;font-weight:400">(HCP ${p.handicap})</span>`
        : '';
      const totalCell = game.usesPar
        ? `<td><strong>${total}</strong><br><small style="color:#888">${relStr}${net != null ? ` · Net ${net}` : ''}</small></td>`
        : `<td><strong>${total}</strong></td>`;

      return `<tr>
        <th class="label-col">${p.name}${hcpBadge}</th>
        ${cells}
        ${totalCell}
      </tr>`;
    })
    .join('');

  const totalsCards = game.players
    .map((p) => {
      const scores = game.scores[p.id] ?? [];
      const total = scores.reduce((s: number, v) => s + (v ?? 0), 0);
      const played = scores.filter((v) => v != null).length;
      let parPlayed = 0;
      for (let i = 0; i < game.pars.length; i++) {
        if (scores[i] != null && game.pars[i] != null) parPlayed += game.pars[i] as number;
      }
      const rel = total - parPlayed;
      const relStr = rel === 0 ? 'E' : rel > 0 ? `+${rel}` : `${rel}`;
      const relClass = rel < 0 ? 'rel-under' : rel > 0 ? 'rel-over' : 'rel-even';
      const net = p.handicap != null ? total - p.handicap : null;
      const netRel = net != null ? net - parPlayed : null;
      const netRelStr = netRel == null ? '' : netRel === 0 ? 'E' : netRel > 0 ? `+${netRel}` : `${netRel}`;
      const netRelClass = netRel == null ? '' : netRel < 0 ? 'rel-under' : netRel > 0 ? 'rel-over' : 'rel-even';

      return `<div class="total-card">
        <div class="total-name">${p.name}</div>
        <div class="total-score">${total}</div>
        ${game.usesPar ? `<div class="total-meta">Par ${parPlayed}</div>
          <div class="${relClass}">${relStr}${played < game.numRounds ? ` thru ${played}` : ''}</div>` : ''}
        ${net != null ? `<div class="total-meta" style="margin-top:6px">Net <strong>${net}</strong>${netRelStr ? ` <span class="${netRelClass}">(${netRelStr})</span>` : ''}</div>` : ''}
      </div>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { font-family: -apple-system, Helvetica, sans-serif; padding: 24px; color: #111; }
  h1 { font-size: 22px; margin: 0 0 4px 0; }
  .meta { color: #777; font-size: 13px; margin-bottom: 24px; }
  table { border-collapse: collapse; width: 100%; font-size: 12px; margin-bottom: 24px; }
  th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: center; white-space: nowrap; }
  th { background: #f7f7f7; }
  .label-col { text-align: left; min-width: 90px; }
  .totals-section h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #777; margin-bottom: 12px; font-weight: 700; }
  .totals-wrap { display: flex; flex-wrap: wrap; gap: 12px; }
  .total-card { border: 1px solid #ddd; border-radius: 10px; padding: 14px 18px; }
  .total-name { font-size: 13px; font-weight: 600; margin-bottom: 2px; }
  .total-score { font-size: 28px; font-weight: 700; }
  .total-meta { color: #777; font-size: 12px; margin-top: 2px; }
  .rel-under { color: #4a9e78; font-weight: 700; font-size: 14px; }
  .rel-over { color: #c0566a; font-weight: 700; font-size: 14px; }
  .rel-even { color: #777; font-weight: 700; font-size: 14px; }
</style>
</head>
<body>
  <h1>${game.name}</h1>
  <div class="meta">${game.typeLabel}${game.courseName ? ` · ${game.courseName}` : ''} · ${dateStr} · ${game.numRounds} ${game.unitLabelPlural.toLowerCase()}</div>
  <table>
    <tr>
      <th class="label-col">${game.unitLabel}</th>
      ${headerCells}
      <th>Total</th>
    </tr>
    ${parRow}
    ${playerRows}
  </table>
  <div class="totals-section">
    <h2>Totals</h2>
    <div class="totals-wrap">${totalsCards}</div>
  </div>
</body>
</html>`;
}

export default function GameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const { getGame, setPar, setScore, setEntryMode } = useGameStore();
  const { upsertCourse } = useCourseStore();
  const game = getGame(id);

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

  const handleExport = async () => {
    try {
      const html = buildScorecardHtml(game);
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
    } catch {
      Alert.alert('Export failed', 'Could not generate the scorecard PDF.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          title: game.name,
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 18 }}>
              <Pressable onPress={handleExport} hitSlop={10}>
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
                        onPress={() => setActiveCell({ kind: 'score', roundIndex: idx, playerId: p.id })}
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
                    <Text style={{ color: theme.textMuted, fontSize: 12, fontWeight: '400' }}> HCP {p.handicap}</Text>
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
                            color: netRel === 0 ? theme.textMuted : netRel > 0 ? theme.danger : theme.accent,
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
          const current = game.pars[idx] ?? game.defaultPar;
          return (
            <IntegerPickerModal
              visible
              title={`${game.unitLabel} ${idx + 1} Par`}
              initialValue={current}
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
          const par = game.pars[idx] ?? game.defaultPar;

          if (!game.usesPar) {
            return (
              <IntegerPickerModal
                visible
                title={`${player?.name} • ${game.unitLabel} ${idx + 1}`}
                initialValue={raw ?? 0}
                centerValue={raw ?? 0}
                chipOffsets={[0, 1, 2, 3, 4, 5]}
                min={0}
                allowClear
                allowTextInput
                onClose={() => setActiveCell(null)}
                onSubmit={(v) => setScore(game.id, playerId, idx, v)}
              />
            );
          }

          if (game.entryMode === 'relative') {
            const initialDisplay = raw != null ? raw - par : 0;
            return (
              <IntegerPickerModal
                visible
                title={`${player?.name} • ${game.unitLabel} ${idx + 1}`}
                subtitle={`Par ${par}`}
                initialValue={initialDisplay}
                centerValue={0}
                min={1 - par}
                formatValue={formatRelative}
                allowClear
                onClose={() => setActiveCell(null)}
                onSubmit={(v) => setScore(game.id, playerId, idx, v == null ? null : v + par)}
              />
            );
          }

          return (
            <IntegerPickerModal
              visible
              title={`${player?.name} • ${game.unitLabel} ${idx + 1}`}
              subtitle={`Par ${par}`}
              initialValue={raw ?? par}
              centerValue={par}
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
  container: {
    flex: 1,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  controls: {
    marginBottom: 18,
    gap: 10,
  },
  gridRow: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  gridDataRow: {
    flexDirection: 'row',
  },
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
  totalsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  totalCard: {
    minWidth: 110,
  },
  totalName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  totalScore: {
    fontSize: 22,
    fontWeight: '700',
  },
});
