"use client";

import React, { useState } from 'react';
import { Icons } from '@/lib/icons';
import { MergedAvatar } from '@/components/common/MergedAvatar';
import { User } from '@/store/useAuthStore';
import { LanguageOption } from '@/lib/languages';
import { EditAvatarModal } from './EditAvatarModal';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onUpdateProfile: (
    data: { username?: string; avatar_url?: string; about?: string; phone?: string; show_online?: boolean; read_receipts?: boolean },
    silent?: boolean,
  ) => void;
  onUpdateLanguage: (lang: string) => void;
  availableLanguages: LanguageOption[];
  theme: string;
  onToggleTheme: () => void;
  onLogout: () => void;
  chatsCount?: number;
  contactsCount?: number;
  groupsCount?: number;
}

export function ProfileModal({
  isOpen,
  onClose,
  user,
  onUpdateProfile,
  onUpdateLanguage,
  availableLanguages,
  theme,
  onToggleTheme,
  onLogout,
  chatsCount = 6,
  contactsCount = 5,
  groupsCount = 2,
}: ProfileModalProps) {
  const [subView, setSubView] = useState<'main' | 'edit_profile' | 'security' | 'notifications' | 'privacy'>('main');
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  // Edit profile form state
  const [username, setUsername] = useState(user.username || user.email.split('@')[0]);
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url || '');
  const [about, setAbout] = useState(user.about || 'Product designer · coffee first, pixels second.');
  const [phone, setPhone] = useState(user.phone || '');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Preferences toggles (persisted to backend; default true for existing accounts)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [onlineStatusPublic, setOnlineStatusPublic] = useState(user.show_online !== false);
  const [readReceipts, setReadReceipts] = useState(user.read_receipts !== false);

  if (!isOpen) return null;

  const handleSaveProfile = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onUpdateProfile({
      username: username.trim(),
      avatar_url: avatarUrl.trim(),
      about: about.trim(),
      phone: phone.trim(),
    });
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setSubView('main');
    }, 1200);
  };

  const handleSaveAvatarDirect = (newUrl: string) => {
    setAvatarUrl(newUrl);
    onUpdateProfile({
      avatar_url: newUrl,
      username: username.trim(),
      about: about.trim(),
      phone: phone.trim(),
    });
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl max-w-sm sm:max-w-md w-full shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
          
          {/* Top modal navigation bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)] flex-none bg-[var(--card)] z-10">
            {subView !== 'main' ? (
              <button
                type="button"
                onClick={() => setSubView('main')}
                className="flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
              >
                <Icons.back className="w-4 h-4" />
                <span>Back</span>
              </button>
            ) : (
              <h3 className="font-bold text-sm text-[var(--muted)] tracking-wider uppercase">Profile</h3>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-full text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer ml-auto"
            >
              <Icons.x className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Content Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {subView === 'main' && (
              <>
                {/* 1. TOP PROFILE CARD (Matches Image 3) */}
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl overflow-hidden shadow-xs">
                  {/* Banner */}
                  <div className="h-20 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-blue-950/40 w-full" />

                  {/* Avatar & Info */}
                  <div className="px-5 pb-5 flex flex-col items-center text-center -mt-12">
                    {/* Hero Avatar with Edit Badge */}
                    <div className="relative group">
                      <div className="ring-4 ring-[var(--card)] rounded-full shadow-md bg-[var(--card)]">
                        <MergedAvatar
                          name={username || user.email}
                          avatarUrl={avatarUrl || user.avatar_url}
                          size="2xl"
                          shape="circle"
                          online={user.show_online !== false}
                        />
                      </div>

                      {/* Clickable Camera Edit Button */}
                      <button
                        type="button"
                        onClick={() => setShowAvatarModal(true)}
                        className="absolute bottom-1 right-1 p-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-transform hover:scale-110 cursor-pointer ring-2 ring-[var(--card)]"
                        title="Edit profile picture"
                      >
                        <Icons.camera className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Name & Email */}
                    <div className="mt-3">
                      <h3 className="text-xl font-bold tracking-tight text-[var(--text)]">
                        {username || 'Kazuma'}
                      </h3>
                      <p className="text-xs text-[var(--muted)] mt-0.5">
                        {user.email || 'kazuma@nexa.app'}
                      </p>
                    </div>

                    {/* Bio / Tagline */}
                    <p className="text-xs text-[var(--text)] opacity-90 mt-2 max-w-xs font-normal">
                      {about || 'Product designer · coffee first, pixels second.'}
                    </p>

                    {/* Stats Row: 3 metric pills */}
                    <div className="grid grid-cols-3 gap-2.5 w-full mt-4">
                      <div className="bg-[var(--bg-subtle)] border border-[var(--border)] rounded-2xl py-2.5 px-2 text-center">
                        <span className="block text-base font-bold text-[var(--text)]">
                          {chatsCount}
                        </span>
                        <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">
                          Chats
                        </span>
                      </div>
                      <div className="bg-[var(--bg-subtle)] border border-[var(--border)] rounded-2xl py-2.5 px-2 text-center">
                        <span className="block text-base font-bold text-[var(--text)]">
                          {contactsCount}
                        </span>
                        <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">
                          Contacts
                        </span>
                      </div>
                      <div className="bg-[var(--bg-subtle)] border border-[var(--border)] rounded-2xl py-2.5 px-2 text-center">
                        <span className="block text-base font-bold text-[var(--text)]">
                          {groupsCount}
                        </span>
                        <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">
                          Groups
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. LOWER MENU CARD (Matches Image 3) */}
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl overflow-hidden divide-y divide-[var(--border)] shadow-xs">
                  {/* Edit profile */}
                  <button
                    type="button"
                    onClick={() => setSubView('edit_profile')}
                    className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer group text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center flex-none">
                        <Icons.user className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-[var(--text)]">Edit profile</h4>
                        <p className="text-xs text-[var(--muted)]">Photo, username, about</p>
                      </div>
                    </div>
                    <Icons.chevR className="w-4 h-4 text-[var(--muted)] group-hover:text-[var(--text)] group-hover:translate-x-0.5 transition-all" />
                  </button>

                  {/* Security */}
                  <button
                    type="button"
                    onClick={() => setSubView('security')}
                    className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer group text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[var(--bg-subtle)] text-[var(--muted)] flex items-center justify-center flex-none border border-[var(--border)]">
                        <Icons.lock className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-[var(--text)]">Security</h4>
                        <p className="text-xs text-[var(--muted)]">Password, email, sessions</p>
                      </div>
                    </div>
                    <Icons.chevR className="w-4 h-4 text-[var(--muted)] group-hover:text-[var(--text)] group-hover:translate-x-0.5 transition-all" />
                  </button>

                  {/* Notifications */}
                  <button
                    type="button"
                    onClick={() => setSubView('notifications')}
                    className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer group text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[var(--bg-subtle)] text-[var(--muted)] flex items-center justify-center flex-none border border-[var(--border)]">
                        <Icons.bell className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-[var(--text)]">Notifications</h4>
                        <p className="text-xs text-[var(--muted)]">Message & group alerts</p>
                      </div>
                    </div>
                    <Icons.chevR className="w-4 h-4 text-[var(--muted)] group-hover:text-[var(--text)] group-hover:translate-x-0.5 transition-all" />
                  </button>

                  {/* Appearance */}
                  <button
                    type="button"
                    onClick={onToggleTheme}
                    className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer group text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[var(--bg-subtle)] text-[var(--muted)] flex items-center justify-center flex-none border border-[var(--border)]">
                        <Icons.contrast className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-[var(--text)]">Appearance</h4>
                        <p className="text-xs text-[var(--muted)]">
                          {theme === 'dark' ? 'Dark mode' : 'Light mode'}
                        </p>
                      </div>
                    </div>
                    <Icons.chevR className="w-4 h-4 text-[var(--muted)] group-hover:text-[var(--text)] group-hover:translate-x-0.5 transition-all" />
                  </button>

                  {/* Privacy */}
                  <button
                    type="button"
                    onClick={() => setSubView('privacy')}
                    className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer group text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[var(--bg-subtle)] text-[var(--muted)] flex items-center justify-center flex-none border border-[var(--border)]">
                        <Icons.shield className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-[var(--text)]">Privacy</h4>
                        <p className="text-xs text-[var(--muted)]">Last seen, online status, requests</p>
                      </div>
                    </div>
                    <Icons.chevR className="w-4 h-4 text-[var(--muted)] group-hover:text-[var(--text)] group-hover:translate-x-0.5 transition-all" />
                  </button>
                </div>

                {/* Log Out button */}
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full py-3 rounded-2xl text-xs font-bold text-red-500 hover:bg-red-500/10 border border-red-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Icons.logout className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              </>
            )}

            {/* SUB-VIEW: EDIT PROFILE */}
            {subView === 'edit_profile' && (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                {/* Photo Row */}
                <div className="p-4 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border)] flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <MergedAvatar
                      name={username || user.email}
                      avatarUrl={avatarUrl}
                      size="lg"
                      shape="circle"
                      online={true}
                    />
                    <div>
                      <h4 className="text-sm font-bold text-[var(--text)]">Profile Photo</h4>
                      <p className="text-xs text-[var(--muted)]">Visible to all contacts</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAvatarModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Change Photo
                  </button>
                </div>

                {/* Username input */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1">
                    Display Name / Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Kazuma"
                    className="w-full bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-medium"
                  />
                </div>

                {/* About / Bio input */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1">
                    About / Bio
                  </label>
                  <textarea
                    rows={3}
                    value={about}
                    onChange={(e) => setAbout(e.target.value)}
                    placeholder="Product designer · coffee first, pixels second."
                    className="w-full bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none font-medium"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 234-5678"
                    className="w-full bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-medium"
                  />
                </div>

                {/* Email (Readonly) */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1">
                    Account Email
                  </label>
                  <input
                    type="text"
                    disabled
                    value={user.email}
                    className="w-full bg-[var(--bg-subtle)]/50 border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--muted)] cursor-not-allowed"
                  />
                </div>

                {/* Submit button */}
                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSubView('main')}
                    className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-xs font-semibold hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                  >
                    {saveSuccess ? 'Saved ✓' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}

            {/* SUB-VIEW: SECURITY */}
            {subView === 'security' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border)] space-y-2">
                  <h4 className="text-sm font-bold text-[var(--text)]">Active Account</h4>
                  <p className="text-xs text-[var(--muted)]">Logged in as {user.email}</p>
                  <div className="pt-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Session Verified & Encrypted
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border)] space-y-2">
                  <h4 className="text-sm font-bold text-[var(--text)]">Password & Authentication</h4>
                  <p className="text-xs text-[var(--muted)]">
                    Password was last set during registration. Token expires periodically and auto-refreshes.
                  </p>
                </div>
              </div>
            )}

            {/* SUB-VIEW: NOTIFICATIONS */}
            {subView === 'notifications' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border)]">
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--text)]">Message Alerts</h4>
                    <p className="text-xs text-[var(--muted)]">Sound and preview when receiving messages</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationsEnabled}
                    onChange={(e) => setNotificationsEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* SUB-VIEW: PRIVACY */}
            {subView === 'privacy' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border)]">
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--text)]">Online Presence</h4>
                    <p className="text-xs text-[var(--muted)]">Display green badge when online</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={onlineStatusPublic}
                    onChange={(e) => {
                      setOnlineStatusPublic(e.target.checked);
                      onUpdateProfile({ show_online: e.target.checked }, true);
                    }}
                    className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border)]">
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--text)]">Read Receipts</h4>
                    <p className="text-xs text-[var(--muted)]">Show double blue checks on delivery</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={readReceipts}
                    onChange={(e) => {
                      setReadReceipts(e.target.checked);
                      onUpdateProfile({ read_receipts: e.target.checked }, true);
                    }}
                    className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                  />
                </div>
                <p className="text-[11px] text-[var(--muted)]">
                  Turning read receipts off also stops sending them — others won&apos;t see when you read.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Avatar Modal */}
      {
        showAvatarModal && (


      <EditAvatarModal
        isOpen={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        currentAvatarUrl={avatarUrl || user.avatar_url || ''}

        name={username || user.email}
        onSaveAvatar={handleSaveAvatarDirect}
      />
          )}
    </>
  );
}
