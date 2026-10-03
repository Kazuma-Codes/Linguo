import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

/** App-wide metadata — title and description shown in the browser tab. */
export const metadata: Metadata = {
  metadataBase: new URL('https://mosa1c.vercel.app'),
  title: 'Mosaic — Cross Language Translation',
  description: 'Real-time cross-language translation chat app with AI',
  icons: {
    icon: [
      { url: '/icon.png?v=2', type: 'image/png' },
      { url: '/favicon.ico?v=2' },
    ],
    shortcut: '/icon.png?v=2',
    apple: '/icon.png?v=2',
  },
  verification: {
    google: 'e7yu-GnOKALPszHtrlBONap6-sk9d-s8DDqCpQo6NDI',
  },
};

/** Root layout — wraps every page with the global font and dark theme background. */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen antialiased selection:bg-indigo-500 selection:text-white`}>
        {children}
      </body>
    </html>
  );
}

