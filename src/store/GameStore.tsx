import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CreateGameInput, EntryMode, Game, GameStructure, Player } from './types';
import { generateId } from '@/utils/id';

const STORAGE_KEY = 'games_v1';

interface State {
  games: Game[];
  loaded: boolean;
}

type Action =
  | { type: 'LOAD'; games: Game[] }
  | { type: 'CREATE'; game: Game }
  | { type: 'DELETE'; id: string }
  | { type: 'TOGGLE_FAVORITE'; id: string }
  | { type: 'ADD_PLAYER'; gameId: string; name: string }
  | { type: 'REMOVE_PLAYER'; gameId: string; playerId: string }
  | { type: 'ADD_ROUNDS'; gameId: string; count: number }
  | { type: 'REMOVE_ROUNDS'; gameId: string; count: number }
  | { type: 'RESTORE_STRUCTURE'; gameId: string; structure: GameStructure }
  | { type: 'SET_PAR'; gameId: string; roundIndex: number; value: number | null }
  | { type: 'SET_SCORE'; gameId: string; playerId: string; roundIndex: number; value: number | null }
  | { type: 'SET_ENTRY_MODE'; gameId: string; mode: EntryMode }
  | { type: 'SET_PLAYER_HANDICAP'; gameId: string; playerId: string; handicap: number | undefined };

function touch(game: Game): Game {
  return { ...game, updatedAt: Date.now() };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOAD':
      return { games: action.games, loaded: true };
    case 'CREATE':
      return { ...state, games: [action.game, ...state.games] };
    case 'DELETE':
      return { ...state, games: state.games.filter((g) => g.id !== action.id) };
    case 'TOGGLE_FAVORITE':
      return {
        ...state,
        games: state.games.map((g) => (g.id === action.id ? touch({ ...g, favorite: !g.favorite }) : g)),
      };
    case 'ADD_PLAYER':
      return {
        ...state,
        games: state.games.map((g) => {
          if (g.id !== action.gameId) return g;
          const player: Player = { id: generateId(), name: action.name };
          const scores = { ...g.scores, [player.id]: new Array(g.numRounds).fill(null) };
          return touch({ ...g, players: [...g.players, player], scores });
        }),
      };
    case 'REMOVE_PLAYER':
      return {
        ...state,
        games: state.games.map((g) => {
          if (g.id !== action.gameId) return g;
          const players = g.players.filter((p) => p.id !== action.playerId);
          const scores = { ...g.scores };
          delete scores[action.playerId];
          return touch({ ...g, players, scores });
        }),
      };
    case 'ADD_ROUNDS':
      return {
        ...state,
        games: state.games.map((g) => {
          if (g.id !== action.gameId) return g;
          const addedPars: (number | null)[] = new Array(action.count).fill(null);
          const pars = [...g.pars, ...addedPars];
          const scores: Game['scores'] = {};
          for (const p of g.players) {
            scores[p.id] = [...(g.scores[p.id] ?? []), ...new Array(action.count).fill(null)];
          }
          return touch({ ...g, numRounds: g.numRounds + action.count, pars, scores });
        }),
      };
    case 'REMOVE_ROUNDS':
      return {
        ...state,
        games: state.games.map((g) => {
          if (g.id !== action.gameId) return g;
          const count = Math.min(action.count, g.numRounds);
          const numRounds = g.numRounds - count;
          const pars = g.pars.slice(0, numRounds);
          const scores: Game['scores'] = {};
          for (const p of g.players) {
            scores[p.id] = (g.scores[p.id] ?? []).slice(0, numRounds);
          }
          return touch({ ...g, numRounds, pars, scores });
        }),
      };
    case 'RESTORE_STRUCTURE':
      return {
        ...state,
        games: state.games.map((g) => (g.id === action.gameId ? touch({ ...g, ...action.structure }) : g)),
      };
    case 'SET_PAR':
      return {
        ...state,
        games: state.games.map((g) => {
          if (g.id !== action.gameId) return g;
          const pars = [...g.pars];
          pars[action.roundIndex] = action.value;
          return touch({ ...g, pars });
        }),
      };
    case 'SET_SCORE':
      return {
        ...state,
        games: state.games.map((g) => {
          if (g.id !== action.gameId) return g;
          const playerScores = [...(g.scores[action.playerId] ?? new Array(g.numRounds).fill(null))];
          playerScores[action.roundIndex] = action.value;
          return touch({ ...g, scores: { ...g.scores, [action.playerId]: playerScores } });
        }),
      };
    case 'SET_ENTRY_MODE':
      return {
        ...state,
        games: state.games.map((g) => (g.id === action.gameId ? touch({ ...g, entryMode: action.mode }) : g)),
      };
    case 'SET_PLAYER_HANDICAP':
      return {
        ...state,
        games: state.games.map((g) => {
          if (g.id !== action.gameId) return g;
          const players = g.players.map((p) =>
            p.id === action.playerId ? { ...p, handicap: action.handicap } : p
          );
          return touch({ ...g, players });
        }),
      };
    default:
      return state;
  }
}

