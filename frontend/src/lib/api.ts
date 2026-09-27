/**
 * API client for the frontend.
 *
 * All backend REST calls go through `apiFetch()`, which normalizes error
 * handling and automatically parses JSON. Specific endpoint wrappers
 * (login, register, rooms, contacts, messages, etc.) are exported below.
 */

import { API_BASE_URL } from '@/config';
import { useAuthStore } from '@/store/useAuthStore';

/** Error class carrying the HTTP status code for easy branching in UI code. */
export class ApiError extends Error {
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
    // Auto-logout if token is expired or invalid
    if ((res.status === 401 || res.status === 403) && typeof window !== 'undefined') {
      const headers = options.headers as Record<string, string> | undefined;
      if (headers && (headers['Authorization'] || headers['authorization'])) {
        useAuthStore.getState().logout();
      }
    }
    throw new ApiError(detail, res.status);
  }
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/**
 * Log in with email and password.
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

/** Update the current user's default preferred language in the database. */
export async function updatePreferredLanguage(token: string, preferred_language: string) {
  return apiFetch('/auth/preferred-language', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ preferred_language }),
  });
}

/** Update user profile (username, avatar, about, phone) */
export async function updateProfile(token: string, profile: { username?: string; avatar_url?: string; about?: string; phone?: string }) {
  return apiFetch('/users/profile', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(profile),
  });
}

/** Search users by query */
export async function searchUsers(token: string, query: string) {
  return apiFetch(`/users/search?q=${encodeURIComponent(query)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

/** Fetch a single user's public details (for the profile popup). */
export async function getUserById(token: string, userId: string) {
  return apiFetch(`/users/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

/** Create a new translation room. */
export async function createRoom(
  token: string,
  title: string,
  source_lang?: string,
  target_lang?: string,
  extra?: { description?: string; emoji?: string; avatar_url?: string; is_private?: boolean }
) {
  return apiFetch('/rooms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title,
      source_lang: source_lang || 'en',
      target_lang: target_lang || 'es',
      room_type: 'group',
      description: extra?.description,
      emoji: extra?.emoji || '💬',
      avatar_url: extra?.avatar_url,
      is_private: extra?.is_private || false,
    }),
  });
}

/** Get or create a 1-on-1 direct room between current user and target user */
export async function getOrCreateDirectRoom(token: string, targetUserId: string) {
  return apiFetch(`/rooms/direct/${targetUserId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

/** List all rooms the current user has joined. */
export async function listRooms(token: string) {
  return apiFetch('/rooms', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

/** List public discoverable rooms */
export async function listDiscoverableRooms(token: string) {
  return apiFetch('/rooms/discover', {
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

/** Fetch a single room's detail. */
export async function getRoom(token: string, roomId: string) {
  return apiFetch(`/rooms/${roomId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

/** Fetch historical messages for a room */
export async function getRoomMessages(token: string, roomId: string) {
  return apiFetch(`/rooms/${roomId}/messages`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

/** @deprecated Per-room seat switching removed from chat UI. Use updatePreferredLanguage (Settings) instead. Kept for migration only. */
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

/** Fetch list of participants and their language seats in a room. */
export async function getMembers(token: string, roomId: string) {
  return apiFetch(`/rooms/${roomId}/members`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

/** Contacts API */
export async function listContacts(token: string) {
  return apiFetch('/contacts', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function addContact(token: string, contactUserId: string) {
  return apiFetch(`/contacts/${contactUserId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function removeContact(token: string, contactUserId: string) {
  return apiFetch(`/contacts/${contactUserId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function listContactRequests(token: string) {
  return apiFetch('/contacts/requests', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function sendContactRequest(token: string, targetUserId: string, content?: string) {
  return apiFetch(`/contacts/requests/${targetUserId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ content }),
  });
}

export async function acceptContactRequest(token: string, requestId: string) {
  return apiFetch(`/contacts/requests/${requestId}/accept`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function declineContactRequest(token: string, requestId: string) {
  return apiFetch(`/contacts/requests/${requestId}/decline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}