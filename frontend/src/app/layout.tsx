import './globals.css';
import type { Metadata } from 'next';
import OfflineSyncProvider from '../providers/OfflineSyncProvider';

export const metadata: Metadata = {
  title: 'Гурвантамир Политехник Коллеж LMS',
  description: 'Архангай аймаг дахь Гурвантамир Политехник Коллежийн Чадамжид суурилсан сургалтын удирдлагын систем (LMS)',
  keywords: ['LMS', 'Mongolia', 'VET', 'TVET', 'Competency-based', 'Polytechnic', 'Архангай', 'Гурвантамир'],
};

export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="mn">
      <head>
        <link rel="icon" href="/favicon.png" sizes="any" />
      </head>
      <body className="min-h-screen bg-brand-neutral-pearl font-sans antialiased text-brand-neutral-text">
        <OfflineSyncProvider>
          {children}
        </OfflineSyncProvider>
      </body>
    </html>
  );
}