interface GameStoreValue {
  games: Game[];
  loaded: boolean;
  createGame: (input: CreateGameInput) => Game;
  deleteGame: (id: string) => void;
  toggleFavorite: (id: string) => void;
  addPlayer: (gameId: string, name: string) => void;
  removePlayer: (gameId: string, playerId: string) => void;
  addRounds: (gameId: string, count: number) => void;
  removeRounds: (gameId: string, count: number) => void;
  restoreStructure: (gameId: string, structure: GameStructure) => void;
  setPar: (gameId: string, roundIndex: number, value: number | null) => void;
  setScore: (gameId: string, playerId: string, roundIndex: number, value: number | null) => void;
  setEntryMode: (gameId: string, mode: EntryMode) => void;
  setPlayerHandicap: (gameId: string, playerId: string, handicap: number | undefined) => void;
  getGame: (id: string) => Game | undefined;
}

const GameStoreContext = createContext<GameStoreValue | undefined>(undefined);

export function GameStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { games: [], loaded: false });

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const games: Game[] = raw ? JSON.parse(raw) : [];
        dispatch({ type: 'LOAD', games });
      } catch {
        dispatch({ type: 'LOAD', games: [] });
      }
    })();
  }, []);

  useEffect(() => {
    if (!state.loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state.games)).catch(() => {});
  }, [state.games, state.loaded]);

  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'background' || next === 'inactive') {
        const current = stateRef.current;
        if (current.loaded) {
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current.games)).catch(() => {});
        }
      }
    });
    return () => subscription.remove();
  }, []);

  const createGame = useCallback((input: CreateGameInput): Game => {
    const now = Date.now();
    const players: Player[] = input.playerNames.map((name, i) => ({
      id: generateId(),
      name,
      profileId: input.playerProfileIds?.[i],
      handicap: input.playerHandicaps?.[i],
    }));
    const scores: Game['scores'] = {};
    for (const p of players) scores[p.id] = new Array(input.numRounds).fill(null);
    const pars =
      input.pars && input.pars.length === input.numRounds
        ? [...input.pars]
        : new Array(input.numRounds).fill(null);
    const game: Game = {
      id: generateId(),
      typeId: input.typeId,
      typeLabel: input.typeLabel,
      usesPar: input.usesPar,
      unitLabel: input.unitLabel,
      unitLabelPlural: input.unitLabelPlural,
      roundIncrement: input.roundIncrement,
      defaultPar: input.defaultPar,
      name: input.name,
      courseName: input.courseName,
      createdAt: now,
      updatedAt: now,
      favorite: false,
      numRounds: input.numRounds,
      pars,
      players,
      scores,
      entryMode: 'raw',
    };
    dispatch({ type: 'CREATE', game });
    return game;
  }, []);

  const deleteGame = useCallback((id: string) => dispatch({ type: 'DELETE', id }), []);
  const toggleFavorite = useCallback((id: string) => dispatch({ type: 'TOGGLE_FAVORITE', id }), []);
  const addPlayer = useCallback(
    (gameId: string, name: string) => dispatch({ type: 'ADD_PLAYER', gameId, name }),
    []
  );
  const removePlayer = useCallback(
    (gameId: string, playerId: string) => dispatch({ type: 'REMOVE_PLAYER', gameId, playerId }),
    []
  );
  const addRounds = useCallback(
    (gameId: string, count: number) => dispatch({ type: 'ADD_ROUNDS', gameId, count }),
    []
  );
  const removeRounds = useCallback(
    (gameId: string, count: number) => dispatch({ type: 'REMOVE_ROUNDS', gameId, count }),
    []
  );
  const restoreStructure = useCallback(
    (gameId: string, structure: GameStructure) => dispatch({ type: 'RESTORE_STRUCTURE', gameId, structure }),
    []
  );
  const setPar = useCallback(
    (gameId: string, roundIndex: number, value: number | null) =>
      dispatch({ type: 'SET_PAR', gameId, roundIndex, value }),
    []
  );
  const setScore = useCallback(
    (gameId: string, playerId: string, roundIndex: number, value: number | null) =>
      dispatch({ type: 'SET_SCORE', gameId, playerId, roundIndex, value }),
    []
  );
  const setEntryMode = useCallback(
    (gameId: string, mode: EntryMode) => dispatch({ type: 'SET_ENTRY_MODE', gameId, mode }),
    []
  );
  const setPlayerHandicap = useCallback(
    (gameId: string, playerId: string, handicap: number | undefined) =>
      dispatch({ type: 'SET_PLAYER_HANDICAP', gameId, playerId, handicap }),
    []
  );
  const getGame = useCallback((id: string) => state.games.find((g) => g.id === id), [state.games]);

  const value = useMemo<GameStoreValue>(
    () => ({
      games: state.games,
      loaded: state.loaded,
      createGame,
      deleteGame,
      toggleFavorite,
      addPlayer,
      removePlayer,
      addRounds,
      removeRounds,
      restoreStructure,
      setPar,
      setScore,
      setEntryMode,
      setPlayerHandicap,
      getGame,
    }),
    [
      state.games,
      state.loaded,
      createGame,
      deleteGame,
      toggleFavorite,
      addPlayer,
      removePlayer,
      addRounds,
      removeRounds,
      restoreStructure,
      setPar,
      setScore,
      setEntryMode,
      setPlayerHandicap,
      getGame,
    ]
  );

  return <GameStoreContext.Provider value={value}>{children}</GameStoreContext.Provider>;
}

export function useGameStore(): GameStoreValue {
  const ctx = useContext(GameStoreContext);
  if (!ctx) throw new Error('useGameStore must be used within GameStoreProvider');
  return ctx;
}
