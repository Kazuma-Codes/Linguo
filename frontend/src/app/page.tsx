"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { login, register, getMe, createRoom, joinRoom, listRooms } from '@/lib/api';

export default function HomePage() {
  const router = useRouter();
  const { token, user, setAuth, logout, hasHydrated } = useAuthStore();
  
  // Auth state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Dashboard state
  const [rooms, setRooms] = useState<any[]>([]);
  const [joinRoomId, setJoinRoomId] = useState('');
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('es');
  const [dashboardError, setDashboardError] = useState('');

  useEffect(() => {
    if (token && user) {
      loadRooms();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user]);

  const loadRooms = async () => {
    if (!token) return;
    try {
      const data = await listRooms(token);
      setRooms(Array.isArray(data) ? data : data?.rooms ?? []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      let accessToken;
      if (isLogin) {
        const data = await login(email, password);
        accessToken = data.access_token;
      } else {
        await register(email, password, 'en');
        const data = await login(email, password);
        accessToken = data.access_token;
      }
      const userData = await getMe(accessToken);
      setAuth(accessToken, userData);
      setEmail('');
      setPassword('');
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed. Please try again.');
    }
    setAuthLoading(false);
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setDashboardError('');
    try {
      const room = await createRoom(token, newRoomTitle || 'New Room', sourceLang, targetLang);
      router.push(`/chat/${room.id}`);
    } catch (err: any) {
      setDashboardError(err.message || 'Failed to create room.');
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !joinRoomId.trim()) return;
    setDashboardError('');
    try {
      await joinRoom(token, joinRoomId.trim());
      router.push(`/chat/${joinRoomId.trim()}`);
    } catch (err: any) {
      setDashboardError(err.message || 'Failed to join room.');
    }
  };

  if (!hasHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-700">
          <h1 className="text-3xl font-bold text-center text-white mb-2">Linguo</h1>
          <p className="text-center text-gray-400 mb-8">
            {isLogin ? 'Welcome back. Please login to continue.' : 'Create an account to get started.'}
          </p>
          
          <form onSubmit={handleAuth} className="space-y-4">
            {authError && (
              <div className="bg-red-500/10 border border-red-500 text-red-500 text-sm p-3 rounded-lg text-center">
                {authError}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {authLoading ? 'Processing...' : isLogin ? 'Sign In' : 'Sign Up'}
            </button>
          </form>
          
          <p className="text-center text-sm text-gray-400 mt-6">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 p-4 sticky top-0 z-10 shadow-md">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">
            Linguo Dashboard
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-300 text-sm hidden sm:inline">{user.email}</span>
            <button
              onClick={logout}
              className="text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 px-4 py-2 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 mt-6">
        {dashboardError && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 text-sm p-4 rounded-lg">
            {dashboardError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Create Room Card */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="text-blue-400">✨</span> Create a New Room
            </h2>
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Room Title</label>
                <input
                  type="text"
                  value={newRoomTitle}
                  onChange={(e) => setNewRoomTitle(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. Weekly Meeting"
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm text-gray-400 mb-1">Source Lang</label>
                  <select
                    value={sourceLang}
                    onChange={(e) => setSourceLang(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="ja">Japanese</option>
                    <option value="hi">Hindi</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm text-gray-400 mb-1">Target Lang</label>
                  <select
                    value={targetLang}
                    onChange={(e) => setTargetLang(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="es">Spanish</option>
                    <option value="en">English</option>
                    <option value="fr">French</option>
                    <option value="ja">Japanese</option>
                    <option value="hi">Hindi</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors mt-2"
              >
                Create Room
              </button>
            </form>
          </div>

          {/* Join Room Card */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="text-indigo-400">🔗</span> Join Existing Room
            </h2>
            <form onSubmit={handleJoinRoom} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Room ID</label>
                <input
                  type="text"
                  required
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Enter Room ID"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg transition-colors mt-6"
              >
                Join Room
              </button>
            </form>
          </div>
        </div>

        {/* Room List */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <span className="text-green-400">📚</span> Your Rooms
            </h2>
            <button
              onClick={loadRooms}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Refresh ↻
            </button>
          </div>
          
          {rooms.length === 0 ? (
            <div className="text-center py-10 bg-gray-900/50 rounded-lg border border-gray-700 border-dashed">
              <p className="text-gray-500">You haven&apos;t joined any rooms yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="bg-gray-900 border border-gray-700 rounded-lg p-4 hover:border-gray-500 transition-colors group relative"
                >
                  <h3 className="font-semibold text-lg truncate pr-8">{room.title || 'Untitled Room'}</h3>
                  <p className="text-xs text-gray-500 mt-1 mb-3 font-mono break-all">{room.id}</p>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-400 border border-gray-700">
                      {room.source_lang} ↔ {room.target_lang}
                    </span>
                    <button
                      onClick={() => router.push(`/chat/${room.id}`)}
                      className="text-sm text-blue-400 hover:text-blue-300 font-medium"
                    >
                      Enter →
                    </button>
                  </div>
                  
                  {/* Quick link for live */}
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => router.push(`/live/${room.id}`)}
                      title="Live Call"
                      className="text-gray-400 hover:text-green-400"
                    >
                      🎙️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}