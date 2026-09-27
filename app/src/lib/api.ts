import { API_BASE_URL } from './config';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function apiFetch(path: string, token?: string | null, options: RequestInit = {}): Promise<any> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch {
    throw new ApiError('Unable to connect to server. Check EXPO_PUBLIC_API_URL.', 0);
  }
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      detail = body.message ?? body.detail ?? detail;
    } catch {}
    throw new ApiError(detail, res.status);
  }
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export async function login(email: string, password: string) {
  const form = new URLSearchParams();
  form.append('username', email);
  form.append('password', password);
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  if (!res.ok) throw new ApiError('Incorrect email or password', res.status);
  return res.json();
}

export async function register(email: string, password: string, preferred_language = 'en') {
  return apiFetch('/auth/register', null, {
    method: 'POST',
    body: JSON.stringify({ email, password, preferred_language }),
  });
}

export const getMe = (token: string) => apiFetch('/auth/me', token);
export const updatePreferredLanguage = (token: string, preferred_language: string) =>
  apiFetch('/auth/preferred-language', token, { method: 'PATCH', body: JSON.stringify({ preferred_language }) });

export const updateProfile = (
  token: string,
  profile: { username?: string; avatar_url?: string; about?: string; phone?: string },
) => apiFetch('/users/profile', token, { method: 'PATCH', body: JSON.stringify(profile) });

export const listRooms = (token: string) => apiFetch('/rooms', token);
export const listDiscoverableRooms = (token: string) => apiFetch('/rooms/discover', token);
export const createRoom = (token: string, title: string, source_lang = 'en') =>
  apiFetch('/rooms', token, { method: 'POST', body: JSON.stringify({ title, source_lang, room_type: 'group' }) });
export const joinRoom = (token: string, roomId: string) =>
  apiFetch(`/rooms/${roomId}/join`, token, { method: 'POST' });
export const getRoom = (token: string, roomId: string) => apiFetch(`/rooms/${roomId}`, token);
export const getRoomMessages = (token: string, roomId: string) => apiFetch(`/rooms/${roomId}/messages`, token);
export const getOrCreateDirectRoom = (token: string, targetUserId: string) =>
  apiFetch(`/rooms/direct/${targetUserId}`, token, { method: 'POST' });
export const searchUsers = (token: string, q: string) => apiFetch(`/users/search?q=${encodeURIComponent(q)}`, token);
export const listContacts = (token: string) => apiFetch('/contacts', token).catch(() => []);
export const listContactRequests = (token: string) => apiFetch('/contacts/requests', token).catch(() => []);
export const acceptContactRequest = (token: string, requestId: string) =>
  apiFetch(`/contacts/requests/${requestId}/accept`, token, { method: 'POST' });
export const declineContactRequest = (token: string, requestId: string) =>
  apiFetch(`/contacts/requests/${requestId}/decline`, token, { method: 'POST' });
