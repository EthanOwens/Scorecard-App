import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PlayerProfile } from './types';
import { generateId } from '@/utils/id';

const STORAGE_KEY = 'player_profiles_v1';

interface State {
  profiles: PlayerProfile[];
  loaded: boolean;
}

type Action =
  | { type: 'LOAD'; profiles: PlayerProfile[] }
  | { type: 'CREATE'; profile: PlayerProfile }
  | { type: 'DELETE'; id: string }
  | { type: 'UPDATE_NAME'; id: string; name: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOAD':
      return { profiles: action.profiles, loaded: true };
    case 'CREATE':
      return { ...state, profiles: [...state.profiles, action.profile] };
    case 'DELETE':
      return { ...state, profiles: state.profiles.filter((p) => p.id !== action.id) };
    case 'UPDATE_NAME':
      return {
        ...state,
        profiles: state.profiles.map((p) =>
          p.id === action.id ? { ...p, name: action.name } : p
        ),
      };
    default:
      return state;
  }
}

interface PlayerStoreValue {
  profiles: PlayerProfile[];
  loaded: boolean;
  createProfile: (name: string) => PlayerProfile;
  deleteProfile: (id: string) => void;
  updateProfileName: (id: string, name: string) => void;
}

const PlayerStoreContext = createContext<PlayerStoreValue | undefined>(undefined);

export function PlayerStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { profiles: [], loaded: false });

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const profiles: PlayerProfile[] = raw ? JSON.parse(raw) : [];
        dispatch({ type: 'LOAD', profiles });
      } catch {
        dispatch({ type: 'LOAD', profiles: [] });
      }
    })();
  }, []);

  useEffect(() => {
    if (!state.loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state.profiles)).catch(() => {});
  }, [state.profiles, state.loaded]);

  const createProfile = useCallback((name: string): PlayerProfile => {
    const profile: PlayerProfile = { id: generateId(), name, createdAt: Date.now() };
    dispatch({ type: 'CREATE', profile });
    return profile;
  }, []);

  const deleteProfile = useCallback((id: string) => dispatch({ type: 'DELETE', id }), []);

  const updateProfileName = useCallback(
    (id: string, name: string) => dispatch({ type: 'UPDATE_NAME', id, name }),
    []
  );

  const value = useMemo<PlayerStoreValue>(
    () => ({ profiles: state.profiles, loaded: state.loaded, createProfile, deleteProfile, updateProfileName }),
    [state.profiles, state.loaded, createProfile, deleteProfile, updateProfileName]
  );

  return <PlayerStoreContext.Provider value={value}>{children}</PlayerStoreContext.Provider>;
}

export function usePlayerStore(): PlayerStoreValue {
  const ctx = useContext(PlayerStoreContext);
  if (!ctx) throw new Error('usePlayerStore must be used within PlayerStoreProvider');
  return ctx;
}
