import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

/** App-wide metadata — title and description shown in the browser tab. */
export const metadata: Metadata = {
  title: 'Linguo — Cross Language Translation',
  description: 'Real-time cross-language translation chat app with AI',
};

/** Root layout — wraps every page with the global font and dark theme background. */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-900 text-white min-h-screen`}>{children}</body>
    </html>
  );
}
