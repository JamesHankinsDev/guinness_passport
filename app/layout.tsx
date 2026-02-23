import type { Metadata, Viewport } from 'next';
import { Playfair_Display, Libre_Baskerville, DM_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from 'react-hot-toast';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const libreBaskerville = Libre_Baskerville({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-body',
  display: 'swap',
});

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
};

export const metadata: Metadata = {
  title: 'Guinness Passport — Your Pint Diary',
  description: "Track every perfect pint. Your personal Guinness drinker's diary.",
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Guinness Passport',
  },
  openGraph: {
    title: 'Guinness Passport',
    description: 'Track every perfect pint.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${libreBaskerville.variable} ${dmMono.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="bg-black text-cream font-body antialiased">
        <AuthProvider>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#1a1a1a',
                color: '#f5f0e8',
                border: '1px solid rgba(201,168,76,0.2)',
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
              },
              success: {
                iconTheme: { primary: '#c9a84c', secondary: '#0a0a0a' },
              },
              error: {
                iconTheme: { primary: '#8b0000', secondary: '#f5f0e8' },
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
