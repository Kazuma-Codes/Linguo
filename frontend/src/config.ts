/**
 * Centralized configuration for the frontend app.
 *
 * All API and WebSocket URLs are defined here and imported by other modules.
 * Set NEXT_PUBLIC_API_URL and NEXT_PUBLIC_WS_URL for production.
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8000';

/** Backend REST API base URL (e.g. "https://your-app.onrender.com/api/v1") */
export const API_BASE_URL = BACKEND_URL.endsWith('/api/v1') ? BACKEND_URL : `${BACKEND_URL}/api/v1`;

/** Backend WebSocket base URL (e.g. "wss://your-app.onrender.com") */
export const WS_BASE_URL = WS_URL;

/** MinIO object storage base URL */
export const MINIO_BASE_URL = process.env.NEXT_PUBLIC_MINIO_URL ?? 'http://localhost:9000';
