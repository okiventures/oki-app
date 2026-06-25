import type { ReactNode } from 'react';
import './globals.css';
import BottomNav from './components/BottomNav';

export default function AdminLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <div className="flex h-screen flex-col">
          <main className="flex-1 overflow-y-auto pb-16">
            <div className="mx-auto max-w-6xl px-6 py-6">{children}</div>
          </main>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
