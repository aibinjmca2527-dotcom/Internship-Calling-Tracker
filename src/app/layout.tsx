import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Infopark Internship Calling Tracker',
  description: 'Private outreach workspace for Infopark Kochi Phase 1 companies',
  applicationName: 'Infopark Tracker',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Calling Tracker',
  },
  formatDetection: {
    telephone: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#2563eb',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 antialiased selection:bg-blue-100 selection:text-blue-900 pb-[env(safe-area-inset-bottom)]">
        {children}
      </body>
    </html>
  );
}
