import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { useAuthStore } from '@/store/useAuthStore';
import { useThemeStore } from '@/store/useThemeStore';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const hydrateTheme = useThemeStore((s) => s.hydrate);
  const systemScheme = useColorScheme() === 'dark' ? 'dark' : 'light';

  useEffect(() => {
    Promise.all([hydrate(), hydrateTheme(systemScheme)]).finally(() => SplashScreen.hideAsync());
  }, []);

  if (!hasHydrated) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="chat/[roomId]" options={{ headerShown: false, title: 'Chat' }} />
    </Stack>
  );
}
