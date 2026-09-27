"use client";

import React, { useState } from 'react';
import { Icons } from '@/lib/icons';
import { MergedAvatar } from '@/components/common/MergedAvatar';
import { AvatarCropper } from '@/components/common/AvatarCropper';
import { AVATAR_PRESETS } from '@/lib/avatarPresets';

interface EditAvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatarUrl?: string;
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
  const [activeTab, setActiveTab] = useState<'upload' | 'presets' | 'url'>('upload');
  const [selectedAvatar, setSelectedAvatar] = useState<string>(currentAvatarUrl);
  const [urlInput, setUrlInput] = useState<string>(currentAvatarUrl.startsWith('http') ? currentAvatarUrl : '');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // --- Interactive crop state ---
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropBox, setCropBox] = useState({ x: 0, y: 0, size: 120 });
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cropImgRef = useRef<HTMLImageElement | null>(null);
  const naturalRef = useRef({ w: 0, h: 0 });
  const dragRef = useRef<null | {
    mode: 'move' | 'resize';
    startX: number;
    startY: number;
    box: { x: number; y: number; size: number };
  }>(null);
  const previewRef = useRef<HTMLCanvasElement | null>(null);

  const clearCrop = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    setZoom(1);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Revoke object URL on unmount
  useEffect(() => {
    return () => {
      if (cropSrc) URL.revokeObjectURL(cropSrc);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    if (!file.type.startsWith('image/')) {
      setUploadError('Please upload an image file (JPG, PNG, WebP)');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(URL.createObjectURL(file));
    setZoom(1);
  };

  const initCropBox = () => {
    const el = containerRef.current;
    const img = cropImgRef.current;
    if (!el || !img || !img.naturalWidth) return;
    naturalRef.current = { w: img.naturalWidth, h: img.naturalHeight };
    const rect = el.getBoundingClientRect();
    const size = Math.max(60, Math.min(rect.width, rect.height) * 0.8);
    setCropBox({ x: (rect.width - size) / 2, y: (rect.height - size) / 2, size });
  };

  // Global pointer tracking for drag-move / drag-resize (works for touch too)
  useEffect(() => {
    const onMove = (ev: PointerEvent) => {
      const drag = dragRef.current;
      const el = containerRef.current;
      if (!drag || !el) return;
      const rect = el.getBoundingClientRect();
      const dx = ev.clientX - drag.startX;
      const dy = ev.clientY - drag.startY;
      if (drag.mode === 'move') {
        const maxX = Math.max(0, rect.width - drag.box.size);
        const maxY = Math.max(0, rect.height - drag.box.size);
        setCropBox({
          ...drag.box,
          x: Math.min(maxX, Math.max(0, drag.box.x + dx)),
          y: Math.min(maxY, Math.max(0, drag.box.y + dy)),
        });
      } else {
        const maxSize = Math.min(
          rect.width - drag.box.x,
          rect.height - drag.box.y,
          400,
        );
        const size = Math.min(Math.max(48, drag.box.size + Math.max(dx, dy)), Math.max(48, maxSize));
        setCropBox({ ...drag.box, size });
      }
    };
    const onUp = () => {
      dragRef.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, []);

  /** Maps the crop box (container px) back to natural image px and exports 256px JPEG. */
  const renderCrop = (outSize = 256): string | null => {
    const el = containerRef.current;
    const img = cropImgRef.current;
    const nat = naturalRef.current;
    if (!el || !img || !nat.w) return null;
    const rect = el.getBoundingClientRect();
    // Unscaled displayed size (img is w-full, height auto)
    const dispW = rect.width;
    const dispH = rect.width * (nat.h / nat.w);
    // Container point -> unscaled displayed point (zoom is centered)
    const toDispX = (px: number) => (px - rect.width / 2) / zoom + dispW / 2;
    const toDispY = (py: number) => (py - rect.height / 2) / zoom + dispH / 2;
    const kx = nat.w / dispW;
    const ky = nat.h / dispH;
    let sx = toDispX(cropBox.x) * kx;
    let sy = toDispY(cropBox.y) * ky;
    let side = (cropBox.size / zoom) * ((kx + ky) / 2);
    // Clamp to image bounds, keep square
    sx = Math.min(Math.max(0, sx), nat.w - 1);
    sy = Math.min(Math.max(0, sy), nat.h - 1);
    side = Math.min(side, nat.w - sx, nat.h - sy);
    if (side < 4) return null;

    const canvas = document.createElement('canvas');
    canvas.width = outSize;
    canvas.height = outSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, sx, sy, side, side, 0, 0, outSize, outSize);
    return canvas.toDataURL('image/jpeg', 0.85);
  };

  // Live circle preview of the current crop
  useEffect(() => {
    const preview = previewRef.current;
    const img = cropImgRef.current;
    const nat = naturalRef.current;
    if (!preview || !img || !nat.w || !cropSrc) return;
    const dataUrl = renderCrop(192);
    if (!dataUrl) return;
    const pctx = preview.getContext('2d');
    const pimg = new Image();
    pimg.onload = () => {
      pctx?.clearRect(0, 0, preview.width, preview.height);
      pctx?.drawImage(pimg, 0, 0, preview.width, preview.height);
    };
    pimg.src = dataUrl;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cropBox, zoom, cropSrc]);

  const handleApplyCrop = () => {
    setUploadLoading(true);
    setUploadError(null);
    try {
      const dataUrl = renderCrop(256);
      if (!dataUrl) throw new Error('Crop area is empty — drag the box over the photo');
      setSelectedAvatar(dataUrl);
      clearCrop();
    } catch (err: any) {
      setUploadError(err.message || 'Failed to crop image');
    } finally {
      setUploadLoading(false);
    }
  };

  if (!isOpen) return null;

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

        {/* Tab 1: Upload + crop (shared component, also used for group avatars) */}
        {activeTab === 'upload' && (
          <AvatarCropper onApply={(dataUrl) => setSelectedAvatar(dataUrl)} />
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
