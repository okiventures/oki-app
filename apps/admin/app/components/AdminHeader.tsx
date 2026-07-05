'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { LogOut } from 'lucide-react';

const pageTitles: Record<string, string> = {
  '/': 'Admin Panel',
  '/users': 'User Management',
  '/bookings': 'Bookings',
  '/transactions': 'Transactions',
  '/disputes': 'Disputes',
};

export default function AdminHeader() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const title = pageTitles[pathname] ?? 'Admin Panel';

  return (
    <div className="flex flex-row items-center justify-between border-b border-gray-200 bg-white px-4 pt-4 pb-4">
      <div className="w-[30px]" />
      <h1 className="flex-1 text-center text-[17px] font-bold text-gray-900">{title}</h1>
      {user ? (
        <button
          onClick={logout}
          className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-gray-100"
          title="Sign out">
          <LogOut size={14} className="text-gray-600" />
        </button>
      ) : (
        <div className="w-[30px]" />
      )}
    </div>
  );
}
