import Constants from 'expo-constants';

// EXPO_PUBLIC_API_URL=http://192.168.x.x:8000 for Android device (not localhost).
// Falls back to localhost for emulator/web.
const raw =
  process.env.EXPO_PUBLIC_API_URL ||
  (Constants.expoConfig?.extra as any)?.apiUrl ||
  'http://localhost:8000';

const base = raw.replace(/\/+$/, '');
const isWs = base.startsWith('ws://') || base.startsWith('wss://');

function toHttp(u: string) {
  if (u.startsWith('ws://')) return 'http://' + u.slice(5);
  if (u.startsWith('wss://')) return 'https://' + u.slice(6);
  return u;
}
function toWs(u: string) {
  if (u.startsWith('http://')) return 'ws://' + u.slice(7);
  if (u.startsWith('https://')) return 'wss://' + u.slice(8);
  return u;
}

const httpBase = isWs ? toHttp(base) : base;
const wsBase = isWs ? base : toWs(base);

export const API_BASE_URL = httpBase.endsWith('/api/v1') ? httpBase : `${httpBase}/api/v1`;
export const WS_BASE_URL = wsBase;
