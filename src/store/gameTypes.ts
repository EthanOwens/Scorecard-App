export interface GameTypePreset {
  id: string;
  label: string;
  usesPar: boolean;
  unitLabel: string;
  unitLabelPlural: string;
  roundIncrement: number;
  roundOptions: number[];
  defaultPar: number;
  parConfigurable: boolean;
}

export const GAME_TYPES: GameTypePreset[] = [
  {
    id: 'golf',
    label: 'Golf',
    usesPar: true,
    unitLabel: 'Hole',
    unitLabelPlural: 'Holes',
    roundIncrement: 9,
    roundOptions: [9, 18],
    defaultPar: 4,
    parConfigurable: false,
  },
  {
    id: 'custom',
    label: 'Custom Game',
    usesPar: false,
    unitLabel: 'Round',
    unitLabelPlural: 'Rounds',
    roundIncrement: 1,
    roundOptions: [3, 5, 10],
    defaultPar: 4,
    parConfigurable: true,
  },
];

export function getGameType(id: string): GameTypePreset {
  return GAME_TYPES.find((t) => t.id === id) ?? GAME_TYPES[GAME_TYPES.length - 1];
}
