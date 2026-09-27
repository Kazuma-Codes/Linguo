"use client";

import React from 'react';

interface MergedAvatarProps {
  name?: string;
  avatarUrl?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  shape?: 'circle' | 'rounded';
  online?: boolean;
  className?: string;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm font-semibold',
  lg: 'w-12 h-12 text-base font-bold',
  xl: 'w-16 h-16 text-xl font-bold',
  '2xl': 'w-24 h-24 text-2xl font-bold',
};

const dotSizeClasses = {
  xs: 'w-1.5 h-1.5 bottom-0 right-0 ring-1',
  sm: 'w-2 h-2 bottom-0 right-0 ring-2',
  md: 'w-2.5 h-2.5 bottom-0.5 right-0.5 ring-2',
  lg: 'w-3 h-3 bottom-0.5 right-0.5 ring-2',
  xl: 'w-4 h-4 bottom-1 right-1 ring-3',
  '2xl': 'w-5 h-5 bottom-1 right-1 ring-4',
};

// Generates consistent deterministic vibrant gradient for initials
function getGradient(name: string = '') {
  const gradients = [
    'from-indigo-500 to-purple-600',
    'from-blue-500 to-cyan-500',
    'from-emerald-500 to-teal-600',
    'from-rose-500 to-pink-600',
    'from-amber-500 to-orange-600',
    'from-violet-600 to-fuchsia-600',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
}

export function MergedAvatar({
  name = '',
  avatarUrl,
  size = 'md',
  shape = 'rounded',
  online,
  className = '',
}: MergedAvatarProps) {
  const initials = (name.trim() || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || 'U';

  const gradient = getGradient(name);
  const roundedClass = shape === 'circle' ? 'rounded-full' : 'rounded-2xl';

  return (
    <div className={`relative inline-block flex-none select-none ${className}`}>
      <div
        className={`${sizeClasses[size]} ${roundedClass} flex items-center justify-center overflow-hidden shadow-xs border border-black/5 dark:border-white/10 ${
          avatarUrl ? 'bg-[var(--bg-subtle)]' : `bg-gradient-to-br ${gradient} text-white`
        }`}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={name}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to initials if image fails
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>

      {online !== undefined && (
        <span
          className={`absolute rounded-full ring-2 ring-[var(--card)] ${dotSizeClasses[size]} ${
            online ? 'bg-emerald-500' : 'bg-zinc-400'
          }`}
          title={online ? 'Online' : 'Offline'}
        />
      )}
    </div>
  );
}
