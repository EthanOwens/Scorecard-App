import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Course } from './types';
import { generateId } from '@/utils/id';

const STORAGE_KEY = 'courses_v1';

interface State {
  courses: Course[];
  loaded: boolean;
}

type Action = { type: 'LOAD'; courses: Course[] } | { type: 'UPSERT'; name: string; pars: (number | null)[] };

function normalize(name: string): string {
  return name.trim().toLowerCase();
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOAD':
      return { courses: action.courses, loaded: true };
    case 'UPSERT': {
      const existing = state.courses.find((c) => normalize(c.name) === normalize(action.name));
      if (existing) {
        return {
          ...state,
          courses: state.courses.map((c) => (c.id === existing.id ? { ...c, pars: action.pars } : c)),
        };
      }
      const course: Course = { id: generateId(), name: action.name.trim(), pars: action.pars };
      return { ...state, courses: [...state.courses, course] };
    }
    default:
      return state;
  }
}

interface CourseStoreValue {
  courses: Course[];
  loaded: boolean;
  upsertCourse: (name: string, pars: (number | null)[]) => void;
  findCourseByName: (name: string) => Course | undefined;
}

const CourseStoreContext = createContext<CourseStoreValue | undefined>(undefined);

export function CourseStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { courses: [], loaded: false });

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const courses: Course[] = raw ? JSON.parse(raw) : [];
        dispatch({ type: 'LOAD', courses });
      } catch {
        dispatch({ type: 'LOAD', courses: [] });
      }
    })();
  }, []);

  useEffect(() => {
    if (!state.loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state.courses)).catch(() => {});
  }, [state.courses, state.loaded]);

  const upsertCourse = useCallback(
    (name: string, pars: (number | null)[]) => {
      if (!name.trim()) return;
      dispatch({ type: 'UPSERT', name, pars });
    },
    []
  );

  const findCourseByName = useCallback(
    (name: string) => state.courses.find((c) => normalize(c.name) === normalize(name)),
    [state.courses]
  );

  const value = useMemo<CourseStoreValue>(
    () => ({ courses: state.courses, loaded: state.loaded, upsertCourse, findCourseByName }),
    [state.courses, state.loaded, upsertCourse, findCourseByName]
  );

  return <CourseStoreContext.Provider value={value}>{children}</CourseStoreContext.Provider>;
}

export function useCourseStore(): CourseStoreValue {
  const ctx = useContext(CourseStoreContext);
  if (!ctx) throw new Error('useCourseStore must be used within CourseStoreProvider');
  return ctx;
}
