"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Icons } from '@/lib/icons';

interface AvatarCropperPopupProps {
  /** Object URL of the picked image. */
  src: string;
  /** Called with the 256px JPEG data URL when the user hits the tick. */
  onApply: (dataUrl: string) => void;
  /** Close without applying. */
  onClose: () => void;
  /** Pick a different photo (re-opens the file picker). */
  onPickDifferent: () => void;
}

const STAGE = 288; // fixed popup stage (px) — big images can never blow up the layout
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

/**
 * WhatsApp-style fixed crop popup: fixed-size window, fixed circular viewport
 * (adjustable diameter), drag-the-image to position, +/- zoom rail, tick to
 * confirm. Exports a 256px JPEG data URL.
 */
export function AvatarCropperPopup({ src, onApply, onClose, onPickDifferent }: AvatarCropperPopupProps) {
  // Image offset (top-left of displayed image relative to stage) + zoom
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  // Circle diameter as a fraction of the stage (user-adjustable crop size)
  const [diameterRatio, setDiameterRatio] = useState(0.85);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [base, setBase] = useState({ w: STAGE, h: STAGE, cover: 1 });

  const imgRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<null | { startX: number; startY: number; ox: number; oy: number }>(null);

  const diameter = Math.round(STAGE * diameterRatio);

  // Fit the image so it covers the stage, then center it
  const initImage = () => {
    const img = imgRef.current;
    if (!img || !img.naturalWidth) return;
    const cover = STAGE / Math.min(img.naturalWidth, img.naturalHeight);
    const w = img.naturalWidth * cover;
    const h = img.naturalHeight * cover;
    setBase({ w, h, cover });
    setOffset({ x: (STAGE - w) / 2, y: (STAGE - h) / 2 });
    setZoom(1);
  };

  const dispW = base.w * zoom;
  const dispH = base.h * zoom;

  // Clamp so the image always covers the whole stage
  const clampOffset = (x: number, y: number) => ({
    x: Math.min(0, Math.max(STAGE - dispW, x)),
    y: Math.min(0, Math.max(STAGE - dispH, y)),
  });

  // Global pointer tracking (touch + mouse)
  useEffect(() => {
    const onMove = (ev: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      setOffset(clampOffset(drag.ox + (ev.clientX - drag.startX), drag.oy + (ev.clientY - drag.startY)));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispW, dispH]);

  // Keep the image covering the stage when zooming
  const changeZoom = (next: number) => {
    const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
    // Zoom around the stage center so the subject stays put
    const cx = STAGE / 2;
    const cy = STAGE / 2;
    const scale = z / zoom;
    const nx = cx - (cx - offset.x) * scale;
    const ny = cy - (cy - offset.y) * scale;
    setZoom(z);
    const w = base.w * z;
    const h = base.h * z;
    setOffset({
      x: Math.min(0, Math.max(STAGE - w, nx)),
      y: Math.min(0, Math.max(STAGE - h, ny)),
    });
  };

  const handleApply = () => {
    const img = imgRef.current;
    if (!img || !img.naturalWidth) return;
    setApplying(true);
    setError(null);
    try {
      const k = img.naturalWidth / dispW; // natural px per displayed px
      const r = diameter / 2;
      const sx = (STAGE / 2 - r - offset.x) * k;
      const sy = (STAGE / 2 - r - offset.y) * k;
      const side = diameter * k;
      if (side < 4) throw new Error('Crop area is empty');

      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not process image');
      ctx.drawImage(img, sx, sy, side, side, 0, 0, 256, 256);
      onApply(canvas.toDataURL('image/jpeg', 0.85));
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to crop image');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header: X | title | pick different */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] flex-none">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
            title="Cancel"
          >
            <Icons.x className="w-5 h-5" />
          </button>
          <span className="text-sm font-bold text-[var(--text)]">Drag the image to adjust</span>
          <button
            type="button"
            onClick={onPickDifferent}
            className="flex items-center gap-1 text-xs font-bold text-[var(--primary)] hover:opacity-80 transition-opacity cursor-pointer"
            title="Choose a different photo"
          >
            <Icons.upload className="w-4 h-4" />
            <span className="hidden sm:inline">Upload</span>
          </button>
        </div>

        {/* Fixed-size stage with circular viewport */}
        <div className="p-4 flex-none">
          <div
            className="relative mx-auto overflow-hidden rounded-2xl bg-black select-none touch-none cursor-move"
            style={{ width: STAGE, maxWidth: '100%', height: STAGE }}
            onPointerDown={(e) => {
              (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
              dragRef.current = { startX: e.clientX, startY: e.clientY, ox: offset.x, oy: offset.y };
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={src}
              alt="Crop source"
              onLoad={initImage}
              draggable={false}
              className="absolute pointer-events-none"
              style={{ left: offset.x, top: offset.y, width: dispW, height: dispH, maxWidth: 'none' }}
            />
            {/* Dimmed mask with circular hole = the avatar preview */}
            <div
              className="absolute rounded-full pointer-events-none"
              style={{
                left: (STAGE - diameter) / 2,
                top: (STAGE - diameter) / 2,
                width: diameter,
                height: diameter,
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.65)',
                border: '2px solid rgba(255,255,255,0.9)',
              }}
            />
            {/* Zoom rail */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col rounded-full bg-black/60 overflow-hidden">
              <button
                type="button"
                onClick={() => changeZoom(zoom + 0.25)}
                className="p-2 text-white hover:bg-white/20 transition-colors cursor-pointer"
                title="Zoom in"
              >
                <Icons.plus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => changeZoom(zoom - 0.25)}
                className="p-2 text-white hover:bg-white/20 transition-colors cursor-pointer"
                title="Zoom out"
              >
                <span className="block w-4 h-4 text-center leading-4 font-bold">−</span>
              </button>
            </div>
          </div>

          {/* Circle size */}
          <div className="flex items-center gap-3 mt-3">
            <span className="text-[11px] font-bold text-[var(--muted)] flex-none">Crop size</span>
            <input
              type="range"
              min={0.4}
              max={1}
              step={0.01}
              value={diameterRatio}
              onChange={(e) => setDiameterRatio(Number(e.target.value))}
              className="flex-1 accent-blue-600 cursor-pointer"
            />
          </div>
          {error && <p className="text-xs text-red-500 font-medium text-center mt-2">{error}</p>}
        </div>

        {/* Footer: cancel + tick */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)] flex-none">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[var(--border)] text-xs font-semibold hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={applying}
            className="w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white shadow-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center"
            title="Apply crop"
          >
            <Icons.check className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
