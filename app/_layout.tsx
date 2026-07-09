import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '@/theme/ThemeContext';
import { GameStoreProvider } from '@/store/GameStore';
import { CourseStoreProvider } from '@/store/CourseStore';
import { PlayerStoreProvider } from '@/store/PlayerStore';

function RootStack() {
  const { theme, isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.surface },
          headerTintColor: theme.text,
          headerTitleStyle: { color: theme.text },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Scorecard' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings', presentation: 'modal' }} />
        <Stack.Screen name="new-game" options={{ title: 'New Game' }} />
        <Stack.Screen name="game/[id]/index" options={{ title: '' }} />
        <Stack.Screen name="game/[id]/edit" options={{ title: 'Edit Game', presentation: 'modal' }} />
        <Stack.Screen name="players" options={{ title: 'Players' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <GameStoreProvider>
          <CourseStoreProvider>
            <PlayerStoreProvider>
              <RootStack />
            </PlayerStoreProvider>
          </CourseStoreProvider>
        </GameStoreProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
