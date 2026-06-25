"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Calendar,
  CreditCard,
  AlertTriangle,
} from "lucide-react";

const tabs = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Users", href: "/users", icon: Users },
  { label: "Bookings", href: "/bookings", icon: Calendar },
  { label: "Payments", href: "/transactions", icon: CreditCard },
  { label: "Disputes", href: "/disputes", icon: AlertTriangle },
];

export default function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-gray-200 bg-white">
      {tabs.map((tab) => {
        const active = isActive(tab.href);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex-1 flex flex-col items-center justify-center py-2.5 px-1"
          >
            <Icon
              size={22}
              className={active ? "text-red-600" : "text-gray-300"}
              strokeWidth={2}
            />
            <span
              className={`mt-1 text-[11px] ${active ? "text-red-600 font-semibold" : "text-gray-400"}`}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
