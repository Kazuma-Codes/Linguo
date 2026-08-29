/**
 * API client for the frontend.
 *
 * All backend REST calls go through `apiFetch()`, which normalizes error
 * handling and automatically parses JSON. Specific endpoint wrappers
 * (login, register, etc.) are exported below.
 */

import { API_BASE_URL } from '@/config';

/** Error class carrying the HTTP status code for easy branching in UI code. */
class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** Fetch wrapper that throws ApiError on non-2xx responses with automatic retry on network disconnects. */
async function apiFetch(path: string, options: RequestInit = {}, retries = 1): Promise<any> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, options);
  } catch (err: any) {
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return apiFetch(path, options, retries - 1);
    }
    throw new ApiError(
      'Unable to connect to server. Please check your network connection.',
      0,
    );
  }

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      detail = body.message ?? body.detail ?? detail;
    } catch {
      // response wasn't JSON — keep generic message
    }
    throw new ApiError(detail, res.status);
  }
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/**
 * Log in with email and password.
 *
 * Uses form-urlencoded with a `username` field, matching FastAPI's standard
 * OAuth2PasswordRequestForm. If your backend instead expects JSON {email, password},
 * switch the body/headers accordingly.
 */
export async function login(email: string, password: string) {
  const formData = new URLSearchParams();
  formData.append('username', email);
  formData.append('password', password);

  return apiFetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
  });
}

/** Register a new account. */
export async function register(email: string, password: string, preferred_language: string = 'en') {
  return apiFetch('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, preferred_language }),
  });
}

/** Fetch the current user's profile. */
export async function getMe(token: string) {
  return apiFetch('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

/** Create a new translation room. */
export async function createRoom(
  token: string,
  title: string,
  source_lang: string,
  target_lang: string,
) {
  return apiFetch('/rooms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ title, source_lang, target_lang }),
  });
}

/** List all rooms the current user has joined. */
export async function listRooms(token: string) {
  return apiFetch('/rooms', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

/** Join an existing room by its ID. */
export async function joinRoom(token: string, roomId: string) {
  return apiFetch(`/rooms/${roomId}/join`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

/** Fetch a single room's detail, including the current user's seat (my_language). */
export async function getRoom(token: string, roomId: string) {
  return apiFetch(`/rooms/${roomId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

/** Change the current user's seat in a room (the "⇄ I speak …" swap button). */
export async function setMyLanguage(token: string, roomId: string, language: string) {
  return apiFetch(`/rooms/${roomId}/set-language`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ language }),
  });
}