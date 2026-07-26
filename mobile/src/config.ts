const IP = process.env.EXPO_PUBLIC_API_IP ?? '10.0.2.2'; // Android emulator default; set EXPO_PUBLIC_API_IP for physical devices
export const API = process.env.EXPO_PUBLIC_API_URL ?? `http://${IP}:8000/api/v1`;
export const WS = process.env.EXPO_PUBLIC_WS_URL ?? `ws://${IP}:8000/api/v1/ws/chat`;
export const MINIO = process.env.EXPO_PUBLIC_MINIO_URL ?? `http://${IP}:9000`;