"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Icons } from '@/lib/icons';

interface AvatarCropperProps {
  /** Called with the 256px JPEG data URL once the user applies the crop. */
  onApply: (dataUrl: string) => void;
}

/**
 * Shared upload → drag/resize/zoom crop → 256px JPEG picker.
 * Used by the profile avatar modal and the group settings editor.
 */
export function AvatarCropper({ onApply }: AvatarCropperProps) {
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropBox, setCropBox] = useState({ x: 0, y: 0, size: 120 });
  const [zoom, setZoom] = useState(1);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Revoke object URL on unmount
  useEffect(() => {
    return () => {
      if (cropSrc) URL.revokeObjectURL(cropSrc);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPG, PNG, WebP)');
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
        const maxSize = Math.min(rect.width - drag.box.x, rect.height - drag.box.y, 400);
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
    const dispW = rect.width;
    const dispH = rect.width * (nat.h / nat.w);
    const toDispX = (px: number) => (px - rect.width / 2) / zoom + dispW / 2;
    const toDispY = (py: number) => (py - rect.height / 2) / zoom + dispH / 2;
    const kx = nat.w / dispW;
    const ky = nat.h / dispH;
    let sx = toDispX(cropBox.x) * kx;
    let sy = toDispY(cropBox.y) * ky;
    let side = (cropBox.size / zoom) * ((kx + ky) / 2);
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
    setApplying(true);
    setError(null);
    try {
      const dataUrl = renderCrop(256);
      if (!dataUrl) throw new Error('Crop area is empty — drag the box over the photo');
      onApply(dataUrl);
      clearCrop();
    } catch (err: any) {
      setError(err.message || 'Failed to crop image');
    } finally {
      setApplying(false);
    }
  };

  if (!cropSrc) {
    return (
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
        {error && <p className="text-xs text-red-500 font-medium text-center">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-[var(--text)] text-center">
        Drag the square to position • drag the corner to resize
      </p>
      <div ref={containerRef} className="relative w-full overflow-hidden rounded-2xl bg-black/80 select-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={cropImgRef}
          src={cropSrc}
          alt="Crop source"
          onLoad={initCropBox}
          draggable={false}
          className="w-full h-auto pointer-events-none"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
        />
        <div
          className="absolute touch-none cursor-move"
          style={{
            left: cropBox.x,
            top: cropBox.y,
            width: cropBox.size,
            height: cropBox.size,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
            border: '2px solid #fff',
            borderRadius: 8,
          }}
          onPointerDown={(e) => {
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
            dragRef.current = {
              mode: 'move',
              startX: e.clientX,
              startY: e.clientY,
              box: { ...cropBox },
            };
          }}
        >
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 bottom-0 left-1/3 w-px bg-white/50" />
            <div className="absolute top-0 bottom-0 left-2/3 w-px bg-white/50" />
            <div className="absolute left-0 right-0 top-1/3 h-px bg-white/50" />
            <div className="absolute left-0 right-0 top-2/3 h-px bg-white/50" />
          </div>
          <div
            className="absolute -bottom-2 -right-2 w-6 h-6 rounded-md bg-white shadow-md cursor-nwse-resize touch-none flex items-center justify-center"
            onPointerDown={(e) => {
              e.stopPropagation();
              (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
              dragRef.current = {
                mode: 'resize',
                startX: e.clientX,
                startY: e.clientY,
                box: { ...cropBox },
              };
            }}
          >
            <Icons.chevR className="w-4 h-4 text-slate-600 rotate-45" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-[11px] font-bold text-[var(--muted)] flex-none">Zoom</span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="flex-1 accent-blue-600 cursor-pointer"
        />
        <canvas
          ref={previewRef}
          width={56}
          height={56}
          className="w-14 h-14 rounded-full border border-[var(--border)] bg-[var(--bg-subtle)] flex-none"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={clearCrop}
          className="flex-1 py-2 rounded-xl border border-[var(--border)] text-xs font-semibold hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
        >
          Choose different photo
        </button>
        <button
          type="button"
          onClick={handleApplyCrop}
          disabled={applying}
          className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition-colors cursor-pointer"
        >
          {applying ? 'Applying…' : 'Apply crop'}
        </button>
      </div>
      {error && <p className="text-xs text-red-500 font-medium text-center">{error}</p>}
    </div>
  );
}
