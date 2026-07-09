import { Game } from '@/store/types';

export function totalForPlayer(game: Game, playerId: string): number {
  const scores = game.scores[playerId] ?? [];
  return scores.reduce((sum: number, v) => sum + (v ?? 0), 0);
}

export function roundsPlayedForPlayer(game: Game, playerId: string): number {
  const scores = game.scores[playerId] ?? [];
  return scores.filter((v) => v != null).length;
}

export function totalPar(game: Game): number {
  if (!game.usesPar) return 0;
  return game.pars.reduce((sum: number, v) => sum + (v ?? 0), 0);
}

export function parThroughPlayed(game: Game, playerId: string): number {
  if (!game.usesPar) return 0;
  const scores = game.scores[playerId] ?? [];
  let sum = 0;
  for (let i = 0; i < game.pars.length; i++) {
    if (scores[i] != null && game.pars[i] != null) sum += game.pars[i] as number;
  }
  return sum;
}

export function relativeToPar(game: Game, playerId: string): number {
  return totalForPlayer(game, playerId) - parThroughPlayed(game, playerId);
}

export function netTotalForPlayer(game: Game, playerId: string): number {
  const gross = totalForPlayer(game, playerId);
  const player = game.players.find((p) => p.id === playerId);
  return gross - (player?.handicap ?? 0);
}

export function netRelativeToPar(game: Game, playerId: string): number {
  return netTotalForPlayer(game, playerId) - parThroughPlayed(game, playerId);
}

export function formatRelative(value: number): string {
  if (value === 0) return 'E';
  return value > 0 ? `+${value}` : `${value}`;
}
