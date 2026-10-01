// allows user to personalize the account like adding image of both the individual and group
"use client";

import React, { useState, useRef } from 'react';
import { Icons } from '@/lib/icons';
import { MergedAvatar } from '@/components/common/MergedAvatar';
import { AvatarCropperPopup } from '@/components/common/AvatarCropper';
import { AVATAR_PRESETS } from '@/lib/avatarPresets';

interface EditAvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatarUrl?: string| null;
  name: string;
  onSaveAvatar: (newAvatarUrl: string) => void;
}

export function EditAvatarModal({
  isOpen,
  onClose,
  currentAvatarUrl = '',
  name,
  onSaveAvatar,
}: EditAvatarModalProps) {
  const safeCurrentUrl = currentAvatarUrl || '';
  const [activeTab, setActiveTab] = useState<'upload' | 'presets' | 'url'>('upload');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const[selectedAvatar,setSelectedAvatar] = useState<string>(safeCurrentUrl);
  const [urlInput,setUrlInput] = useState<string>(safeCurrentUrl.startsWith('http') ? safeCurrentUrl: '');
  const [pendingSrc, setPendingSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    if (!file.type.startsWith('image/')) {
      setUploadError('Please upload an image file (JPG, PNG, WebP)');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (pendingSrc) URL.revokeObjectURL(pendingSrc);
    setPendingSrc(URL.createObjectURL(file));
  };

  const closeCropper = () => {
    if (pendingSrc) URL.revokeObjectURL(pendingSrc);
    setPendingSrc(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCropperFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (pendingSrc) URL.revokeObjectURL(pendingSrc);
    setPendingSrc(URL.createObjectURL(file));
  };

  const handleApplyUrl = () => {
    if (!urlInput.trim()) return;
    setSelectedAvatar(urlInput.trim());
  };

  const handleSave = () => {
    onSaveAvatar(selectedAvatar);
    onClose();
  };

  const handleRemoveAvatar = () => {
    setSelectedAvatar('');
  };

  return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <Icons.camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[var(--text)]">Edit Profile Picture</h3>
              <p className="text-xs text-[var(--muted)]">Upload a photo or choose a preset</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
          >
            <Icons.x className="w-5 h-5" />
          </button>
        </div>

        {/* Live Preview Card */}
        <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border)] space-y-3">
          <div className="relative group">
            <MergedAvatar
              name={name}
              avatarUrl={selectedAvatar}
              size="2xl"
              shape="circle"
              online={true}
              className="ring-4 ring-[var(--card)] shadow-lg"
            />
          </div>
          <div className="text-center">
            <span className="text-xs font-semibold text-[var(--text)] block">
              {selectedAvatar ? 'Selected Avatar Preview' : 'Initials Default Preview'}
            </span>
            <span className="text-[11px] text-[var(--muted)]">Shown across chats & your profile</span>
          </div>

          {selectedAvatar && (
            <button
              type="button"
              onClick={handleRemoveAvatar}
              className="text-xs text-red-500 hover:text-red-600 font-semibold hover:underline cursor-pointer pt-1"
            >
              Remove custom photo
            </button>
          )}
        </div>

        {/* Option Tabs */}
        <div className="flex rounded-xl bg-[var(--bg-subtle)] p-1 border border-[var(--border)] text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-[var(--card)] text-[var(--text)] shadow-xs'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            Upload Photo
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'presets'
                ? 'bg-[var(--card)] text-[var(--text)] shadow-xs'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            Presets
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'url'
                ? 'bg-[var(--card)] text-[var(--text)] shadow-xs'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            Image Link
          </button>
        </div>

        {/* Tab 1: Upload → fixed crop popup (also used for group avatars) */}
        {activeTab === 'upload' && (
          <div className="space-y-3">
            <label className="border-2 border-dashed border-[var(--border)] hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer hover:bg-[var(--bg-subtle)] transition-all flex flex-col items-center space-y-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="sr-only"
              />
              <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center pointer-events-none">
                <Icons.upload className="w-6 h-6" />
              </div>
              <div className="pointer-events-none">
                <p className="text-xs font-bold text-[var(--text)]">Tap to upload a picture</p>
                <p className="text-[11px] text-[var(--muted)] mt-0.5">
                  PNG, JPG, or WebP. You&apos;ll crop it next.
                </p>
              </div>
            </label>
            {uploadError && (
              <p className="text-xs text-red-500 font-medium text-center">{uploadError}</p>
            )}
          </div>
        )}

        {/* Fixed crop popup — tick applies, X cancels */}
        {pendingSrc && (
          <AvatarCropperPopup
            src={pendingSrc}
            onApply={(dataUrl) => setSelectedAvatar(dataUrl)}
            onClose={closeCropper}
            onPickDifferentFile={handleCropperFile}
          />
        )}

        {/* Tab 2: Curated Presets */}
        {activeTab === 'presets' && (
          <div className="space-y-2">
            <p className="text-xs text-[var(--muted)]">Select an illustrated avatar:</p>
            <div className="grid grid-cols-3 gap-3 max-h-48 overflow-y-auto p-1">
              {AVATAR_PRESETS.map((preset) => {
                const isSelected = selectedAvatar === preset.dataUri;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedAvatar(preset.dataUri)}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/20'
                        : 'border-[var(--border)] hover:bg-[var(--bg-subtle)]'
                    }`}
                  >
                    <MergedAvatar
                      avatarUrl={preset.dataUri}
                      name={preset.name}
                      size="lg"
                      shape="circle"
                    />
                    <span className="text-[11px] font-semibold text-[var(--text)] truncate max-w-full">
                      {preset.name.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: URL input */}
        {activeTab === 'url' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-[var(--muted)] mb-1">
                Image Web Link
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="flex-1 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
                <button
                  type="button"
                  onClick={handleApplyUrl}
                  className="px-3 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-xs font-bold hover:bg-[var(--card)] transition-colors cursor-pointer"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-xs font-semibold text-[var(--text)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-sm cursor-pointer"
          >
            Save Avatar
          </button>
        </div>
      </div>
    </div>
  );
}
