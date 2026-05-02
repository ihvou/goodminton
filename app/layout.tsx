import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/header';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'https://goodminton.vercel.app');
const description =
  'Track Goodminton club badminton matches, scores, player ratings, and team standings.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Goodminton',
  description,
  applicationName: 'Goodminton',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Goodminton',
    description,
    url: '/',
    siteName: 'Goodminton',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Goodminton',
    description,
  },
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-dvh bg-white text-neutral-950 antialiased">
        <Header />
        <main className="mx-auto max-w-screen-md px-4 pb-24">{children}</main>
      </body>
    </html>
  );
}
