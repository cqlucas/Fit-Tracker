import { isRunningInExpoGo } from 'expo';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';

// Side-effect: abre o SQLite e roda migrations + seed de forma síncrona.
import '@/db/client';
import { LanguageProvider } from '@/context/LanguageContext';
import { syncEngine } from '@/sync/sync.service';
import { colors } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

// SplashScreen.setOptions só é suportado em Development Builds e builds standalone.
// No Expo Go, a tentativa de chamada emite um warning nativo.
if (!isRunningInExpoGo()) {
  SplashScreen.setOptions({
    duration: 400,
    fade: true,
  });
}

const customDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.surfaceLowest,
    text: colors.onSurface,
    border: colors.strokeCrisp,
    primary: colors.primary,
  },
};

export default function RootLayout() {
  useEffect(() => {
    syncEngine.start();
    SplashScreen.hideAsync();
    return () => syncEngine.stop();
  }, []);

  return (
    <LanguageProvider>
      <ThemeProvider value={customDarkTheme}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="add-log-modal"
            options={{
              presentation: 'transparentModal',
              animation: 'fade',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="add-water"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="add-food"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
              headerShown: false,
            }}
          />
        </Stack>
      </ThemeProvider>
    </LanguageProvider>
  );
}
