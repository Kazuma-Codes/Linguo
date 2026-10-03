import '@/global.css';

export const Colors = {
  light: {
    primary: '#6C5CE7',
    primaryHover: '#5A49D6',
    primarySoft: 'rgba(108, 92, 231, 0.12)',
    text: '#1C1917',
    background: '#FBF7F0',
    backgroundElement: '#F4EEE3',
    backgroundSelected: '#E7E2D8',
    textSecondary: '#78716C',
    card: '#ffffff',
    border: '#E7E2D8',
    accent: '#6C5CE7',
    // Mirrors web globals.css --chat-* (light)
    chatBg: '#F4F6FC',
    chatCard: '#ffffff',
    bubbleMe: '#6C5CE7',
    bubbleMeText: '#ffffff',
    bubbleOther: '#ffffff',
    bubbleOtherText: '#1C1917',
  },
  dark: {
    primary: '#7C6EF7',
    primaryHover: '#6C5CE7',
    primarySoft: 'rgba(124, 110, 247, 0.15)',
    text: '#F1F3F9',
    background: '#0D0F14',
    backgroundElement: '#141824',
    backgroundSelected: '#1E2330',
    textSecondary: '#8E95A5',
    card: '#141824',
    border: '#1E2330',
    accent: '#7C6EF7',
    // Mirrors web globals.css --chat-* (dark Halo navy)
    chatBg: '#0A0C10',
    chatCard: '#131722',
    bubbleMe: '#6C5CE7',
    bubbleMeText: '#ffffff',
    bubbleOther: '#1A2030',
    bubbleOtherText: '#F1F3F9',
  },
} as const;
