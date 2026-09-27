import React from 'react';
import { Image, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const SIZES: Record<Size, number> = { xs: 24, sm: 32, md: 40, lg: 48, xl: 64, '2xl': 96 };
const FONT: Record<Size, number> = { xs: 10, sm: 12, md: 14, lg: 16, xl: 22, '2xl': 32 };
const GRADIENTS = ['#6366f1', '#0ea5e9', '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6'];

function gradientFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

function initialsOf(name: string): string {
  const parts = (name.trim() || 'U').split(' ').filter(Boolean).slice(0, 2);
  return parts.map((p) => p[0]!.toUpperCase()).join('') || 'U';
}

export function MergedAvatar({
  name = '',
  avatarUrl,
  size = 'md',
  online,
}: {
  name?: string;
  avatarUrl?: string;
  size?: Size;
  shape?: 'circle' | 'rounded';
  online?: boolean;
}) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const C = Colors[scheme];
  const px = SIZES[size];
  const bg = gradientFor(name || 'U');
  const dot = size === 'xs' ? 8 : size === 'sm' ? 10 : size === 'md' ? 11 : size === 'lg' ? 12 : 14;

  return (
    <View style={{ width: px, height: px }}>
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={{ width: px, height: px, borderRadius: px / 2, backgroundColor: C.backgroundElement }} />
      ) : (
        <View style={[styles.fallback, { width: px, height: px, borderRadius: px / 2, backgroundColor: bg }]}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: FONT[size] }}>{initialsOf(name)}</Text>
        </View>
      )}
      {online !== undefined && (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: dot,
            height: dot,
            borderRadius: dot / 2,
            backgroundColor: online ? '#10b981' : '#a1a1aa',
            borderWidth: 2,
            borderColor: C.card,
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
});
