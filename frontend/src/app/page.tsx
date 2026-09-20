"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useThemeStore } from '@/store/useThemeStore';
import { login, register, getMe, createRoom, joinRoom, listRooms, updatePreferredLanguage } from '@/lib/api';
import { SUPPORTED_LANGUAGES } from '@/lib/languages';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { CreateRoomCard } from '@/components/dashboard/CreateRoomCard';
import { JoinRoomCard } from '@/components/dashboard/JoinRoomCard';
import { RoomListCard } from '@/components/dashboard/RoomListCard';
import { LogoutConfirmModal } from '@/components/common/LogoutConfirmModal';

function extractRoomId(input: string): string {
  const trimmed = input.trim();
  const uuidMatch = trimmed.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
  if (uuidMatch) return uuidMatch[0];
  if (trimmed.includes('/chat/')) {
    const afterChat = trimmed.split('/chat/')[1];
    return afterChat.split(/[?#/]/)[0].trim();
  }
  return trimmed;
}

export default function HomePage() {
  const router = useRouter();
  const { token, user, setAuth, updatePreferredLanguage: setStoreLang, logout, hasHydrated } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  // Auth state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Dashboard state
  const [rooms, setRooms] = useState<any[]>([]);
  const [joinRoomId, setJoinRoomId] = useState('');
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [dashboardError, setDashboardError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    if (token && user) {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const redirect = params.get('redirect');
        if (redirect && redirect.startsWith('/')) {
          router.push(redirect);
          return;
        }
      }
      loadRooms();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2800);
  };

  const loadRooms = async () => {
    if (!token) return;
    setIsRefreshing(true);
    try {
      const data = await listRooms(token);
      setRooms(Array.isArray(data) ? data : data?.rooms ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLanguageChange = async (newLang: string) => {
    if (!token) return;
    try {
      await updatePreferredLanguage(token, newLang);
      setStoreLang(newLang);
      const name = SUPPORTED_LANGUAGES.find((l) => l.code === newLang)?.name || newLang;
      showToast(`🌐 Preferred language set to ${name}`);
    } catch (err: any) {
      console.error('Failed to update preferred language', err);
      showToast('Failed to update language');
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!email.trim()) {
      setAuthError('Email is required.');
      return;
    }
    if (!password) {
      setAuthError('Password is required.');
      return;
    }
    if (password.length < 8) {
      setAuthError('Password must be at least 8 characters.');
      return;
    }

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

      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const redirect = params.get('redirect');
        if (redirect && redirect.startsWith('/')) {
          router.push(redirect);
          return;
        }
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setDashboardError('');
    try {
      const title = newRoomTitle.trim() || 'New Room';
      const myLang = user?.preferred_language || 'en';
      const room = await createRoom(token, title, myLang, myLang === 'en' ? 'es' : 'en');
      showToast(`✨ Room "${title}" created`);
      router.push(`/chat/${room.id}`);
    } catch (err: any) {
      setDashboardError(err.message || 'Failed to create room.');
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = extractRoomId(joinRoomId);
    if (!token || !cleanId) return;
    setDashboardError('');
    try {
      await joinRoom(token, cleanId);
      showToast(`🔗 Joined room ${cleanId}`);
      router.push(`/chat/${cleanId}`);
    } catch (err: any) {
      setDashboardError(err.message || 'Failed to join room. Please check the code.');
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`📋 ${label} copied to clipboard`);
    } catch {
      showToast(`📋 ${text}`);
    }
  };

  if (!hasHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg)] text-[var(--muted)]">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>Loading Mosaic...</span>
        </div>
      </div>
    );
  }

  // 1. AUTH SCREEN (when user is not authenticated)
  if (!user) {
    return (
      <AuthScreen
        isLogin={isLogin}
        setIsLogin={setIsLogin}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        authError={authError}
        authLoading={authLoading}
        handleAuth={handleAuth}
        theme={theme}
        toggleTheme={toggleTheme}
      />
    );
  }

  // 2. DASHBOARD SCREEN (when authenticated)
  return (
    <div className="min-h-screen bg-[var(--dashboard-bg)] text-[var(--text)] transition-colors duration-200">
      <DashboardHeader
        userEmail={user.email}
        preferredLanguage={user.preferred_language || 'en'}
        availableLanguages={SUPPORTED_LANGUAGES}
        onLanguageChange={handleLanguageChange}
        theme={theme}
        onToggleTheme={toggleTheme}
        onLogoutClick={() => setShowLogoutModal(true)}
      />

      <main className="max-w-6xl mx-auto p-4 sm:p-8 space-y-8">
        {dashboardError && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-sm p-4 rounded-xl flex items-center justify-between">
            <span>{dashboardError}</span>
            <button onClick={() => setDashboardError('')} className="font-bold text-red-500 ml-4 cursor-pointer">✕</button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[7fr_5fr] gap-6 items-start">
          <div className="space-y-6">
            <CreateRoomCard
              roomTitle={newRoomTitle}
              setRoomTitle={setNewRoomTitle}
              onSubmit={handleCreateRoom}
            />

            <JoinRoomCard
              joinRoomId={joinRoomId}
              setJoinRoomId={setJoinRoomId}
              onSubmit={handleJoinRoom}
            />
          </div>

          <RoomListCard
            rooms={rooms}
            isRefreshing={isRefreshing}
            onRefresh={loadRooms}
            onCopyRoomId={(id) => copyToClipboard(id, 'Room ID')}
            onEnterRoom={(id) => router.push(`/chat/${id}`)}
          />
        </div>
      </main>

      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={() => {
          setShowLogoutModal(false);
          logout();
        }}
      />

      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[var(--card)] text-[var(--text)] border border-[var(--border)] px-4 py-2.5 rounded-full shadow-xl text-sm font-semibold flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}