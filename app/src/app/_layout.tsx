import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  useEffect(() => {
    hydrate().finally(() => SplashScreen.hideAsync());
  }, []);

  if (!hasHydrated) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="chat/[roomId]" options={{ headerShown: true, title: 'Chat' }} />
    </Stack>
  );
}
