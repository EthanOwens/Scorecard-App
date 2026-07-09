export type EntryMode = 'raw' | 'relative';

export interface Player {
  id: string;
  name: string;
  handicap?: number;
  profileId?: string;
}

export interface PlayerProfile {
  id: string;
  name: string;
  createdAt: number;
}

export interface Game {
  id: string;
  typeId: string;
  typeLabel: string;
  usesPar: boolean;
  unitLabel: string;
  unitLabelPlural: string;
  roundIncrement: number;
  defaultPar: number;
  name: string;
  courseName?: string;
  createdAt: number;
  updatedAt: number;
  favorite: boolean;
  numRounds: number;
  pars: (number | null)[];
  players: Player[];
  scores: Record<string, (number | null)[]>;
  entryMode: EntryMode;
}

export interface CreateGameInput {
  typeId: string;
  typeLabel: string;
  usesPar: boolean;
  unitLabel: string;
  unitLabelPlural: string;
  roundIncrement: number;
  defaultPar: number;
  numRounds: number;
  playerNames: string[];
  playerProfileIds?: (string | undefined)[];
  playerHandicaps?: (number | undefined)[];
  name: string;
  courseName?: string;
  pars?: (number | null)[];
}

export interface Course {
  id: string;
  name: string;
  pars: (number | null)[];
}

export type GameStructure = Pick<Game, 'players' | 'pars' | 'scores' | 'numRounds'>;
