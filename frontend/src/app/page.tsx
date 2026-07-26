"use client";
import { useState } from 'react';
import { login, register, createRoom, getMe } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [joinRoomInput, setJoinRoomInput] = useState('');

  const { setAuth, token, user, logout, hasHydrated } = useAuthStore();
  const router = useRouter();

  if (!hasHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      if (isRegistering) {
        await register(email, password);
      }
      // Always call login to receive a valid JWT access token
      const res = await login(email, password);
      const userData = await getMe(res.access_token);
      setAuth(res.access_token, userData);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || token === 'undefined') {
      logout();
      setError('Session expired or invalid token. Please log in again.');
      return;
    }
    setError('');
    setIsCreatingRoom(true);
    try {
      const room = await createRoom(token, "Main Chat", "es");
      router.push(`/chat/${room.id}`);
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes('401')) {
        logout();
        setError('Session expired. Please log in again.');
      } else {
        setError(msg);
      }
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const isAuthenticated = token && token !== 'undefined';

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <form onSubmit={handleAuth} className="bg-gray-800 p-8 rounded-lg shadow-xl w-96">
          <h1 className="text-2xl font-bold mb-6 text-center">{isRegistering ? 'Register' : 'Login'}</h1>
          {error && <p className="text-red-400 mb-4 text-sm bg-red-900/30 p-2 rounded border border-red-800">{error}</p>}
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-2 mb-4 bg-gray-700 rounded" required />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-2 mb-6 bg-gray-700 rounded" required />
          <button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 p-2 rounded font-semibold">
            {isLoading ? 'Processing...' : isRegistering ? 'Register' : 'Login'}
          </button>
          <p className="text-center mt-4 text-sm text-gray-400">
            {isRegistering ? 'Already have an account?' : "Need an account?"}
            <button type="button" onClick={() => { setIsRegistering(!isRegistering); setError(''); }} className="text-blue-400 ml-1">
              {isRegistering ? 'Login' : 'Register'}
            </button>
          </p>
        </form>
      </div>
    );
  }

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = joinRoomInput.trim();
    if (!trimmed) return;
    // Extract UUID if full URL was pasted
    const match = trimmed.match(/([a-f0-9-]{36})/i);
    const roomId = match ? match[1] : trimmed;
    router.push(`/chat/${roomId}`);
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-96 text-center">
        <h1 className="text-2xl font-bold mb-2">Welcome, {user?.email}</h1>
        <p className="text-gray-400 mb-6">You are authenticated. Create or join a translation room.</p>
        {error && <p className="text-red-400 mb-4 text-sm bg-red-900/30 p-2 rounded border border-red-800">{error}</p>}
        
        <form onSubmit={handleCreateRoom}>
          <button type="submit" disabled={isCreatingRoom} className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 p-3 rounded font-semibold mb-4">
            {isCreatingRoom ? 'Creating Room...' : 'Create English → Spanish Room'}
          </button>
        </form>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-gray-700"></div>
          <span className="flex-shrink mx-2 text-xs text-gray-500">OR</span>
          <div className="flex-grow border-t border-gray-700"></div>
        </div>

        <form onSubmit={handleJoinRoom} className="mt-2 mb-4 space-y-2">
          <input
            type="text"
            placeholder="Paste Room URL or Room ID..."
            value={joinRoomInput}
            onChange={(e) => setJoinRoomInput(e.target.value)}
            className="w-full p-2 bg-gray-700 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!joinRoomInput.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 p-2 rounded font-semibold text-sm"
          >
            Join Room
          </button>
        </form>

        <button type="button" onClick={() => logout()} className="text-sm text-gray-400 hover:text-white underline">
          Log out
        </button>
      </div>
    </div>
  );
}